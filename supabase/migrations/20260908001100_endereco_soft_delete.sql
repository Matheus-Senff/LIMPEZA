-- =====================================================================
-- orders.address_id é ON DELETE RESTRICT (de propósito: o histórico de
-- um pedido não pode perder o endereço onde o serviço foi feito). Isso
-- travava o botão "Remover" pra qualquer endereço já usado em algum
-- pedido, sem aviso — o usuário tem que poder remover qualquer endereço
-- salvo, então em vez de excluir a linha, "remover" passa a ser um soft
-- delete: some da lista e do funil, mas o pedido antigo continua com o
-- endereço completo pro histórico.
-- =====================================================================

alter table addresses add column if not exists active boolean not null default true;
