-- =====================================================================
-- Geração das próximas diárias de uma assinatura. O preço não pode ser
-- calculado aqui dentro (o motor de preço é TypeScript) — essas funções
-- só listam o que está devendo gerar e registram o pedido já com o
-- preço que o servidor calculou. Chamadas por /api/assinaturas/gerar.
-- =====================================================================

create or replace function fn_assinaturas_para_gerar(p_dias_a_frente int default 3)
returns table (
  subscription_id uuid,
  customer_id     uuid,
  address_id      uuid,
  service         service_code,
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
          and (o.scheduled_at at time zone 'America/Sao_Paulo')::date = s.next_run_date
     );
$$;

revoke all on function fn_assinaturas_para_gerar(int) from public;
grant execute on function fn_assinaturas_para_gerar(int) to anon, authenticated;

create or replace function fn_registrar_pedido_assinatura(
  p_subscription_id uuid, p_price_cents integer, p_payout_cents integer
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_sub   subscriptions%rowtype;
  v_order uuid;
  v_step  integer;
begin
  select * into v_sub from subscriptions where id = p_subscription_id and status = 'active';
  if not found then
    return null;
  end if;

  insert into orders (customer_id, address_id, subscription_id, service, frequency,
                      minutes, addons, scheduled_at, status, price_cents, payout_cents)
  values (v_sub.customer_id, v_sub.address_id, v_sub.id, v_sub.service, v_sub.frequency,
          v_sub.minutes, v_sub.addons,
          (v_sub.next_run_date + v_sub.window_start) at time zone 'America/Sao_Paulo',
          'searching_professional', p_price_cents, p_payout_cents)
  returning id into v_order;

  v_step := case v_sub.frequency when 'WEEKLY' then 7 when 'BIWEEKLY' then 14 else 30 end;
  update subscriptions set next_run_date = v_sub.next_run_date + v_step where id = v_sub.id;

  perform fn_gerar_ofertas(v_order);

  return v_order;
end $$;

revoke all on function fn_registrar_pedido_assinatura(uuid, integer, integer) from public;
grant execute on function fn_registrar_pedido_assinatura(uuid, integer, integer) to anon, authenticated;
