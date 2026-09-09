-- Agora que existe um caminho real de credenciamento (documentos + revisão
-- da admin, ver migração anterior), só profissional com
-- accreditation_status = 'approved' pode receber oferta de pedido.
-- Atenção operacional: até a admin aprovar o primeiro profissional pela
-- tela, nenhuma oferta sai — é o comportamento certo, não é bug.
create or replace function fn_gerar_ofertas(p_order_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_service service_code;
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
