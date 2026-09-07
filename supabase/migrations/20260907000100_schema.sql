-- =====================================================================
-- Plataforma de Serviços Residenciais — esquema base
-- Postgres 15 / Supabase. Valores monetários SEMPRE em centavos (integer).
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------- enums
create type user_role          as enum ('customer', 'professional', 'admin');
create type home_type          as enum ('HOUSE', 'APARTMENT', 'STUDIO', 'COMMERCIAL');
create type service_code       as enum (
  'CLEANING', 'HEAVY_CLEANING', 'PRE_MOVING_CLEANING', 'POST_WORK_CLEANING',
  'BUSINESS_CLEANING', 'IRONING', 'FURNITURE_ASSEMBLY', 'HOME_ASSISTANCE');
create type frequency_type     as enum ('SINGLE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');
create type accreditation      as enum ('pending', 'in_review', 'approved', 'suspended', 'blocked');
create type order_status       as enum (
  'draft', 'pending_payment', 'searching_professional', 'assigned',
  'in_progress', 'completed', 'rated',
  'cancelled_by_customer', 'cancelled_by_professional', 'no_show', 'refunded');
create type payment_method     as enum ('pix', 'credit_card');
create type payment_status     as enum ('pending', 'authorized', 'paid', 'failed', 'refunded', 'chargeback');
create type subscription_status as enum ('active', 'paused', 'cancelled');
create type assistance_level   as enum ('none', 'basic', 'standard', 'complete');
create type offer_status       as enum ('sent', 'accepted', 'declined', 'expired');

-- ------------------------------------------------------------- pessoas
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'customer',
  full_name     text not null,
  email         citext not null unique,
  phone         text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table customers (
  id                uuid primary key references profiles(id) on delete cascade,
  document          text,                       -- CPF/CNPJ
  default_address_id uuid,                      -- FK adiante
  referral_code     text unique default encode(gen_random_bytes(4), 'hex'),
  referred_by       uuid references customers(id),
  credit_cents      integer not null default 0, -- saldo de "Indique e Ganhe"
  created_at        timestamptz not null default now()
);

