-- =====================================================================
-- RLS + funções de negócio
-- Princípio: o cliente enxerga o que é dele; o profissional só enxerga o
-- pedido que ele aceitou (e o endereço só depois do aceite); admin vê tudo.
-- =====================================================================

-- ------------------------------------------------------------- helpers
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() = 'admin', false);
$$;

-- Cobertura: o CEP está atendido para este serviço?
create or replace function fn_is_covered(p_zipcode text, p_service service_code)
returns table (covered boolean, region_code text, city text, state char(2))
language sql stable set search_path = public as $$
  with z as (select regexp_replace(p_zipcode, '\D', '', 'g') as zip)
  select true, c.region_code, c.city, c.state
    from coverage_areas c, z
   where c.active
     and z.zip between c.zip_start and c.zip_end
     and p_service = any (c.services)
   limit 1;
$$;

-- Ranking de profissionais elegíveis para um pedido.
-- Ordem: preferencial da assinatura > nota > proximidade > menos ocupado.
create or replace function fn_eligible_professionals(p_order_id uuid, p_limit int default 20)
returns table (professional_id uuid, score numeric)
language sql stable set search_path = public as $$
  with o as (
    select ord.*, a.lat, a.lng, s.preferred_professional_id
      from orders ord
      join addresses a on a.id = ord.address_id
      left join subscriptions s on s.id = ord.subscription_id
     where ord.id = p_order_id
  )
  select p.id,
         round((
             (case when p.id = o.preferred_professional_id then 100 else 0 end)
           + (p.rating_avg * 10)
           - coalesce(
               sqrt(power((p.base_lat - o.lat) * 111, 2)
                  + power((p.base_lng - o.lng) * 111 * cos(radians(o.lat)), 2)), 999)
         )::numeric, 3) as score
    from professionals p, o
   where p.accreditation_status = 'approved'
     and p.insurance_active
     and p.rating_avg >= 4.60
     and o.service = any (p.skills)
     and not exists (
       select 1 from orders b
        where b.professional_id = p.id
          and b.status in ('assigned', 'in_progress')
          and tstzrange(b.scheduled_at, b.scheduled_at + make_interval(mins => b.minutes))
              && tstzrange(o.scheduled_at, o.scheduled_at + make_interval(mins => o.minutes))
     )
     and not exists (
       select 1 from professional_blocks pb
        where pb.professional_id = p.id
          and tstzrange(pb.starts_at, pb.ends_at) @> o.scheduled_at
     )
   order by score desc
   limit p_limit;
$$;

-- Gera as próximas ocorrências de uma assinatura (rodar por cron diário)
create or replace function fn_generate_subscription_orders(p_weeks_ahead int default 8)
returns integer
language plpgsql set search_path = public as $$
declare
  v_created int := 0;
  s record;
  v_date date;
  v_step int;
begin
  for s in select * from subscriptions where status = 'active' loop
    v_step := case s.frequency when 'WEEKLY' then 7 when 'BIWEEKLY' then 14 else 30 end;
    v_date := coalesce(s.next_run_date, s.start_date);

    while v_date <= current_date + (p_weeks_ahead * 7) loop
      if not exists (
        select 1 from orders o
         where o.subscription_id = s.id
           and (o.scheduled_at at time zone 'America/Sao_Paulo')::date = v_date
      ) then
        insert into orders (customer_id, address_id, subscription_id, service, frequency,
                            minutes, addons, scheduled_at, status, price_cents, payout_cents)
        select s.customer_id, s.address_id, s.id, s.service, s.frequency,
               s.minutes, s.addons,
               (v_date + s.window_start) at time zone 'America/Sao_Paulo',
               'searching_professional', 0, 0;   -- preço recalculado pelo motor antes de publicar
        v_created := v_created + 1;
      end if;
      v_date := v_date + v_step;
    end loop;

    update subscriptions set next_run_date = v_date where id = s.id;
  end loop;
  return v_created;
