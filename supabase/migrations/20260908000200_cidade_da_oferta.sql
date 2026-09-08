-- =====================================================================
-- O profissional não vê o endereço completo antes de aceitar (por
-- design — só depois do aceite), mas hoje ele nem sabe em qual das 3
-- cidades é, o que torna a decisão de aceitar às cegas. Expõe só
-- cidade/estado, nunca rua/número, enquanto a oferta estiver pendente.
-- =====================================================================

create or replace function fn_cidade_da_oferta(p_order_id uuid)
returns table (city text, state char(2))
language sql security definer set search_path = public as $$
  select a.city, a.state
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
