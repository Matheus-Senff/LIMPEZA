-- Confirmação de pagamento (Stripe): a única porta pela qual um pedido sai de
-- 'pending_payment'. Só o service_role pode chamar — nunca o cliente logado,
-- senão qualquer um se auto-confirmaria sem pagar de verdade. Quem chama de
-- verdade é o webhook do Stripe, depois de verificar a assinatura do evento.

-- Evita processar o mesmo evento duas vezes se a Stripe reenviar o webhook
-- (ela reenvia por padrão até receber 200).
create unique index if not exists payments_gateway_reference_idx
  on payments (gateway, gateway_reference)
  where gateway_reference is not null;

create or replace function fn_confirmar_pagamento_pedido(
  p_order_id uuid,
  p_method text,
  p_amount_cents integer,
  p_provider_reference text,
  p_raw_payload jsonb default null
) returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Idempotente por natureza: se o pedido não está mais esperando
  -- pagamento (já confirmado antes, ou cancelado nesse meio tempo), não
  -- refaz nada e devolve false — webhook duplicado não causa efeito duplo.
  if not exists (select 1 from orders where id = p_order_id and status = 'pending_payment') then
    return false;
  end if;

  insert into payments (order_id, method, status, amount_cents, gateway, gateway_reference, captured_at, raw_payload)
  values (p_order_id, p_method::payment_method, 'paid', p_amount_cents, 'stripe', p_provider_reference, now(), p_raw_payload)
  on conflict (gateway, gateway_reference) where gateway_reference is not null do nothing;

  update orders set status = 'searching_professional' where id = p_order_id;

  -- Só agora, com o pagamento confirmado, o pedido vira visível pros
  -- profissionais da região.
  perform fn_gerar_ofertas(p_order_id);

  return true;
end $function$;

revoke all on function fn_confirmar_pagamento_pedido(uuid, text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function fn_confirmar_pagamento_pedido(uuid, text, integer, text, jsonb) to service_role;
