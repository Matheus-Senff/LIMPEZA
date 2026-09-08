-- =====================================================================
-- Bairro real (via ViaCEP, gravado em addresses.district na criação do
-- pedido) some pro profissional na mesma função que já expõe cidade e
-- tipo de imóvel antes do aceite — rua/número continuam escondidos.
-- =====================================================================

drop function if exists fn_cidade_da_oferta(uuid);

create function fn_cidade_da_oferta(p_order_id uuid)
returns table (
  city text,
  state char(2),
  district text,
  home_type text,
  bedrooms smallint,
  bathrooms smallint,
  has_pets boolean
)
language sql security definer set search_path = public as $$
  select a.city, a.state, a.district, a.home_type::text, a.bedrooms, a.bathrooms, a.has_pets
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
