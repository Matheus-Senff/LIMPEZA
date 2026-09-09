-- Suporte técnico: cliente ou profissional abre um chamado, a conta admin
-- responde e resolve. Espaço próprio dentro do backoffice.

create table support_tickets (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references profiles(id),
  subject       text not null,
  status        text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table support_ticket_messages (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references support_tickets(id) on delete cascade,
  sender_id     uuid not null references profiles(id),
  is_admin_reply boolean not null default false,
  body          text not null,
  created_at    timestamptz not null default now()
);

create index support_tickets_requester_idx on support_tickets(requester_id);
create index support_ticket_messages_ticket_idx on support_ticket_messages(ticket_id);

alter table support_tickets enable row level security;
alter table support_ticket_messages enable row level security;

-- Quem abriu o chamado vê e cria o seu; admin vê e mexe em todos.
create policy chamado_proprio on support_tickets
  for select to authenticated
  using (requester_id = auth.uid() or is_admin());

create policy chamado_criar on support_tickets
  for insert to authenticated
  with check (requester_id = auth.uid());

-- O próprio autor só pode fechar o chamado (nunca reabrir ou mudar outro
-- status) — o resto do fluxo (em andamento / resolvido) é só do admin.
create policy chamado_fechar_proprio on support_tickets
  for update to authenticated
  using (requester_id = auth.uid())
  with check (requester_id = auth.uid() and status = 'closed');

create policy chamado_admin on support_tickets
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy mensagem_leitura on support_ticket_messages
  for select to authenticated
  using (
    is_admin()
    or exists (select 1 from support_tickets t where t.id = ticket_id and t.requester_id = auth.uid())
  );

create policy mensagem_escrita on support_ticket_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      is_admin()
      or exists (select 1 from support_tickets t where t.id = ticket_id and t.requester_id = auth.uid())
    )
  );

-- Atualiza o "tocado em" do chamado a cada mensagem nova, pra ordenar por
-- quem precisa de resposta mais recente.
create or replace function fn_tocar_chamado()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update support_tickets
     set updated_at = now(),
         status = case when new.is_admin_reply and status = 'open' then 'in_progress' else status end
   where id = new.ticket_id;
  return new;
end $function$;

create trigger t_tocar_chamado
  after insert on support_ticket_messages
  for each row execute function fn_tocar_chamado();

revoke execute on function fn_tocar_chamado() from public;
