-- =====================================================================
-- Transições de estado do pedido como funções controladas — nunca um
-- update livre de `status` pelo cliente/profissional (a policy `for all`
-- já deixaria mudar pra qualquer status, então a validação tem que
-- morar aqui, não na RLS).
-- =====================================================================

create or replace function fn_check_in(p_order_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update orders
     set status = 'in_progress', check_in_at = now()
   where id = p_order_id
     and professional_id = auth.uid()
     and status = 'assigned';

  return found;
end $$;

revoke all on function fn_check_in(uuid) from public;
grant execute on function fn_check_in(uuid) to authenticated;

create or replace function fn_check_out(p_order_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update orders
     set status = 'completed', check_out_at = now()
   where id = p_order_id
     and professional_id = auth.uid()
     and status = 'in_progress';

  return found;
end $$;

revoke all on function fn_check_out(uuid) from public;
grant execute on function fn_check_out(uuid) to authenticated;

-- Cancelamento grátis até 24h antes do horário agendado; depois disso,
-- 20% do valor fica de taxa (o profissional pode já estar a caminho).
create or replace function fn_cancelar_pedido(p_order_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_order   orders%rowtype;
  v_taxa    integer := 0;
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
         cancellation_fee_cents = v_taxa
   where id = p_order_id;

  update order_offers set status = 'expired', responded_at = now()
   where order_id = p_order_id and status = 'sent';

  return true;
end $$;

revoke all on function fn_cancelar_pedido(uuid) from public;
grant execute on function fn_cancelar_pedido(uuid) to authenticated;
