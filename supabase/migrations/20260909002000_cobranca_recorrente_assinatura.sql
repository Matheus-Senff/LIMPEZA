-- Pendência antiga (docs/06-pendencias.md): só a primeira diária de uma
-- assinatura era cobrada; as seguintes (geradas pelo cron) nasciam direto
-- em 'searching_professional', sem cobrança nenhuma. Agora toda diária
-- nova nasce 'pending_payment' e a API tenta cobrar automaticamente com o
-- cartão salvo na primeira cobrança (Stripe Customer + PaymentMethod
-- salvos no webhook) antes de liberar pra busca de profissional. Sem
-- cartão salvo (só pagou de Pix antes) ou cobrança recusada, o pedido
-- fica aguardando pagamento — o cliente usa "Pagar novamente" (já
-- existente) pra fechar na mão.

alter table customers add column if not exists stripe_customer_id text;
alter table customers add column if not exists stripe_payment_method_id text;

-- Substitui a versão de 3 argumentos por uma de 4 (Postgres trata
-- assinaturas diferentes como funções distintas — sem isso ficariam as
-- duas, uma órfã).
drop function if exists fn_registrar_pedido_assinatura(uuid, integer, integer);

-- fn_registrar_pedido_assinatura passa a receber o status inicial de fora
-- (a API decide: 'pending_payment' com Stripe configurada, senão o
-- comportamento simulado antigo de nascer direto buscando profissional) e
-- só dispara o broadcast de ofertas quando já nasce achável.
create or replace function fn_registrar_pedido_assinatura(
  p_subscription_id uuid, p_price_cents integer, p_payout_cents integer, p_status text default 'pending_payment'
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
  if p_status not in ('pending_payment', 'searching_professional') then
    raise exception 'status inicial inválido para pedido de assinatura: %', p_status;
  end if;

  insert into orders (customer_id, address_id, subscription_id, service, frequency,
                      minutes, addons, scheduled_at, status, price_cents, payout_cents)
  values (v_sub.customer_id, v_sub.address_id, v_sub.id, v_sub.service, v_sub.frequency,
          v_sub.minutes, v_sub.addons,
          (v_sub.next_run_date + v_sub.window_start) at time zone 'America/Sao_Paulo',
          p_status, p_price_cents, p_payout_cents)
  returning id into v_order;

  v_step := case v_sub.frequency when 'WEEKLY' then 7 when 'BIWEEKLY' then 14 else 30 end;
  update subscriptions set next_run_date = v_sub.next_run_date + v_step where id = v_sub.id;

  if p_status = 'searching_professional' then
    perform fn_gerar_ofertas(v_order);
  end if;

  return v_order;
end $$;

revoke all on function fn_registrar_pedido_assinatura(uuid, integer, integer, text) from public;
grant execute on function fn_registrar_pedido_assinatura(uuid, integer, integer, text) to service_role;
