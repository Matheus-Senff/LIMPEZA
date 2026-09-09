-- Até aqui "tipo de serviço" era um enum do Postgres (service_code) — dá
-- pra editar os 8 que existem, mas não dá pra criar um novo nem remover um
-- sem editar o schema à mão (enum não perde valor, e ADD VALUE trava em
-- transação). Pra admin criar/remover serviço pela tela, o código do
-- serviço vira texto validado por referência à tabela `services`
-- (FK nas colunas escalares, trigger nas colunas de array).

-- Views que leem professionals.skills travam o ALTER COLUMN TYPE abaixo
-- (Postgres não deixa mudar o tipo de coluna usada por view). Solta e
-- recria depois, idêntica.
drop view if exists public_professionals;

alter type service_code rename to service_code_old;

-- Essas duas funções têm o enum na própria assinatura (parâmetro ou
-- "returns table"), não só usado por dentro — isso cria uma dependência
-- de catálogo que bloqueia o "drop type" mais abaixo. Precisam cair antes.
drop function if exists fn_is_covered(text, service_code_old);
drop function if exists fn_assinaturas_para_gerar(int);

alter table services            alter column code     type text using code::text;
-- O default '{}'::service_code_old[] também depende do tipo — solta antes
-- de trocar o tipo da coluna e recoloca já em text[].
alter table professionals       alter column skills    drop default;
alter table professionals       alter column skills    type text[] using skills::text[];
alter table professionals       alter column skills    set default '{}'::text[];
alter table service_addons      alter column services  type text[] using services::text[];
alter table coverage_areas      alter column services  type text[] using services::text[];
alter table pricing_rulesets    alter column service   type text using service::text;
alter table quotes              alter column service   type text using service::text;
alter table leads               alter column service    type text using service::text;
alter table subscriptions       alter column service   type text using service::text;
alter table orders              alter column service   type text using service::text;

drop type service_code_old;

-- Colunas escalares: FK direta pra `services`, orfão vira erro na hora.
alter table pricing_rulesets add constraint pricing_rulesets_service_fk
  foreign key (service) references services(code);
alter table quotes add constraint quotes_service_fk
  foreign key (service) references services(code);
alter table subscriptions add constraint subscriptions_service_fk
  foreign key (service) references services(code);
alter table orders add constraint orders_service_fk
  foreign key (service) references services(code);
-- leads.service é opcional e pode registrar um código que nunca existiu
-- (lead de fora do catálogo) — fica sem FK, só sem enum mesmo.

-- Colunas de array: FK não existe pra array no Postgres, então valida por
-- trigger. Só dispara em insert/update das colunas que importam.
create or replace function fn_validar_codigos_servico() returns trigger
language plpgsql as $$
declare
  v_coluna text[];
  v_invalidos text[];
begin
  if tg_table_name = 'professionals' then
    v_coluna := new.skills;
  elsif tg_table_name = 'service_addons' then
    v_coluna := new.services;
  elsif tg_table_name = 'coverage_areas' then
    v_coluna := new.services;
  end if;

  select array_agg(c) into v_invalidos
    from unnest(v_coluna) c
   where not exists (select 1 from services s where s.code = c);

  if v_invalidos is not null then
    raise exception 'código de serviço inválido: %', v_invalidos;
  end if;
  return new;
end $$;

create trigger trg_validar_skills before insert or update of skills on professionals
  for each row execute function fn_validar_codigos_servico();
create trigger trg_validar_addon_services before insert or update of services on service_addons
  for each row execute function fn_validar_codigos_servico();
create trigger trg_validar_cobertura_services before insert or update of services on coverage_areas
  for each row execute function fn_validar_codigos_servico();

-- Recria as funções que citavam o enum, agora com texto puro.
create or replace function fn_is_covered(p_zipcode text, p_service text)
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
revoke execute on function fn_is_covered(text, text) from public;
grant execute on function fn_is_covered(text, text) to anon, authenticated, service_role;

create or replace function fn_assinaturas_para_gerar(p_dias_a_frente int default 3)
returns table (
  subscription_id uuid,
  customer_id     uuid,
  address_id      uuid,
  service         text,
  frequency       frequency_type,
  minutes         integer,
  addons          text[],
  scheduled_at    timestamptz,
  zipcode         text
)
language sql security definer set search_path = public as $$
  select s.id, s.customer_id, s.address_id, s.service, s.frequency, s.minutes, s.addons,
         (s.next_run_date + s.window_start) at time zone 'America/Sao_Paulo',
         a.zipcode
    from subscriptions s
    join addresses a on a.id = s.address_id
   where s.status = 'active'
     and s.next_run_date <= current_date + p_dias_a_frente
     and not exists (
       select 1 from orders o
        where o.subscription_id = s.id
          and o.scheduled_at::date = s.next_run_date
     );
