-- Dois gatilhos rodavam com a permissão de quem disparou a ação, e desde que
-- `orders` passou a ter UPDATE revogado por coluna isso quebrou de verdade:
-- ao enviar a avaliação, o gatilho tentava marcar o pedido como 'rated' com o
-- papel do cliente e recebia "permission denied for table orders" — a nota não
-- era gravada. Os dois viram SECURITY DEFINER, que é o certo para gatilho de
-- consistência interna.
--
-- De quebra, `fn_settle_order` explodia se o pedido virasse 'completed' sem
-- check-out registrado (caminho do admin): `available_at` saía nulo.

create or replace function fn_apply_review()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update professionals p
     set rating_count = p.rating_count + 1,
         rating_avg   = round(((p.rating_avg * p.rating_count) + new.rating)
                              / (p.rating_count + 1)::numeric, 2)
   where p.id = new.professional_id;
  update orders set status = 'rated' where id = new.order_id;
  return new;
end $function$;

create or replace function fn_settle_order()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_bonus integer := 0;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.subscription_id is not null then
      select case when s.preferred_professional_id = new.professional_id then 1500 else 800 end
        into v_bonus
        from subscriptions s where s.id = new.subscription_id;
    end if;

    insert into professional_earnings
      (professional_id, order_id, base_cents, loyalty_bonus_cents, available_at)
    values
      (new.professional_id, new.id, new.payout_cents, coalesce(v_bonus, 0),
       (coalesce(new.check_out_at, now()) at time zone 'America/Sao_Paulo')::date + 2)
    on conflict (order_id) do nothing;

    update professionals
       set completed_orders = completed_orders + 1
     where id = new.professional_id;
  end if;
  return new;
end $function$;

revoke execute on function fn_apply_review() from public;
revoke execute on function fn_settle_order() from public;
