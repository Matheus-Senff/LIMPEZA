-- =====================================================================
-- Bug real: uma oferta que expira sem resposta do profissional nunca
-- tinha o status trocado de 'sent' pra 'expired' — só fn_cancelar_pedido
-- e a recusa manual faziam essa troca. Sem isso, o ON CONFLICT de
-- fn_gerar_ofertas (que só reenvia pra linhas já 'declined'/'expired')
-- nunca conseguia reofertar pro mesmo profissional depois da primeira
-- janela de 10 minutos, deixando o pedido invisível pra sempre nas
-- ofertas/mapa do profissional mesmo com o cron rodando normalmente.
-- =====================================================================

create or replace function fn_atualizar_ofertas()
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  r record;
begin
  update order_offers
     set status = 'expired'
   where status = 'sent' and expires_at <= now();

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
end $function$;
