-- UPDATE direto em professionals foi revogado do authenticated (ver
-- 20260909000700_conta_admin_e_seguranca.sql) — mesmo com a policy
-- prof_proprio permitindo, falta o GRANT de tabela, então o profissional
-- não conseguia salvar a própria chave Pix pelo client. Mesma solução já
-- usada para nome/telefone e serviços: uma RPC dedicada.

create or replace function fn_atualizar_pix_profissional(p_pix_key text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update professionals set pix_key = nullif(trim(p_pix_key), '') where id = auth.uid();
end $function$;

grant execute on function fn_atualizar_pix_profissional(text) to authenticated;
revoke execute on function fn_atualizar_pix_profissional(text) from public, anon;
