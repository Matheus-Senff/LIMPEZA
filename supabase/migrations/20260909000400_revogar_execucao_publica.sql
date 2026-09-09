-- Complemento da blindagem: no Postgres, toda função nasce com EXECUTE para
-- PUBLIC. Revogar só de `anon` não adianta — o acesso continua pelo grant
-- público. Aqui o PUBLIC sai e cada função recebe exatamente quem precisa.
--
-- Ficam de fora de propósito `is_admin()` e `auth_role()`: elas são chamadas
-- de dentro das policies e precisam ser executáveis por quem faz a consulta;
-- nenhuma das duas devolve dado de outra pessoa, só lê o próprio token.

-- Só o funil precisa consultar cobertura sem estar logado.
revoke execute on function fn_is_covered(text, service_code) from public;
grant execute on function fn_is_covered(text, service_code) to anon, authenticated, service_role;

-- Ações do app: exigem sessão.
revoke execute on function fn_aceitar_oferta(uuid) from public;
grant execute on function fn_aceitar_oferta(uuid) to authenticated;

revoke execute on function fn_cancelar_pedido(uuid, text) from public;
grant execute on function fn_cancelar_pedido(uuid, text) to authenticated;

revoke execute on function fn_cancelar_pedido_profissional(uuid, text) from public;
grant execute on function fn_cancelar_pedido_profissional(uuid, text) to authenticated;

revoke execute on function fn_check_in(uuid) from public;
grant execute on function fn_check_in(uuid) to authenticated;

revoke execute on function fn_check_out(uuid) from public;
grant execute on function fn_check_out(uuid) to authenticated;

revoke execute on function fn_cidade_da_oferta(uuid) from public;
grant execute on function fn_cidade_da_oferta(uuid) to authenticated;

revoke execute on function fn_editar_pedido(uuid, text[], integer, integer, integer, jsonb, text, smallint, smallint, text) from public;
grant execute on function fn_editar_pedido(uuid, text[], integer, integer, integer, jsonb, text, smallint, smallint, text) to authenticated;

revoke execute on function fn_gerar_ofertas(uuid) from public;
grant execute on function fn_gerar_ofertas(uuid) to authenticated;

revoke execute on function fn_upsert_centroide_bairro(text, character, text, double precision, double precision) from public;
grant execute on function fn_upsert_centroide_bairro(text, character, text, double precision, double precision) to authenticated;

revoke execute on function fn_salvar_endereco(uuid, text, text, text, text, text, text, text, character) from public;
grant execute on function fn_salvar_endereco(uuid, text, text, text, text, text, text, text, character) to authenticated;

revoke execute on function fn_remover_endereco(uuid) from public;
grant execute on function fn_remover_endereco(uuid) to authenticated;

-- Rotina de sistema: só o cron (service_role) e o pg_cron (postgres).
revoke execute on function fn_assinaturas_para_gerar(integer) from public;
grant execute on function fn_assinaturas_para_gerar(integer) to service_role;

revoke execute on function fn_registrar_pedido_assinatura(uuid, integer, integer) from public;
grant execute on function fn_registrar_pedido_assinatura(uuid, integer, integer) to service_role;

revoke execute on function fn_atualizar_ofertas() from public;
grant execute on function fn_atualizar_ofertas() to service_role;

-- Gatilhos rodam como dono da tabela: ninguém precisa chamar por REST.
revoke execute on function fn_criar_chat_ao_atribuir() from public;
revoke execute on function fn_sincronizar_email_do_perfil() from public;
revoke execute on function fn_apply_review() from public;
revoke execute on function fn_settle_order() from public;

-- Estas três ainda carregavam o grant explícito de `anon` que vem do padrão
-- do Supabase para funções novas no schema public.
revoke execute on function fn_editar_pedido(uuid, text[], integer, integer, integer, jsonb, text, smallint, smallint, text) from anon;
revoke execute on function fn_salvar_endereco(uuid, text, text, text, text, text, text, text, character) from anon;
revoke execute on function fn_remover_endereco(uuid) from anon;
