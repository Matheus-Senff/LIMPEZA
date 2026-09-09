# Pendências combinadas com o dono do produto

Lista viva do que foi **adiado de propósito**. Nada aqui é esquecimento: cada
item foi levantado, discutido e deixado para depois por decisão do Matheus.

## Adiados por decisão de produto (auditoria original)

| # | Item | Por quê está parado |
|---|------|---------------------|
| 1 | Credenciamento real do profissional (documentos, antecedentes, aprovação) | Fora do escopo atual |
| 2 | Gateway de pagamento de verdade (Pix/cartão) | Fora do escopo atual; hoje o pagamento é simulado |
| 4 | Preços calibrados com dados reais de mercado | Falta pesquisa de mercado; não invento número |
| 6 | E-mail próprio / SMTP no domínio | Falta domínio e credenciais |
| 14 | Sentry ligado | Falta a DSN; o código já existe e liga sozinho quando a env var aparecer |

## Adiados por tirarem autonomia do usuário (auditoria de 09/09/2026)

| # | Item | O que muda se aplicar | Decisão |
|---|------|-----------------------|---------|
| 9 | Só profissional credenciado recebe oferta | Hoje **todos** os profissionais estão `accreditation_status = 'pending'`; aplicar agora zera as ofertas e para a plataforma | Esperar o item 1 |
| 11 | Fechar o chat no banco quando o pedido encerra | Cliente e profissional perdem o contato depois de concluído/cancelado (a tela já esconde; o banco ainda aceita) | Rever depois, provável janela de 48h após a conclusão |
| 14-b | Bloqueio de senha vazada (HaveIBeenPwned) no Supabase Auth | Pode recusar a senha que a pessoa quer usar | **Manter como está** — decidido em 09/09/2026 |

## Assumido conscientemente

- A senha nova fica no `localStorage` do navegador (15 min, apagada ao usar) até
  o clique no link de confirmação. É o preço do fluxo "digita a senha agora e
  confirma por e-mail"; guardar no servidor seria pior, e `sessionStorage`
  quebraria quando o link abre em outra aba.
