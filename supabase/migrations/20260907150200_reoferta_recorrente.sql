-- =====================================================================
-- Reoferta automática: a cada 5 minutos, todo pedido "searching_professional"
-- sem nenhuma oferta ativa (todas recusadas/expiradas, ou nenhum
-- profissional elegível na hora da criação) recebe uma nova rodada.
-- =====================================================================

create extension if not exists pg_cron;

create or replace function fn_atualizar_ofertas() returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in
    select o.id from orders o
     where o.status = 'searching_professional'
       and not exists (
         select 1 from order_offers f
          where f.order_id = o.id and f.status = 'sent' and f.expires_at > now()
       )
  loop
    perform fn_gerar_ofertas(r.id);
  end loop;
end $$;

revoke all on function fn_atualizar_ofertas() from public;

select cron.schedule('atualizar-ofertas', '*/5 * * * *', 'select fn_atualizar_ofertas();');