end $$;

-- ----------------------------------------------------------------- RLS
alter table profiles                  enable row level security;
alter table customers                 enable row level security;
alter table professionals             enable row level security;
alter table professional_documents    enable row level security;
alter table addresses                 enable row level security;
alter table subscriptions             enable row level security;
alter table orders                    enable row level security;
alter table order_offers              enable row level security;
alter table payments                  enable row level security;
alter table professional_earnings     enable row level security;
alter table reviews                   enable row level security;
alter table chat_threads              enable row level security;
alter table chat_messages             enable row level security;
alter table assistance_requests       enable row level security;
alter table quotes                    enable row level security;
alter table leads                     enable row level security;
alter table pricing_rulesets          enable row level security;
alter table coverage_areas            enable row level security;
alter table services                  enable row level security;
alter table service_addons            enable row level security;
alter table coupons                   enable row level security;
alter table payout_batches            enable row level security;
alter table professional_availability enable row level security;
alter table professional_blocks       enable row level security;
alter table audit_events              enable row level security;

-- catálogo e cobertura: leitura pública, escrita só admin
create policy catalogo_leitura on services         for select to anon, authenticated using (true);
create policy addons_leitura   on service_addons   for select to anon, authenticated using (true);
create policy cobertura_leitura on coverage_areas  for select to anon, authenticated using (true);
create policy catalogo_admin   on services         for all to authenticated using (is_admin()) with check (is_admin());
create policy addons_admin     on service_addons   for all to authenticated using (is_admin()) with check (is_admin());
create policy cobertura_admin  on coverage_areas   for all to authenticated using (is_admin()) with check (is_admin());

create policy cupom_admin     on coupons        for all to authenticated using (is_admin()) with check (is_admin());
create policy auditoria_admin on audit_events   for select to authenticated using (is_admin());
create policy lote_admin      on payout_batches for all to authenticated using (is_admin()) with check (is_admin());

-- preço: ninguém lê regra crua pelo client; só o service_role (Edge Function)
create policy ruleset_admin on pricing_rulesets for all to authenticated using (is_admin()) with check (is_admin());

-- perfil
create policy perfil_proprio on profiles
  for select to authenticated using (id = auth.uid() or is_admin());
create policy perfil_update on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy perfil_insert on profiles
  for insert to authenticated with check (id = auth.uid());

-- cliente
create policy cliente_proprio on customers
  for all to authenticated using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

-- profissional: perfil público reduzido é servido por view; a linha crua é do dono
create policy prof_proprio on professionals
  for all to authenticated using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());
create policy prof_disponibilidade on professional_availability for all to authenticated
  using (professional_id = auth.uid() or is_admin())
  with check (professional_id = auth.uid() or is_admin());
create policy prof_bloqueios on professional_blocks for all to authenticated
  using (professional_id = auth.uid() or is_admin())
  with check (professional_id = auth.uid() or is_admin());
create policy prof_docs on professional_documents
  for all to authenticated using (professional_id = auth.uid() or is_admin())
  with check (professional_id = auth.uid() or is_admin());

-- endereço: do cliente; o profissional só vê depois de o pedido ser atribuído a ele
create policy endereco_cliente on addresses
  for all to authenticated using (customer_id = auth.uid() or is_admin())
  with check (customer_id = auth.uid() or is_admin());
create policy endereco_profissional on addresses
  for select to authenticated using (exists (
    select 1 from orders o
     where o.address_id = addresses.id
       and o.professional_id = auth.uid()
       and o.status in ('assigned', 'in_progress', 'completed', 'rated')
  ));

-- pedidos
create policy pedido_cliente on orders
  for all to authenticated using (customer_id = auth.uid() or is_admin())
  with check (customer_id = auth.uid() or is_admin());
