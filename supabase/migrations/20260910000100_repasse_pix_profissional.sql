-- Repasse manual via Pix: o profissional cadastra a própria chave, e o
-- admin vê quanto cada um tem a receber (professional_earnings já calcula
-- isso sozinho) e marca como pago depois de transferir por fora do sistema.
-- Não existe integração bancária real ainda — isso aqui é só o
-- acompanhamento de quem recebe o quê e quando foi pago.

alter table professionals add column if not exists pix_key text;

alter table professional_earnings add column if not exists paid_at timestamptz;

-- Só o profissional dono do ganho ou o admin enxergam (já coberto por
-- ganho_proprio), mas só o admin pode marcar como pago.
create policy earnings_admin_marca_pago on professional_earnings
  for update to authenticated using (is_admin()) with check (is_admin());
