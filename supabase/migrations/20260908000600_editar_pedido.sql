-- =====================================================================
-- Edição de pedido pelo cliente, só enquanto ainda procura profissional.
--
-- A policy `pedido_cliente` é ALL sem checar coluna nenhuma — hoje um
-- cliente já pode, por RLS, dar UPDATE em price_cents/payout_cents/status
-- direto pela API do Supabase. Fecha essa brecha em nível de coluna e
-- move qualquer edição de pedido para uma função SECURITY DEFINER que
-- recalcula preço no servidor (Next.js) e só aplica se o pedido ainda
-- não foi aceito.
-- =====================================================================

revoke update on orders from authenticated;
grant update (subscription_id) on orders to authenticated;

create or replace function fn_editar_pedido(
  p_order_id uuid,
  p_addons text[],
  p_minutes int,
  p_price_cents int,
  p_payout_cents int,
  p_price_breakdown jsonb,
  p_home_type text,
  p_bedrooms smallint,
  p_bathrooms smallint,
  p_access_notes text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then return false; end if;
  if v_order.customer_id <> auth.uid() then return false; end if;
  if v_order.status <> 'searching_professional' then return false; end if;

  update orders set
    addons = p_addons,
    minutes = p_minutes,
    price_cents = p_price_cents,
    payout_cents = p_payout_cents,
    price_breakdown = p_price_breakdown,
    updated_at = now()
  where id = p_order_id;

  update addresses set
    home_type = p_home_type::home_type,
    bedrooms = p_bedrooms,
    bathrooms = p_bathrooms,
    access_notes = p_access_notes
  where id = v_order.address_id;

  return true;
end;
$$;

revoke all on function fn_editar_pedido(uuid, text[], int, int, int, jsonb, text, smallint, smallint, text) from public;
grant execute on function fn_editar_pedido(uuid, text[], int, int, int, jsonb, text, smallint, smallint, text) to authenticated;

-- =====================================================================
-- O profissional decide aceitar ou recusar sem ver o que realmente foi
-- pedido (opcionais já vêm em orders, mas tipo de imóvel/cômodos vivem em
-- addresses, bloqueada por RLS antes do aceite). Estende a função que já
-- expõe cidade/estado pra também trazer esses dados não sensíveis —
-- endereço completo e instruções de acesso continuam escondidos.
-- =====================================================================

drop function if exists fn_cidade_da_oferta(uuid);

create function fn_cidade_da_oferta(p_order_id uuid)
returns table (
  city text,
  state char(2),
  home_type text,
  bedrooms smallint,
  bathrooms smallint,
  has_pets boolean
)
language sql security definer set search_path = public as $$
  select a.city, a.state, a.home_type::text, a.bedrooms, a.bathrooms, a.has_pets
    from orders o
    join addresses a on a.id = o.address_id
   where o.id = p_order_id
     and exists (
       select 1 from order_offers f
        where f.order_id = p_order_id
          and f.professional_id = auth.uid()
          and f.status = 'sent'
          and f.expires_at > now()
     );
$$;

revoke all on function fn_cidade_da_oferta(uuid) from public;
grant execute on function fn_cidade_da_oferta(uuid) to authenticated;
