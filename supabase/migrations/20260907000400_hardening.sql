-- =====================================================================
-- Hardening apontado pelo linter do Supabase
-- =====================================================================

-- 1. search_path fixo nas funções de trigger (evita sequestro de resolução de nomes)
alter function public.set_updated_at()  set search_path = public;
alter function public.fn_apply_review() set search_path = public;
alter function public.fn_settle_order() set search_path = public;

-- 2. citext fora do schema exposto pela API
alter extension citext set schema extensions;

-- 3. helpers de autorização não precisam ser chamáveis por visitante anônimo.
--    A role `authenticated` mantém EXECUTE porque as policies dependem disso.
revoke execute on function public.auth_role() from anon;
revoke execute on function public.is_admin()  from anon;

-- 4. funções de operação rodam apenas server-side (Edge Function / cron)
revoke execute on function public.fn_eligible_professionals(uuid, int) from anon, authenticated;
revoke execute on function public.fn_generate_subscription_orders(int) from anon, authenticated;