create table professionals (
  id                       uuid primary key references profiles(id) on delete cascade,
  document                 text unique not null,
  accreditation_status     accreditation not null default 'pending',
  last_background_check    date,
  insurance_active         boolean not null default false,
  rating_avg               numeric(3,2) not null default 5.00
                             check (rating_avg between 1.00 and 5.00),
  rating_count             integer not null default 0,
  completed_orders         integer not null default 0,
  skills                   service_code[] not null default '{}',
  service_radius_km        integer not null default 15,
  base_lat                 double precision,
  base_lng                 double precision,
  bank_account             jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
comment on column professionals.rating_avg is
  'Piso operacional de matching: 4.60. Abaixo disso o profissional sai da fila (ver fn_eligible_professionals).';

create table professional_documents (
  id               uuid primary key default gen_random_uuid(),
  professional_id  uuid not null references professionals(id) on delete cascade,
  kind             text not null,          -- rg, cpf, comprovante_residencia, selfie, antecedentes
  storage_path     text not null,
  verified_at      timestamptz,
  verified_by      uuid references profiles(id),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------- endereços
create table addresses (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references customers(id) on delete cascade,
  label        text,
  zipcode      text not null,
  street       text not null,
  number       text not null,
  complement   text,
  district     text,
  city         text not null,
  state        char(2) not null,
  lat          double precision,
  lng          double precision,
  home_type    home_type not null default 'APARTMENT',
  bedrooms     smallint not null default 2 check (bedrooms between 0 and 20),
  bathrooms    smallint not null default 1 check (bathrooms between 0 and 20),
  access_notes text,               -- portaria, chave, cachorro, etc.
  has_pets     boolean not null default false,
  created_at   timestamptz not null default now()
);
alter table customers
  add constraint customers_default_address_fk
  foreign key (default_address_id) references addresses(id) on delete set null;

-- ------------------------------------------------------------ catálogo
create table services (
  code              service_code primary key,
  name              text not null,
  description       text,
  min_minutes       integer not null,
  suggested_minutes integer not null,
  max_minutes       integer not null default 720,
  brings_products   boolean not null default false,
  min_lead_minutes  integer not null default 120,  -- antecedência mínima
  active            boolean not null default true,
  sort_order        smallint not null default 0
);

create table service_addons (
  code           text primary key,
  name           text not null,
  extra_minutes  integer not null check (extra_minutes > 0),
  services       service_code[] not null,
  active         boolean not null default true,
  sort_order     smallint not null default 0
);

-- ----------------------------------------------------------- cobertura
create table coverage_areas (
  id            uuid primary key default gen_random_uuid(),
  region_code   text not null,             -- 'SP-CAPITAL', 'PR-NORTE', ...
  city          text not null,
  state         char(2) not null,
  zip_start     text not null,             -- faixa inclusiva, 8 dígitos
  zip_end       text not null,
  services      service_code[] not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  check (length(zip_start) = 8 and length(zip_end) = 8)
);
create index coverage_zip_idx on coverage_areas (zip_start, zip_end) where active;

-- --------------------------------------------------------- precificação
-- Um ruleset é uma FOTO IMUTÁVEL das regras. Mudou preço? Cria versão nova.
create table pricing_rulesets (
  id           uuid primary key default gen_random_uuid(),
  version      integer not null,
  region_code  text not null,
  service      service_code not null,
  rules        jsonb not null,   -- ver docs/04-modelo-precificacao.md §7
  active       boolean not null default false,
  published_at timestamptz,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  unique (region_code, service, version)
);
create unique index pricing_active_unique
  on pricing_rulesets (region_code, service) where active;

-- Cotação assinada: o preço mostrado é o preço cobrado.
create table quotes (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid,
  customer_id      uuid references customers(id) on delete set null,
  service          service_code not null,
  frequency        frequency_type not null,
  zipcode          text not null,
  region_code      text not null,
  home_type        home_type not null,
  bedrooms         smallint not null,
  bathrooms        smallint not null,
  addons           text[] not null default '{}',
  minutes          integer not null,
  scheduled_at     timestamptz,
  price_cents      integer not null check (price_cents >= 0),
  payout_cents     integer not null check (payout_cents >= 0),
  breakdown        jsonb not null,
  ruleset_id       uuid not null references pricing_rulesets(id),
  input_hash       text not null,
  expires_at       timestamptz not null default now() + interval '30 minutes',
  consumed_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index quotes_hash_idx on quotes (input_hash, expires_at desc);

-- Lead capturado no passo 1 (e-mail + CEP antes do preço)
create table leads (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null,
  zipcode     text not null,
  service     service_code,
  covered     boolean not null,
  utm         jsonb,
  converted_customer_id uuid references customers(id),
  created_at  timestamptz not null default now()
);
create index leads_email_idx on leads (email, created_at desc);

-- -------------------------------------------------------- assinaturas
create table subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  customer_id               uuid not null references customers(id) on delete restrict,
  address_id                uuid not null references addresses(id) on delete restrict,
  service                   service_code not null,
  frequency                 frequency_type not null check (frequency <> 'SINGLE'),
  preferred_professional_id uuid references professionals(id) on delete set null,
  minutes                   integer not null,
  addons                    text[] not null default '{}',
  weekday                   smallint check (weekday between 0 and 6),
  window_start              time not null,
  assistance_level          assistance_level not null default 'none',
  status                    subscription_status not null default 'active',
  start_date                date not null,
  next_run_date             date,
  cancelled_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
comment on column subscriptions.assistance_level is
  'WEEKLY=complete, BIWEEKLY=basic, MONTHLY=standard, SINGLE=none';

-- ------------------------------------------------------------- pedidos
create table orders (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique default upper(encode(gen_random_bytes(4), 'hex')),
  customer_id       uuid not null references customers(id) on delete restrict,
  professional_id   uuid references professionals(id) on delete set null,
  address_id        uuid not null references addresses(id) on delete restrict,
  subscription_id   uuid references subscriptions(id) on delete set null,
  quote_id          uuid references quotes(id),
  service           service_code not null,
  frequency         frequency_type not null,
  minutes           integer not null,
  addons            text[] not null default '{}',
  scheduled_at      timestamptz not null,
  status            order_status not null default 'draft',
  price_cents       integer not null,
  payout_cents      integer not null,
  discount_cents    integer not null default 0,
  coupon_code       text,
  price_breakdown   jsonb,
  check_in_at       timestamptz,
  check_out_at      timestamptz,
  check_in_geo      point,
  check_out_geo     point,
  cancellation_reason text,
  cancellation_fee_cents integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index orders_customer_idx     on orders (customer_id, scheduled_at desc);
create index orders_professional_idx on orders (professional_id, scheduled_at desc);
create index orders_matching_idx     on orders (status, scheduled_at)
  where status = 'searching_professional';

-- Ofertas enviadas a profissionais (a primeira aceitação vence)
create table order_offers (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  status          offer_status not null default 'sent',
  score           numeric(6,3),      -- ranking do matching
  expires_at      timestamptz not null default now() + interval '10 minutes',
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (order_id, professional_id)
);

create table professional_availability (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday         smallint not null check (weekday between 0 and 6),
  start_time      time not null,
  end_time        time not null,
  check (end_time > start_time)
);

create table professional_blocks (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  reason          text,
  check (ends_at > starts_at)
);

-- ---------------------------------------------------------- financeiro
create table payments (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete restrict,
  method            payment_method not null,
  status            payment_status not null default 'pending',
  amount_cents      integer not null,
  gateway           text not null default 'pagarme',
  gateway_reference text unique,          -- idempotência de webhook
  pix_qr_code       text,
  card_token        text,
  authorized_at     timestamptz,
  captured_at       timestamptz,
  refunded_at       timestamptz,
  raw_payload       jsonb,
  created_at        timestamptz not null default now()
);
comment on table payments is
  'Pix: paid no ato. Cartão: authorized na contratação, captured somente após check-out do profissional.';

create table coupons (
  code        text primary key,
  percent_off numeric(5,2) not null check (percent_off between 0 and 100),
  max_uses    integer,
  uses        integer not null default 0,
  active      boolean not null default true,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table payout_batches (
  id           uuid primary key default gen_random_uuid(),
  reference    text not null unique,
  total_cents  integer not null,
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);

create table professional_earnings (
  id                    uuid primary key default gen_random_uuid(),
  professional_id       uuid not null references professionals(id) on delete restrict,
  order_id              uuid not null unique references orders(id) on delete restrict,
  base_cents            integer not null,
  loyalty_bonus_cents   integer not null default 0,
  adjustments_cents     integer not null default 0,
  total_cents           integer generated always as
                          (base_cents + loyalty_bonus_cents + adjustments_cents) stored,
  available_at          date not null,
  paid                  boolean not null default false,
  payout_batch_id       uuid references payout_batches(id),
  created_at            timestamptz not null default now()
);

-- ------------------------------------------------------------ qualidade
create table reviews (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null unique references orders(id) on delete cascade,
  customer_id      uuid not null references customers(id) on delete cascade,
  professional_id  uuid not null references professionals(id) on delete cascade,
  rating           smallint not null check (rating between 1 and 5),
  comment          text,
  favorited        boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------- chat
create table chat_threads (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null unique references orders(id) on delete cascade,
  closed_at       timestamptz,
  created_at      timestamptz not null default now()
);

create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references chat_threads(id) on delete cascade,
  sender_id   uuid not null references profiles(id) on delete cascade,
  body        text not null,
  redacted    boolean not null default false,  -- telefone/e-mail mascarado
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index chat_messages_thread_idx on chat_messages (thread_id, created_at);

-- ------------------------------------------------- assistência residencial
create table assistance_requests (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references customers(id) on delete restrict,
  subscription_id uuid references subscriptions(id) on delete set null,
  address_id     uuid not null references addresses(id) on delete restrict,
  kind           text not null,             -- chaveiro, eletricista, encanador, vidraceiro
  description    text not null,
  covered        boolean not null default false,
  cost_cents     integer not null default 0,
  status         text not null default 'open'
                   check (status in ('open', 'dispatched', 'completed', 'cancelled')),
  dispatched_at  timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------- auditoria
create table audit_events (
  id          bigserial primary key,
  actor_id    uuid references profiles(id),
  entity      text not null,
  entity_id   uuid,
  action      text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index audit_entity_idx on audit_events (entity, entity_id, created_at desc);

-- ------------------------------------------------------------- triggers
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger t_profiles_updated      before update on profiles      for each row execute function set_updated_at();
create trigger t_professionals_updated before update on professionals for each row execute function set_updated_at();
create trigger t_orders_updated        before update on orders        for each row execute function set_updated_at();
create trigger t_subscriptions_updated before update on subscriptions for each row execute function set_updated_at();

-- Recalcula a nota do profissional a cada avaliação
create or replace function fn_apply_review() returns trigger
language plpgsql as $$
begin
  update professionals p
     set rating_count = p.rating_count + 1,
         rating_avg   = round(((p.rating_avg * p.rating_count) + new.rating)
                              / (p.rating_count + 1)::numeric, 2)
   where p.id = new.professional_id;

  update orders set status = 'rated' where id = new.order_id;
  return new;
end $$;
create trigger t_apply_review after insert on reviews
  for each row execute function fn_apply_review();

-- Check-out gera o ganho do profissional (base + bônus de fidelização)
create or replace function fn_settle_order() returns trigger
language plpgsql as $$
declare
  v_bonus integer := 0;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.subscription_id is not null then
      select case when s.preferred_professional_id = new.professional_id then 1500 else 800 end
        into v_bonus
        from subscriptions s where s.id = new.subscription_id;
    end if;

    insert into professional_earnings
      (professional_id, order_id, base_cents, loyalty_bonus_cents, available_at)
    values
      (new.professional_id, new.id, new.payout_cents, coalesce(v_bonus, 0),
       (new.check_out_at at time zone 'America/Sao_Paulo')::date + 2)
    on conflict (order_id) do nothing;

    update professionals
       set completed_orders = completed_orders + 1
     where id = new.professional_id;
  end if;
  return new;
end $$;
create trigger t_settle_order after update on orders
  for each row execute function fn_settle_order();
