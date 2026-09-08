-- =====================================================================
-- profiles.email é gravado uma vez no cadastro e nunca mais era
-- atualizado — se o usuário trocasse o e-mail de login (fluxo novo em
-- "Minha conta"), o app continuaria mostrando o e-mail antigo pra sempre.
-- Mantém os dois em sincronia sempre que auth.users.email mudar (só
-- acontece depois que o usuário confirma a troca pelo link enviado).
-- =====================================================================

create or replace function fn_sincronizar_email_do_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists t_sincronizar_email on auth.users;
create trigger t_sincronizar_email
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function fn_sincronizar_email_do_perfil();
