-- Blindagem de acesso: fecha o que a auditoria de 09/09/2026 encontrou, sem
-- tirar nada do que cliente e profissional fazem hoje pelo app.

-- ---------------------------------------------------------------- RPC pública
-- Só `fn_is_covered` precisa ser chamada sem login (o funil valida o CEP antes
-- de o visitante virar cliente). O resto passa a exigir sessão, e as funções de
-- sistema (assinaturas) ficam só para o service_role do cron.
revoke execute on function fn_aceitar_oferta(uuid) from anon;
revoke execute on function fn_cancelar_pedido(uuid, text) from anon;
revoke execute on function fn_cancelar_pedido_profissional(uuid, text) from anon;
revoke execute on function fn_check_in(uuid) from anon;
revoke execute on function fn_check_out(uuid) from anon;
revoke execute on function fn_cidade_da_oferta(uuid) from anon;
revoke execute on function fn_gerar_ofertas(uuid) from anon;
revoke execute on function fn_upsert_centroide_bairro(text, character, text, double precision, double precision) from anon;
revoke execute on function is_admin() from anon;
revoke execute on function auth_role() from anon;
revoke execute on function fn_atualizar_ofertas() from anon, authenticated;
revoke execute on function fn_assinaturas_para_gerar(integer) from anon, authenticated;
revoke execute on function fn_registrar_pedido_assinatura(uuid, integer, integer) from anon, authenticated;

-- Gatilhos não são API: ninguém precisa chamar isso por REST.
revoke execute on function fn_criar_chat_ao_atribuir() from anon, authenticated;
revoke execute on function fn_sincronizar_email_do_perfil() from anon, authenticated;

-- --------------------------------------------------------------------- quotes
-- A cotação carrega preço, repasse e CEP: era legível por qualquer visitante
-- enquanto estivesse válida. Agora só o dono (e o admin) enxerga.
drop policy if exists cotacao_leitura_por_id on quotes;

-- --------------------------------------------------------------------- orders
-- Cancelar é pela RPC (com motivo e taxa). Apagar o pedido pelo REST fugia da
-- taxa e sumia com o histórico do profissional.
revoke delete on orders from authenticated;

-- -------------------------------------------------------------------- reviews
-- Avaliar só o próprio pedido, já concluído, e só o profissional que atendeu.
drop policy if exists review_cliente on reviews;
create policy review_cliente on reviews
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from orders o
       where o.id = reviews.order_id
         and o.customer_id = auth.uid()
         and o.professional_id = reviews.professional_id
         and o.status in ('completed', 'rated')
    )
  );

-- ------------------------------------------------------------------ addresses
-- Endereço editável sem reescrever o passado: se a linha já foi usada em algum
-- pedido, a edição vira uma linha nova e a antiga sai da lista (o pedido antigo
-- continua mostrando o endereço como era no dia).
create or replace function fn_salvar_endereco(
  p_id uuid,
  p_label text,
  p_zipcode text,
  p_street text,
  p_number text,
  p_complement text,
  p_district text,
  p_city text,
  p_state character
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id    uuid;
  v_usado boolean;
begin
  if auth.uid() is null then
    return null;
  end if;

  if p_id is null then
    insert into addresses (customer_id, label, zipcode, street, number, complement, district, city, state)
    values (auth.uid(), p_label, p_zipcode, p_street, p_number, p_complement, p_district, p_city, p_state)
    returning id into v_id;
    return v_id;
  end if;

  if not exists (select 1 from addresses where id = p_id and customer_id = auth.uid()) then
    return null;
  end if;

  select exists (select 1 from orders where address_id = p_id) into v_usado;

  if v_usado then
    insert into addresses (customer_id, label, zipcode, street, number, complement, district, city, state,
                           home_type, bedrooms, bathrooms, access_notes, has_pets)
    select customer_id, p_label, p_zipcode, p_street, p_number, p_complement, p_district, p_city, p_state,
           home_type, bedrooms, bathrooms, access_notes, has_pets
      from addresses where id = p_id
    returning id into v_id;

    update addresses set active = false where id = p_id;
    return v_id;
  end if;

  update addresses
     set label = p_label, zipcode = p_zipcode, street = p_street, number = p_number,
         complement = p_complement, district = p_district, city = p_city, state = p_state
   where id = p_id;
  return p_id;
end $function$;

grant execute on function fn_salvar_endereco(uuid, text, text, text, text, text, text, text, character) to authenticated;

create or replace function fn_remover_endereco(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update addresses set active = false
   where id = p_id and customer_id = auth.uid();
  return found;
end $function$;

grant execute on function fn_remover_endereco(uuid) to authenticated;

-- Com as duas RPCs acima, o cliente não precisa mais de UPDATE/DELETE direto na
-- tabela — e o histórico dos pedidos para de poder ser reescrito.
revoke update, delete on addresses from authenticated;