create policy pedido_profissional on orders
  for select to authenticated using (
    professional_id = auth.uid()
    or exists (select 1 from order_offers f
                where f.order_id = orders.id
                  and f.professional_id = auth.uid()
                  and f.status = 'sent')
  );
create policy pedido_prof_update on orders
  for update to authenticated using (professional_id = auth.uid())
  with check (professional_id = auth.uid());

create policy oferta_propria on order_offers
  for all to authenticated using (professional_id = auth.uid() or is_admin())
  with check (professional_id = auth.uid() or is_admin());

-- assinaturas
create policy assinatura_cliente on subscriptions
  for all to authenticated using (customer_id = auth.uid() or is_admin())
  with check (customer_id = auth.uid() or is_admin());

-- pagamentos: leitura do dono do pedido; escrita só service_role (webhook)
create policy pagamento_leitura on payments
  for select to authenticated using (exists (
    select 1 from orders o where o.id = payments.order_id
      and (o.customer_id = auth.uid() or is_admin())));

-- ganhos
create policy ganho_proprio on professional_earnings
  for select to authenticated using (professional_id = auth.uid() or is_admin());

-- avaliações: cliente cria a sua; profissional lê as suas; público lê agregado via view
create policy review_cliente on reviews
  for insert to authenticated with check (customer_id = auth.uid());
create policy review_leitura on reviews
  for select to authenticated using (customer_id = auth.uid() or professional_id = auth.uid() or is_admin());

-- chat: só as duas partes do pedido
create policy chat_thread_partes on chat_threads
  for select to authenticated using (exists (
    select 1 from orders o where o.id = chat_threads.order_id
      and (o.customer_id = auth.uid() or o.professional_id = auth.uid())));
create policy chat_msg_leitura on chat_messages
  for select to authenticated using (exists (
    select 1 from chat_threads t join orders o on o.id = t.order_id
     where t.id = chat_messages.thread_id
       and (o.customer_id = auth.uid() or o.professional_id = auth.uid())));
create policy chat_msg_escrita on chat_messages
  for insert to authenticated with check (sender_id = auth.uid() and exists (
    select 1 from chat_threads t join orders o on o.id = t.order_id
     where t.id = thread_id
       and t.closed_at is null
       and (o.customer_id = auth.uid() or o.professional_id = auth.uid())));

-- assistência
create policy assistencia_cliente on assistance_requests
  for all to authenticated using (customer_id = auth.uid() or is_admin())
  with check (customer_id = auth.uid() or is_admin());

-- cotações e leads: criados pela Edge Function (service_role); cliente lê as suas
create policy cotacao_propria on quotes
  for select to authenticated using (customer_id = auth.uid() or is_admin());
create policy lead_admin on leads for select to authenticated using (is_admin());

-- --------------------------------------------------------------- views
-- Perfil público do profissional (sem documento, sem conta bancária)
create or replace view public_professionals
with (security_invoker = true) as
  select p.id, pr.full_name, pr.avatar_url, p.rating_avg, p.rating_count,
         p.completed_orders, p.skills
    from professionals p
    join profiles pr on pr.id = p.id
   where p.accreditation_status = 'approved';

-- Margem por mês (backoffice)
create or replace view v_margin_monthly
with (security_invoker = true) as
  select date_trunc('month', o.scheduled_at)               as month,
         count(*)                                          as orders,
         sum(o.price_cents)                                as revenue_cents,
         sum(coalesce(e.base_cents, o.payout_cents))       as payout_cents,
         sum(coalesce(e.loyalty_bonus_cents, 0))           as bonus_cents,
         sum(o.price_cents - coalesce(e.total_cents, o.payout_cents)) as net_cents,
         round(100.0 * sum(o.price_cents - coalesce(e.total_cents, o.payout_cents))
                     / nullif(sum(o.price_cents), 0), 2)   as margin_pct
    from orders o
    left join professional_earnings e on e.order_id = o.id
   where o.status in ('completed', 'rated')
   group by 1 order by 1 desc;
