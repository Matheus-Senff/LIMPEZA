# Spec Unificada — Plataforma de Serviços Residenciais

Fusão dos três documentos originais (`SPEC SERVIÇOS RESIDENCIAIS`, `VISÃO DO CLIENTE`,
`VISÃO DO PROFISSIONAL`) com o que foi **medido em produção** no Parafuzo (ver `01-analise-parafuzo.md`).

Escopo definido: **clone completo do modelo** — app do cliente + app do profissional + backoffice,
catálogo multi-serviço, assinaturas, assistência residencial e **precificação dinâmica**.
Backend: **Supabase** (Postgres + Auth + RLS + Edge Functions + Realtime + Storage).

---

## 1. O que os documentos acertaram, o que precisa mudar

| Tema | Documento original | Realidade medida | Decisão para o nosso produto |
|---|---|---|---|
| Preço | `servicos_catalogo.preco_hora NUMERIC` — **um preço por hora fixo** | Motor de regras com surge por data, horário, antecedência, frequência e região; valor/hora **cai** conforme as horas sobem | **Descartar `preco_hora`.** Adotar motor de regras versionado (`pricing_*`), ver §4 e `04-modelo-precificacao.md` |
| Funil | "3 passos" | **6 passos** em acordeão numa única página | Manter os 6 passos; os "3 passos" viram a narrativa de marketing na home |
| Cotação | Preço só aparece no checkout | Preço aparece no passo 1, com **e-mail + CEP** | Lead-gate igual: e-mail + CEP destravam o preço |
| Opcionais | Não previstos | 7 opcionais, cada um **adiciona horas** | Tabela `service_addons` com `extra_minutes` |
| Cobertura | Não prevista | Bloqueio por CEP com mensagem explícita | Tabela `coverage_areas` + validação no passo 1 |
| Repasse | `valor_total * 0.75` fixo e bônus fixo de R$ 15 | Motor devolve `price` **e** `payout` na mesma passada, com `payout_hour`, `payout_min` e multiplicadores | `payout` calculado pelo mesmo motor, nunca por percentual hard-coded |
| Assinatura | Cron gera pedidos a cada 7/14/30 dias | Confirmado pelo comportamento do produto | Manter, com geração antecipada de 8 semanas e reagendamento por ocorrência |
| Assistência residencial | Grátis para assinante, 3 níveis | Confirmado como benefício de plano | Manter; adicionar contratação avulsa (lacuna do concorrente) |
| Nota mínima 4,6 | Regra de negócio | Coerente com o discurso público (média 4.8) | Manter como gate de matching, não como bloqueio de cadastro |
| Chat | Chat interno mascarando telefone | Confirmado (chat dedicado, domínio próprio) | Supabase Realtime + política de mascaramento |
| Pagamento | Pix imediato / cartão capturado após serviço | Confirmado no material do produto | Manter — é a regra financeira central |

---

## 2. Catálogo de serviços (config, não código)

| Código | Nome | Piso de horas | Sugerido | Traz produtos | Antecedência mínima |
|---|---|---|---|---|---|
| `CLEANING` | Limpeza Padrão | 3h30 | 4h | não | 2h (mesmo dia) |
| `HEAVY_CLEANING` | Limpeza Pesada | 4h | 6h | **sim** | 2h |
| `PRE_MOVING_CLEANING` | Limpeza Pré-mudança | 4h | 6h | **sim** | 24h |
| `POST_WORK_CLEANING` | Limpeza Pós-obra | 6h | 8h | não | 24h |
| `BUSINESS_CLEANING` | Limpeza Comercial (B2B) | 3h | 4h | não | 2h |
| `IRONING` | Passadoria | 2h | 3h | não | 2h |
| `FURNITURE_ASSEMBLY` | Montagem de Móveis | 2h | 3h | não | 24h |
| `HOME_ASSISTANCE` | Assistência Residencial | por chamado | — | n/a | imediata |

Cada serviço tem seus próprios addons, seu próprio conjunto de habilidades exigidas
(`skill` do profissional) e sua própria curva de preço.

### Addons (adicionam tempo, não valor arbitrário)

| Código | Nome | +minutos | Serviços |
|---|---|---|---|
| `REFRIGERATOR` | Interior da geladeira | 30 | limpezas |
| `VACCUM_CARPET` | Aspirar tapete/estofado | 30 | limpezas |
| `WASH_WINDOWS` | Interior de janelas | 60 | limpezas |
| `CLEANUP_CABINETS` | Interior de armário de cozinha | 60 | limpezas |
| `LAUNDRY` | Lavar roupas | 60 | limpezas |
| `CLEANUP_EXTERNAL` | Área externa até 20 m² | 120 | limpezas |
| `IRONING_ADDON` | Passadoria de roupas | 120 | limpezas |

