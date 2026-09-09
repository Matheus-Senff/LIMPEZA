-- Chat direto entre a admin e o profissional durante o credenciamento —
-- a admin quer poder chamar a pessoa assim que ela cria o perfil (pra
-- combinar o treinamento presencial de limpeza), sem esperar nenhum pedido
-- existir. É a mesma forma do chat de pedido (chat_threads/chat_messages),
-- só que amarrado no profissional em vez de num order_id.

create table credentialing_chat_threads (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null unique references professionals(id) on delete cascade,
  closed_at       timestamptz,
  created_at      timestamptz not null default now()
);

create table credentialing_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references credentialing_chat_threads(id) on delete cascade,
  sender_id   uuid not null references profiles(id) on delete cascade,
  body        text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index credentialing_chat_messages_thread_idx on credentialing_chat_messages (thread_id, created_at);

alter table credentialing_chat_threads  enable row level security;
alter table credentialing_chat_messages enable row level security;

create policy credenciamento_thread_partes on credentialing_chat_threads
  for select to authenticated using (professional_id = auth.uid() or is_admin());

create policy credenciamento_msg_leitura on credentialing_chat_messages
  for select to authenticated using (exists (
    select 1 from credentialing_chat_threads t
     where t.id = credentialing_chat_messages.thread_id
       and (t.professional_id = auth.uid() or is_admin())));

create policy credenciamento_msg_escrita on credentialing_chat_messages
  for insert to authenticated with check (sender_id = auth.uid() and exists (
    select 1 from credentialing_chat_threads t
     where t.id = thread_id
       and (t.professional_id = auth.uid() or is_admin())));

-- A conversa nasce junto com o cadastro do profissional — a admin já pode
-- chamar pra marcar o treinamento antes mesmo dos documentos chegarem.
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
  insert into professionals (id, document, skills, accreditation_status)
  values (auth.uid(), p_document, p_skills::service_code[], 'pending')
  on conflict (id) do update
    set document = excluded.document, skills = excluded.skills;

  insert into credentialing_chat_threads (professional_id)
  values (auth.uid())
  on conflict (professional_id) do nothing;
end $function$;

grant execute on function fn_registrar_profissional(text, text[]) to authenticated;
revoke execute on function fn_registrar_profissional(text, text[]) from public, anon;

-- Backfill: profissionais que já existiam antes desta migração também
-- ganham a conversa, senão a admin não consegue chamar quem já se cadastrou.
insert into credentialing_chat_threads (professional_id)
select id from professionals
on conflict (professional_id) do nothing;
