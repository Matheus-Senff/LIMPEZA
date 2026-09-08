-- =====================================================================
-- Suporte pra tela de detalhe do pedido: thread de chat criada sozinha
-- quando o pedido é atribuído, e o perfil público do profissional
-- visível pro cliente independente de credenciamento (esse fluxo de
-- aprovação ainda não existe — a view antiga nunca mostraria ninguém).
-- =====================================================================

create or replace function fn_criar_chat_ao_atribuir() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'assigned' and old.status is distinct from 'assigned' then
    insert into chat_threads (order_id) values (new.id)
    on conflict (order_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists t_criar_chat on orders;
create trigger t_criar_chat after update on orders
  for each row execute function fn_criar_chat_ao_atribuir();

create or replace view public_professionals
with (security_invoker = true) as
  select p.id, pr.full_name, pr.avatar_url, p.rating_avg, p.rating_count,
         p.completed_orders, p.skills
    from professionals p
    join profiles pr on pr.id = p.id;

-- Cliente e profissional dos dois lados de um pedido podem ler o nome
-- básico um do outro (necessário pra tela de detalhe e pro chat).
create policy perfil_participante_pedido on profiles
  for select to authenticated using (
    exists (
      select 1 from orders o
       where (o.customer_id = auth.uid() and o.professional_id = profiles.id)
          or (o.professional_id = auth.uid() and o.customer_id = profiles.id)
    )
  );