---

## 3. Funil do cliente — 6 passos (tela a tela)

**Regra transversal:** uma única rota (`/contratar/[servico]`), estado em URL/`localStorage`,
resumo de preço sticky recalculado a cada mudança, e nenhum passo posterior visível antes de
o anterior estar válido.

| Passo | Tela | Entradas | Saída no resumo | Escritas |
|---|---|---|---|---|
| 1/6 | Serviço + imóvel + contato | serviço, tipo de lar, quartos, banheiros, e-mail, CEP | **primeiro preço** | `leads` (e-mail + CEP + serviço) |
| 2/6 | Opcionais + horas | addons, stepper de 30 min | horas e preço atualizados | — (estado local) |
| 3/6 | Frequência + data + horário | `SINGLE/WEEKLY/BIWEEKLY/MONTHLY`, data, janela | preço final com surge | `quotes` (cotação assinada, TTL 30 min) |
| 4/6 | Identificação | login mágico ou cadastro (Supabase Auth) | — | `customers` |
| 5/6 | Endereço e acesso | endereço completo, complemento, instruções, pets, chaves | — | `addresses` |
| 6/6 | Pagamento | **Pix** (liquida agora) ou **cartão** (autoriza agora, captura no check-out) | recibo | `orders` + `subscriptions` + `payments` |

Após o passo 6: tela de **matching** ("procurando o profissional ideal"), com push/e-mail quando
o profissional for atribuído.

### Estados do pedido

`draft → pending_payment → searching_professional → assigned → in_progress → completed → rated`
com ramos `cancelled_by_customer`, `cancelled_by_professional`, `no_show`, `refunded`.

---

## 4. Motor de precificação (resumo — detalhe em `04-modelo-precificacao.md`)

Pipeline determinístico, sempre devolvendo `{ price, payout, breakdown[] }`:

```
base(serviço, região, horas)
  → × multiplicador de frequência   (SINGLE 1.00 | WEEKLY ~0.88 | BIWEEKLY ~0.90 | MONTHLY ~0.92)
  → × multiplicador de dia          (calendário/demanda)
  → × multiplicador de janela       (manhã > tarde)
  → × multiplicador de antecedência (mesmo dia = "Agora", ~+26%)
  → + connect_fee                   (por serviço/região, hoje 0)
  → overrides                       (zipcode > neighborhood > city > region > global)
  → arredondamento para real inteiro
```

O `payout` do profissional sai do **mesmo** pipeline (`payout_hour × horas × multiplicadores`, com
piso `payout_min`), o que garante que nenhuma promoção do cliente coma o repasse por acidente.
Toda cotação é **assinada e persistida** (`quotes`) — o preço mostrado é o preço cobrado.

---

## 5. App do profissional

Fluxo: **onboarding** (dados + documentos + selfie) → **verificação** (antecedentes, referências) →
**aprovação** (ativa seguro) → **capacitação** → **operação**.

| Tela | Função | Regras |
|---|---|---|
| Onboarding | upload de documentos, habilidades, raio de atendimento | status `pending/approved/blocked`; recheck periódico com data |
| Agenda | calendário semanal/mensal, avulsos vs recorrentes | bloqueios de disponibilidade próprios |
| Ofertas | feed de pedidos compatíveis por skill + geo + nota | ofertas expiram; primeira aceitação vence |
| Detalhe do serviço | endereço liberado só após aceite, chat, rota | telefone nunca exposto |
| Execução | **check-in / check-out** com geolocalização | check-out dispara captura do cartão e gera `professional_earnings` |
| Ganhos | saldo, projeção, antecipação, **bônus de fidelização** | bônus só quando `order.subscription_id` não é nulo |
| Qualidade | nota média, meta ≥ 4,6, trilhas de capacitação | abaixo do piso → suspensão para reciclagem |

---

## 6. Backoffice

Fila de credenciamento · gestão de cobertura (CEP/cidade) · **editor de regras de preço com
versionamento e simulador** · monitor de matching (pedidos sem profissional) · disputas e reembolsos ·
chamados de assistência · relatórios de margem (receita − repasse − bônus).

---

## 7. Requisitos não funcionais

- **Cotação < 300 ms** (motor roda no edge, config em cache).
- **Matching < 60 s** para 95% dos pedidos com antecedência ≥ 24h.
- **Idempotência** em webhooks de pagamento (`payments.gateway_reference` único).
- **LGPD**: e-mail do lead com base legal de legítimo interesse; endereço só visível ao profissional
  atribuído; telefone nunca trafega no chat; retenção e exclusão por solicitação.
- **Auditoria**: toda mudança de preço, status de pedido e credenciamento gera evento imutável.
- **Multi-tenant de cidade**: cobertura, preço e SLA configuráveis por região sem deploy.
