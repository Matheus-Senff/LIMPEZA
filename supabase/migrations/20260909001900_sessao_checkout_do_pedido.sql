-- Guarda o id da sessão de Checkout da Stripe no pedido: sem isso não dava
-- pra expirar a sessão quando o cliente cancela por aqui antes de terminar
-- de pagar numa aba antiga (pendência documentada em docs/06-pendencias.md),
-- nem pra reaproveitar/gerar uma nova sessão quando o checkout foi abandonado.
alter table orders add column if not exists stripe_checkout_session_id text;
