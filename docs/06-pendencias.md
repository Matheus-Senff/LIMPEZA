# Pendências combinadas com o dono do produto

Lista viva do que foi **adiado de propósito**. Nada aqui é esquecimento: cada
item foi levantado, discutido e deixado para depois por decisão do Matheus.

## Adiados por decisão de produto (auditoria original)

| # | Item | Por quê está parado |
|---|------|---------------------|
| 1 | Credenciamento real do profissional (documentos, antecedentes, aprovação) | Fora do escopo atual |
| 2 | ~~Gateway de pagamento de verdade~~ | **Feito em 09/09/2026** — Stripe Checkout (Pix e cartão), ver seção abaixo |
| 4 | Preços calibrados com dados reais de mercado | Falta pesquisa de mercado; não invento número |
| 6 | E-mail próprio / SMTP no domínio | Falta domínio e credenciais |
| 14 | Sentry ligado | Falta a DSN; o código já existe e liga sozinho quando a env var aparecer |

## Adiados por tirarem autonomia do usuário (auditoria de 09/09/2026)

| # | Item | O que muda se aplicar | Decisão |
|---|------|-----------------------|---------|
| 9 | Só profissional credenciado recebe oferta | Hoje **todos** os profissionais estão `accreditation_status = 'pending'`; aplicar agora zera as ofertas e para a plataforma | Esperar o item 1 |
| 11 | Fechar o chat no banco quando o pedido encerra | Cliente e profissional perdem o contato depois de concluído/cancelado (a tela já esconde; o banco ainda aceita) | Rever depois, provável janela de 48h após a conclusão |
| 14-b | Bloqueio de senha vazada (HaveIBeenPwned) no Supabase Auth | Pode recusar a senha que a pessoa quer usar | **Manter como está** — decidido em 09/09/2026 |

## Pagamento com Stripe (09/09/2026) — o que ficou de fora por hoje

O caminho que existe: pedido nasce `pending_payment` → Stripe Checkout (Pix
ou cartão, cobrado na hora) → webhook confirma → pedido vira visível pros
profissionais. Cancelamento estorna automaticamente o que foi pago. Isso
cobre pedido avulso e a primeira diária de uma assinatura.

O que **não** foi construído agora, por exigir teste contra a Stripe de
verdade (que eu não tenho como fazer sem a chave) e não ser essencial pro
primeiro pagamento funcionar:

| Item | Por quê ficou de fora |
|------|------------------------|
| Cobrança automática das diárias seguintes de uma assinatura | Precisaria salvar o cartão do cliente (Stripe Customer + SetupIntent) e cobrar "fora da tela" a cada recorrência — feature própria, maior que "ligar o pagamento". Hoje só a primeira diária é cobrada; as seguintes (geradas pelo cron) continuam sem cobrança, do jeito que já estavam. |
| Botão "pagar de novo" num pedido com checkout abandonado | O pedido fica `pending_payment` e pode ser cancelado, mas pagar de novo hoje significa cancelar e refazer o pedido em Serviços — funcional, mas não é o ideal. |
| Cancelar a sessão de checkout na Stripe quando o cliente cancela o pedido por aqui antes de pagar | Não guardamos o id da sessão no pedido. Risco baixíssimo (a pessoa teria que cancelar aqui E terminar de pagar numa aba antiga da Stripe), e o pagamento nesse caso confirmaria um pedido já cancelado sem broadcast nenhum (a RPC de confirmação já rejeita pedido que não está mais `pending_payment`) — mas o dinheiro entraria sem gerar reembolso automático. |
| Captura em duas etapas no cartão (autoriza na hora, só cobra depois do check-out do profissional) | Existiam no design original, mas depende de testar contra a API de verdade pra ter certeza do comportamento em cada etapa — prefiro não arriscar dinheiro real com lógica não testada. Hoje cartão e Pix cobram os dois na hora, igual, e o cancelamento estorna automaticamente. |

## Assumido conscientemente

- A senha nova fica no `localStorage` do navegador (15 min, apagada ao usar) até
  o clique no link de confirmação. É o preço do fluxo "digita a senha agora e
  confirma por e-mail"; guardar no servidor seria pior, e `sessionStorage`
  quebraria quando o link abre em outra aba.
