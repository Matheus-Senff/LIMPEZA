-- Mesmo motivo do chat de pedido: sem isso a conversa só atualiza no F5.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'credentialing_chat_messages'
  ) then
    alter publication supabase_realtime add table credentialing_chat_messages;
  end if;
end $$;
