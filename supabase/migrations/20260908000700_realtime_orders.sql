-- Habilita Realtime em `orders` para o profissional ver na hora se o
-- cliente editar um pedido enquanto a oferta ainda está pendente. O RLS
-- de `pedido_profissional` já limita quem recebe cada evento.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;
