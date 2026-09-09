-- Cancelamento com justificativa, dos dois lados.
--
-- O cliente já podia cancelar, mas o motivo nunca era gravado; o
-- profissional não tinha como cancelar de jeito nenhum (só sumia do
-- serviço). Agora os dois cancelam por RPC e o motivo fica registrado em
-- orders.cancellation_reason, que é o que as telas mostram no lugar do chat.

drop function if exists fn_cancelar_pedido(uuid);

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
     and status in ('searching_professional', 'assigned');

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

grant execute on function fn_cancelar_pedido(uuid, text) to authenticated;

create or replace function fn_cancelar_pedido_profissional(p_order_id uuid, p_motivo text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders
   where id = p_order_id
     and professional_id = auth.uid()
     and status in ('assigned', 'in_progress');

  if not found then
    return false;
  end if;

  -- Quem desiste é o profissional, então o cliente não paga taxa nenhuma.
  update orders
     set status = 'cancelled_by_professional',
         cancellation_fee_cents = 0,
         cancellation_reason = nullif(btrim(coalesce(p_motivo, '')), '')
   where id = p_order_id;

  update order_offers set status = 'expired', responded_at = now()
   where order_id = p_order_id and status = 'sent';

  return true;
end $function$;

grant execute on function fn_cancelar_pedido_profissional(uuid, text) to authenticated;

-- Bairro é o que o profissional enxerga no mapa: preenche os endereços
-- antigos que ficaram sem, reaproveitando o bairro já conhecido do mesmo CEP.
update addresses a
   set district = b.district
  from addresses b
 where a.district is null
   and b.district is not null
   and b.zipcode = a.zipcode;
