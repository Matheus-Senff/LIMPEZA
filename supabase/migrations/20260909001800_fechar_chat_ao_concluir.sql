-- Pendência antiga (docs/06-pendencias.md #11): cliente e profissional
-- ficam com o chat aberto pra sempre depois do pedido acabar — a tela já
-- escondia, mas o banco aceitava mensagem novas indefinidamente. Decisão
-- tomada: fecha 48h depois do pedido virar estado terminal, não na hora —
-- dá tempo de resolver um problema de última hora sem reabrir pedido.

-- A policy de escrita checava só "closed_at is null"; agora precisa
-- distinguir "marcado pra fechar no futuro" de "já passou da janela".
drop policy if exists chat_msg_escrita on chat_messages;
create policy chat_msg_escrita on chat_messages
  for insert to authenticated with check (sender_id = auth.uid() and exists (
    select 1 from chat_threads t join orders o on o.id = t.order_id
     where t.id = thread_id
       and (t.closed_at is null or now() < t.closed_at)
       and (o.customer_id = auth.uid() or o.professional_id = auth.uid())));

create or replace function fn_fechar_chat_ao_concluir() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('completed', 'rated', 'cancelled_by_customer',
                     'cancelled_by_professional', 'no_show', 'refunded')
     and old.status is distinct from new.status then
    update chat_threads
       set closed_at = now() + interval '48 hours'
     where order_id = new.id
       and closed_at is null;
  end if;
  return new;
end $$;

create trigger trg_fechar_chat_ao_concluir
  after update of status on orders
  for each row execute function fn_fechar_chat_ao_concluir();

revoke execute on function fn_fechar_chat_ao_concluir() from anon, authenticated;

-- Backfill: pedido que já estava terminal antes desta migração também
-- ganha a janela de 48h a partir de agora (não fecha ninguém na marra).
update chat_threads t
   set closed_at = now() + interval '48 hours'
  from orders o
 where o.id = t.order_id
   and t.closed_at is null
   and o.status in ('completed', 'rated', 'cancelled_by_customer',
                     'cancelled_by_professional', 'no_show', 'refunded');
