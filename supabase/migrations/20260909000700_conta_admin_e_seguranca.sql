-- Conta administradora + blindagem dos campos que a existência de um admin
-- de verdade só faz sentido se ninguém mais conseguir escrever neles.
--
-- Três brechas encontradas nesta auditoria (RLS restringe por LINHA, não por
-- COLUNA — sem revoke explícito, qualquer campo da própria linha é editável):
--   1) profiles.role: qualquer usuário logado podia virar 'admin' sozinho
--      (`update profiles set role='admin' where id=auth.uid()`).
--   2) professionals.accreditation_status/rating_avg/rating_count/
--      completed_orders: o profissional podia se autoaprovar e fraudar a
--      própria nota.
--   3) customers.credit_cents: o cliente podia se dar crédito à vontade.
-- As três ficam só de leitura para `authenticated`; toda escrita passa a ir
-- por RPC, que valida o que pode mudar.

-- ------------------------------------------------------------------ profiles
revoke insert, update on profiles from authenticated;

create or replace function fn_registrar_perfil(p_role text, p_full_name text, p_phone text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;
  if p_role not in ('customer', 'professional') then
    raise exception 'papel inválido';
  end if;
  insert into profiles (id, role, full_name, email, phone)
  values (auth.uid(), p_role, p_full_name, auth.jwt() ->> 'email', p_phone)
  on conflict (id) do update
    set role = excluded.role, full_name = excluded.full_name, phone = excluded.phone;
end $function$;

grant execute on function fn_registrar_perfil(text, text, text) to authenticated;
revoke execute on function fn_registrar_perfil(text, text, text) from public, anon;

create or replace function fn_atualizar_meu_perfil(p_full_name text, p_phone text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update profiles set full_name = p_full_name, phone = p_phone where id = auth.uid();
end $function$;

grant execute on function fn_atualizar_meu_perfil(text, text) to authenticated;
revoke execute on function fn_atualizar_meu_perfil(text, text) from public, anon;

-- --------------------------------------------------------------- customers
revoke insert, update on customers from authenticated;

create or replace function fn_registrar_cliente()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;
  insert into customers (id) values (auth.uid()) on conflict (id) do nothing;
end $function$;

grant execute on function fn_registrar_cliente() to authenticated;
revoke execute on function fn_registrar_cliente() from public, anon;

-- ----------------------------------------------------------- professionals
revoke insert, update on professionals from authenticated;

create or replace function fn_registrar_profissional(p_document text, p_skills text[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;
  -- accreditation_status nunca vem do cliente: todo cadastro novo entra
  -- como 'pending' e só a conta admin muda isso depois.
  insert into professionals (id, document, skills, accreditation_status)
  values (auth.uid(), p_document, p_skills::service_code[], 'pending')
  on conflict (id) do update
    set document = excluded.document, skills = excluded.skills;
end $function$;

grant execute on function fn_registrar_profissional(text, text[]) to authenticated;
revoke execute on function fn_registrar_profissional(text, text[]) from public, anon;

create or replace function fn_atualizar_servicos_profissional(p_skills text[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update professionals set skills = p_skills::service_code[] where id = auth.uid();
end $function$;

grant execute on function fn_atualizar_servicos_profissional(text[]) to authenticated;
revoke execute on function fn_atualizar_servicos_profissional(text[]) from public, anon;

-- O martelo final do credenciamento: só quem é admin (linha em profiles com
-- role='admin') consegue aprovar, suspender ou bloquear um profissional.
create or replace function fn_definir_credenciamento(p_professional_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_admin() then
    return false;
  end if;
  if p_status not in ('pending', 'in_review', 'approved', 'suspended', 'blocked') then
    raise exception 'status inválido';
  end if;
  update professionals set accreditation_status = p_status::accreditation
   where id = p_professional_id;
  return found;
end $function$;

grant execute on function fn_definir_credenciamento(uuid, text) to authenticated;
revoke execute on function fn_definir_credenciamento(uuid, text) from public, anon;

-- --------------------------------------------------------- conta administradora
-- Ação de confiança feita uma vez direto no banco — não existe (e não deve
-- existir) nenhum caminho no app onde alguém se torna admin sozinho.
update profiles set role = 'admin' where email = 'rosangeladranka0@gmail.com';
