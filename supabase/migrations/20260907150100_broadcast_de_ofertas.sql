-- =====================================================================
-- Mercado pequeno, oferta aberta: todo profissional que atende o serviço
-- vê o pedido (não é matching por pontuação/distância — ainda não temos
-- credenciamento nem geolocalização dos profissionais). Primeira
-- aceitação vence.
-- =====================================================================

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
  on conflict (order_id, professional_id) do update
    set status = 'sent', expires_at = now() + interval '10 minutes', responded_at = null
    where order_offers.status in ('declined', 'expired');

  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function fn_gerar_ofertas(uuid) from public;
grant execute on function fn_gerar_ofertas(uuid) to authenticated;

-- Aceite atômico: só passa se a oferta ainda estiver de pé e ninguém
-- tiver pegado o pedido antes. Ao aceitar, recusa as ofertas dos outros.
create or replace function fn_aceitar_oferta(p_order_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_prof uuid := auth.uid();
begin
  if not exists (
    select 1 from order_offers
     where order_id = p_order_id and professional_id = v_prof
       and status = 'sent' and expires_at > now()
  ) then
    return false;
  end if;

  update orders
     set professional_id = v_prof, status = 'assigned'
   where id = p_order_id
     and status = 'searching_professional'
     and professional_id is null;

  if not found then
    return false;
  end if;

  update order_offers set status = 'accepted', responded_at = now()
   where order_id = p_order_id and professional_id = v_prof;

  update order_offers set status = 'declined', responded_at = now()
   where order_id = p_order_id and professional_id <> v_prof and status = 'sent';

  return true;
end $$;

revoke all on function fn_aceitar_oferta(uuid) from public;
grant execute on function fn_aceitar_oferta(uuid) to authenticated;
