# Roadmap de execução

Ordem pensada para ter **dinheiro entrando** antes de ter o app completo.

---

## Fase 0 — Base (feito)

- [x] Engenharia reversa do concorrente com preços medidos (`01-analise-parafuzo.md`)
- [x] Spec unificada com os 3 documentos originais (`02-spec-unificada.md`)
- [x] Esquema completo no Supabase: 24 tabelas, RLS, triggers, views
- [x] Motor de precificação dinâmica calibrado + 17 testes reproduzindo os preços reais
- [x] Edge Function `quote` (cobertura + preço + cotação assinada)

## Fase 1 — Vender antes de automatizar (2–3 semanas)

- [ ] Landing + funil de 6 passos (Next.js) consumindo a Edge Function `quote`
- [ ] Cadastro/login por link mágico (Supabase Auth)
- [ ] Checkout Pix (liquidação imediata) — cartão fica para a fase 2
- [ ] Matching **manual** pelo backoffice: operador vê o pedido e liga para a profissional
- [ ] WhatsApp como canal de status (antes do chat próprio)

> Racional: o funil e o preço são o produto. Matching automático sem oferta de
> profissionais é otimização prematura — os 20 primeiros pedidos se resolvem no telefone.

## Fase 2 — Operação (3–4 semanas)

- [ ] App do profissional: onboarding, agenda, feed de ofertas, check-in/out
- [ ] Matching automático (`fn_eligible_professionals`) + ofertas com expiração
- [ ] Cartão de crédito com autorização e **captura pós-check-out**
- [ ] Chat interno (Supabase Realtime) com mascaramento de telefone e e-mail
- [ ] Avaliação e recálculo de nota (já no banco)

## Fase 3 — Recorrência (2–3 semanas)

- [ ] Assinaturas semanais/quinzenais/mensais + `fn_generate_subscription_orders` no cron
- [ ] Profissional preferencial e fluxo de contingência quando ele não tem agenda
- [ ] Bônus de fidelização visível na tela de ganhos
- [ ] Pausar / pular semana (retenção antes de cancelamento)

## Fase 4 — Diferenciação (contínuo)

- [ ] **Preço final desde o passo 1** (o concorrente mostra piso e sobe até 26% depois)
- [ ] Assistência residencial **avulsa**, não só como benefício de plano
- [ ] Cobertura no interior do PR/SC, onde o concorrente recusa CEP
- [ ] Antecipação de recebíveis para o profissional
- [ ] Backoffice de preço com simulador e teste A/B por região

---

## Métricas que importam desde o dia 1

| Métrica | Onde sai | Meta inicial |
|---|---|---|
| Conversão passo 1 → cotação | `leads` × `quotes` | > 60% |
| Conversão cotação → pedido pago | `quotes.consumed_at` | > 25% |
| Tempo até atribuição | `orders.created_at` → `assigned` | < 60 min |
| Take rate | `v_margin_monthly` | 25–35% |
| Recompra em 30 dias | `orders` por cliente | > 40% |
| Nota média | `professionals.rating_avg` | ≥ 4,7 |
| Cobertura de agenda | ofertas aceitas / enviadas | > 70% |

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Não ter profissional na região | Não abrir CEP em `coverage_areas` antes de ter 5 profissionais aprovados |
| Preço dinâmico gerar desconfiança | Mostrar "opções mais baratas" e travar o preço na cotação assinada |
| Vínculo trabalhista | Contrato de parceria, autonomia de agenda, sem exclusividade — documentar |
| Chargeback | Cartão só capturado após check-out com geolocalização e foto |
| Vazamento de dados do cliente | RLS em todas as tabelas; endereço só após aceite; chat mascarado |
