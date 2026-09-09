-- Pedido que ficou esperando pagamento (checkout abandonado, Pix não pago,
-- falha ao gerar a cobrança) não pode virar beco sem saída: o cliente
-- precisa conseguir cancelar mesmo antes de um profissional aceitar.
-- Nunca teve taxa de cancelamento aqui — a taxa só existe pra quem já tinha
-- profissional confirmado ('assigned'), e pending_payment nunca chega lá.
create or replace function fn_cancelar_pedido(p_order_id uuid, p_motivo text default null)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order orders%rowtype;
  v_taxa  integer := 0;
begin
  select * into v_order from orders
   where id = p_order_id
     and customer_id = auth.uid()
     and status in ('pending_payment', 'searching_professional', 'assigned');

  if not found then
    return false;
  end if;

  if v_order.scheduled_at - now() < interval '24 hours' and v_order.status = 'assigned' then
    v_taxa := round(v_order.price_cents * 0.20);
  end if;

  update orders
     set status = 'cancelled_by_customer',
         cancellation_fee_cents = v_taxa,
         cancellation_reason = nullif(btrim(coalesce(p_motivo, '')), '')
   where id = p_order_id;

  update order_offers set status = 'expired', responded_at = now()
   where order_id = p_order_id and status = 'sent';

  return true;
end $function$;

revoke execute on function fn_cancelar_pedido(uuid, text) from public, anon;
grant execute on function fn_cancelar_pedido(uuid, text) to authenticated;