$$;
revoke execute on function fn_assinaturas_para_gerar(int) from public, anon, authenticated;
grant execute on function fn_assinaturas_para_gerar(int) to service_role;

create or replace function fn_gerar_ofertas(p_order_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_service text;
  v_status  order_status;
  v_count   integer;
begin
  select service, status into v_service, v_status from orders where id = p_order_id;
  if v_status is distinct from 'searching_professional' then
    return 0;
  end if;

  insert into order_offers (order_id, professional_id, status)
  select p_order_id, p.id, 'sent'
    from professionals p
   where v_service = any (p.skills)
     and p.accreditation_status = 'approved'
  on conflict (order_id, professional_id) do update
    set status = 'sent', expires_at = now() + interval '10 minutes', responded_at = null
    where order_offers.status in ('declined', 'expired');

  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function fn_registrar_profissional(p_document text, p_skills text[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;
  insert into professionals (id, document, skills, accreditation_status)
  values (auth.uid(), p_document, p_skills, 'pending')
  on conflict (id) do update
    set document = excluded.document, skills = excluded.skills;

  insert into credentialing_chat_threads (professional_id)
  values (auth.uid())
  on conflict (professional_id) do nothing;
end $function$;

create or replace function fn_atualizar_servicos_profissional(p_skills text[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update professionals set skills = p_skills where id = auth.uid();
end $function$;

-- -------------------------------------------- criar/remover serviço (admin)
create or replace function fn_criar_servico(
  p_code text,
  p_name text,
  p_min_minutes int,
  p_suggested_minutes int,
  p_max_minutes int
) returns void
language plpgsql security definer set search_path = public as $function$
begin
  if not is_admin() then
    raise exception 'só admin cria serviço';
  end if;
  if p_code !~ '^[A-Z][A-Z0-9_]*$' then
    raise exception 'código deve ser em MAIÚSCULAS_COM_UNDERSCORE, ex: JARDINAGEM';
  end if;

  insert into services (code, name, min_minutes, suggested_minutes, max_minutes, active, sort_order)
  values (p_code, p_name, p_min_minutes, p_suggested_minutes, p_max_minutes, true,
          (select coalesce(max(sort_order), 0) + 1 from services));

  -- Cria um ruleset inicial pra cada região que já tem preço de algum
  -- serviço, copiando o ruleset padrão embutido no app (o mesmo piso usado
  -- quando o Supabase está fora do ar) — a admin ajusta o preço depois em
  -- Preços, mas o serviço já nasce cotável em toda região atendida.
  insert into pricing_rulesets (version, region_code, service, rules, active)
  select 1, r.region_code, p_code, r.rules, true
    from (
      -- prefere o ruleset de CLEANING como molde (é o serviço-base); se a
      -- região não tiver CLEANING por algum motivo, usa o mais recente
      -- que tiver, de qualquer serviço.
      select distinct on (region_code) region_code, rules
        from pricing_rulesets
       order by region_code, (service = 'CLEANING') desc, created_at desc
    ) r;
end $function$;

grant execute on function fn_criar_servico(text, text, int, int, int) to authenticated;
revoke execute on function fn_criar_servico(text, text, int, int, int) from public, anon;

-- Remoção é bloqueada se o código já foi usado em algum pedido/cotação/
-- assinatura de verdade — só apaga serviço que nunca saiu do papel.
-- Um serviço usado deve ser desativado (active = false), não removido.
create or replace function fn_remover_servico(p_code text)
returns void
language plpgsql security definer set search_path = public as $function$
begin
  if not is_admin() then
    raise exception 'só admin remove serviço';
  end if;
  if exists (select 1 from orders where service = p_code)
     or exists (select 1 from quotes where service = p_code)
     or exists (select 1 from subscriptions where service = p_code)
     or exists (select 1 from leads where service = p_code) then
    raise exception 'serviço já foi usado em pedido/cotação/assinatura — desative em vez de remover';
  end if;

  update professionals set skills = array_remove(skills, p_code) where p_code = any (skills);
  update service_addons set services = array_remove(services, p_code) where p_code = any (services);
  update coverage_areas set services = array_remove(services, p_code) where p_code = any (services);
  delete from pricing_rulesets where service = p_code;
  delete from services where code = p_code;
end $function$;

grant execute on function fn_remover_servico(text) to authenticated;
revoke execute on function fn_remover_servico(text) from public, anon;

create or replace view public_professionals
with (security_invoker = true) as
  select p.id, pr.full_name, pr.avatar_url, p.rating_avg, p.rating_count,
         p.completed_orders, p.skills
    from professionals p
    join profiles pr on pr.id = p.id
   where p.accreditation_status = 'approved';
