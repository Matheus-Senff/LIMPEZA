-- Regressão da migration anterior: ao recriar fn_apply_review/fn_settle_order
-- (000500), revoguei o EXECUTE de PUBLIC mas esqueci o grant explícito que
-- `anon` já carregava desde a criação original das duas funções. Na prática
-- isso não dava pra explorar (são `returns trigger`, e o Postgres recusa
-- chamar função de gatilho fora de um gatilho), mas não deviam aparecer como
-- RPC pública mesmo assim.
revoke execute on function fn_apply_review() from anon;
revoke execute on function fn_settle_order() from anon;
