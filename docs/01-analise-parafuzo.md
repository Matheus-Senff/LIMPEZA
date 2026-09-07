# Análise de Engenharia Reversa — parafuzo.com

> Levantamento feito em 07/09/2026 navegando o site de produção.
> Todos os preços abaixo foram **medidos**, não estimados: CEP 01310-100 (Av. Paulista, São Paulo/SP),
> serviço Limpeza Padrão, imóvel tipo Casa, 2 quartos + 1 banheiro.

---

## 1. Arquitetura observada

| Camada | O que é | Evidência |
|---|---|---|
| Site institucional + funil | Next.js (`_next/static`, `_next/data/*.json`) atrás de Cloudflare + Netlify RUM | `parafuzo.com` |
| App autenticado | `app.parafuzo.com` (Next.js separado) | chunks carregados no domínio principal |
| API | **GraphQL** em `api.parafuzo.com/graphql` | string no bundle |
| Motor de preço | Bundle JS **externo e versionado**: `bundles.pricing-api.prod.parafuzo.com/latest.js` (~3,2 MB, UMD `window.Pricing`) | carregado no funil |
| Chat | Cloud Function GCP `us-east1-parafuzo-infra.cloudfunctions.net/chat-httpAuth` + `/api/chat-auth/` | funil e área logada |
| Admin | `admin.parafuzo.com/users/` | bundle |
| Portal do profissional | `profissionais.parafuzo.com/iframe` | bundle |
| Observabilidade | Sentry + `observability.parafuzo.dev` + PostHog (surveys, web_experiments, feature flags, product tours) | bundle |
| Ajuda | Base de conhecimento externa `parafuzo.kb.help` | links |
| Captação B2B | Typeform `parafuzo.typeform.com/to/pjyJ2GLe` | botão "Seja um parceiro" |

**Achado mais importante:** o preço **não é uma tabela no banco**. É um bundle JS que roda no cliente,
com regras encadeadas (classes `connect_fee`, `bring_products`, `parafuzo_now`, `antecedence`, `overrides`)
que recebem uma config remota e aplicam *deltas proporcionais* sobre um preço base. Cada regra devolve
`{ price, payout }` — ou seja, **o mesmo motor calcula o que o cliente paga e o que o profissional recebe**,
na mesma passada. Campos vistos na config: `payout_hour`, `payout_min`, `payout_multiplier`,
`price_multiplier`, `min_hours`, `max_hours`, `connect_fee`, `minutes_before_first_job`,
`antecedence_minutes`, `allowed_payment_types`, `services_from`, `services_until`,
e `overrides` por `city`, `region`, `neighborhood`, `zipcode`, `service_type`, `subscription_type`.

---

## 2. Catálogo de serviços e rotas

| Serviço | Rota | Disponibilidade anunciada |
|---|---|---|
| Limpeza Padrão | `/limpeza/contratar/padrao/` | hoje |
| Limpeza Pesada (inclui produtos) | `/limpeza/contratar/pesada/` | hoje |
| Passadoria de Roupas | `/limpeza/contratar/passar-roupa/` | hoje |
| Limpeza Pré-mudança (inclui produtos) | `/limpeza/contratar/pre-mudanca/` | amanhã |
| Limpeza Pós-obra | `/limpeza/contratar/pos-obra/` | amanhã |
| Limpeza Comercial (B2B) | `/limpeza-comercial/contratar/` | hoje |
| Montagem de Móveis | `/montagem-de-moveis/contratar/` | amanhã |
| Limpeza Express | `/limpeza-express/` | — |
| Assistência Residencial | `/assistencia-residencial/?term=home` | benefício de assinante |

Enums internos capturados no DOM: `CLEANING`, `HEAVY_CLEANING`, `BUSINESS_CLEANING`, `IRONING`
(+ pré-mudança, pós-obra e montagem no seletor).

---

## 3. O funil de contratação (6 passos)

O funil é **uma única página com acordeão** — não há navegação entre URLs. Cada etapa expande a
seguinte e o resumo de preço fica fixo numa coluna lateral (sticky). Isso mantém a URL estável,
preserva o estado e permite voltar a qualquer passo sem perder dados.

### Passo 1/6 — Serviço + imóvel + identificação
- Carrossel de 7 serviços (troca o serviço sem sair da página).
- Tipo de lar: `Casa | Apartamento | Studio`.
- Contadores de **quartos** (default 2) e **banheiros** (default 1). Texto: "Cozinha e sala já estão inclusos".
- Campos: **e-mail** e **CEP**. Botão **"Ver preço"**.
- **Validação de cobertura pelo CEP**: CEP 83883-034 (Rio Negro/PR) retorna
  `CEP inválido ou fora da área de atendimento da Parafuzo.` e o funil não avança.
  → o e-mail é capturado **antes** de mostrar preço: é o lead-gate do funil.

### Passo 2/6 — Itens opcionais + ajuste de horas
Cada opcional **adiciona horas** ao serviço; o preço é recalculado pela curva de horas.

| Opcional | Enum | Horas adicionadas | Preço (base R$ 147 / 4h, avulso) |
|---|---|---|---|
| Interior da geladeira | `REFRIGERATOR` | +0h30 | R$ 165 (+18) |
| Aspirar tapete ou estofado | `VACCUM_CARPET` | +0h30 | R$ 165 (+18) |
| Interior de janelas | `WASH_WINDOWS` | +1h00 | R$ 182 (+35) |
| Int. de armário de cozinha | `CLEANUP_CABINETS` | +1h00 | R$ 182 (+35) |
| Lavar roupas | `LAUNDRY` | +1h00 | R$ 182 (+35) |
| Área externa (até 20 m²) | `CLEANUP_EXTERNAL` | +2h00 | R$ 201 (+54) |
| Passadoria de roupas | `IRONING` | +2h00 | R$ 201 (+54) |

Stepper de horas manual em passos de **30 min**, com piso em 3h30 e texto de recomendação
("Sugerimos pelo menos 4h com 1 profissional para este serviço").

### Passo 3/6 — Frequência + data + horário
Quatro cards: `SINGLE`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`, com selos de marketing
"Até 20% OFF / até 15% OFF / até 7% OFF". Abaixo, tira de datas (3 visíveis + "Ver mais") e
grade de janelas de horário de 4h com passo de 30 min. Chip **"Opções mais baratas"** destaca os
horários de menor preço — o site **assume publicamente** a precificação dinâmica.

### Passos 4/6, 5/6 e 6/6 — não instrumentados
Ficam atrás do botão "Avançar" e exigem conta/checkout. Pelo material da empresa e pelo comportamento
do restante do funil: **cadastro/login → endereço completo → pagamento**.
Pagamento: **Pix liquidado no ato**; **cartão de crédito autorizado e capturado só depois do serviço**.

---

## 4. Preços medidos

### 4.1 Curva de horas (Limpeza Padrão, SP, assinatura semanal)

| Horas | Preço | R$/hora |
|---|---|---|
| 3h30 | R$ 122 | 34,86 |
| 4h00 | R$ 130 | 32,50 |
| 4h30 | R$ 140 | 31,11 |
| 5h00 | R$ 156 | 31,20 |
| 5h30 | R$ 161 | 29,27 |
| 6h00 | R$ 173 | 28,83 |
| 6h30 | R$ 183 | 28,15 |
| 7h00 | R$ 195 | 27,86 |
| 7h30 | R$ 198 | 26,40 |
| 8h00 | R$ 205 | 25,63 |

**Curva regressiva**: o valor/hora cai ~26% de 3h30 para 8h. Comprar bloco maior é premiado —
dilui o custo de deslocamento por hora vendida e aumenta o ticket.

### 4.2 Frequência (4h, sem data escolhida)

| Modalidade | Preço | Desconto real vs avulso | Selo anunciado |
|---|---|---|---|
| Diária única (`SINGLE`) | R$ 147 | — | — |
| Semanal (`WEEKLY`) | R$ 130 | **−11,6%** | "até 20% OFF" |
| Quinzenal (`BIWEEKLY`) | R$ 133 | **−9,5%** | "até 15% OFF" |
| Mensal (`MONTHLY`) | R$ 135 | **−8,2%** | "até 7% OFF" |

Os selos são teto ("até"), não o desconto praticado naquele CEP/data. O mensal chega a ter
desconto **maior** que o selo — sinal de que os percentuais vêm de `overrides` por região.

### 4.3 Data e horário (avulso, 4h)

| Seleção | Preço | Δ vs base |
|---|---|---|
| Sem data (preço de vitrine) | R$ 147 | — |
| **Hoje** (Parafuzo Now, seg 07) | **R$ 185** | **+25,9%** |
| Amanhã (ter 08) | R$ 151 | +2,7% |
| Depois de amanhã (qua 09) | R$ 153 | +4,1% |
| ter 08 · 07:00–11:00 | R$ 166 | +12,9% |
| ter 08 · 07:30–11:30 | R$ 166 | +12,9% |
| ter 08 · 08:00–12:00 | R$ 164 | +11,6% |
| ter 08 · 08:30–12:30 | R$ 164 | +11,6% |
| ter 08 · 09:00–13:00 | R$ 164 | +11,6% |
| ter 08 · 14:30–18:30 | R$ 151 | +2,7% |

Três camadas de surge somadas: **antecedência** (mesmo dia = Parafuzo Now), **dia da semana** e
**janela de horário** (manhã cara, tarde barata). O preço de vitrine (sem data) é o **piso** — sempre
sobe no passo 3. Nas janelas de hoje, o primeiro horário ofertado tinha ~2h de folga em relação à hora
corrente (`minutes_before_first_job` na config).

---

## 5. Mapa de cliques (para onde cada botão leva)

**Header**
`Meu Lar` ▸ menu com os 7 serviços · `Minha Empresa` ▸ Limpeza Comercial + Montagem ·
`Trabalhe no App` → `/trabalhe/` · `Indique e Ganhe` → `/saldo/` · `Ajuda` → `parafuzo.kb.help` ·
`Entrar` → `/autenticar/` · (logado) `Chat com profissional` → `/chat/`, `Suporte` → `/suporte/`.

**Home**
Card de serviço ▸ `AGENDAR SERVIÇO` → rota `/contratar/` do serviço ·
`Assistência Residencial` ▸ `SAIBA MAIS` → `/assistencia-residencial/?term=home` ·
Passos "Como contratar" ▸ todos os CTAs → âncora `/#servicos` ·
`Assinar plano` → `/limpeza/contratar/padrao/?frequency=WEEKLY` ·
`Quero este plano` → mesma rota com `?frequency=weekly|biweekly|monthly|single`
(**deep-link que pré-seleciona o passo 3 do funil**) ·
`SEJA UM PARCEIRO` → Typeform · `VISUALIZAR DÚVIDAS` → base de conhecimento ·
Selos → Reclame Aqui e Google Reviews.

**Rodapé**
`/confianca/`, `/cultura-organizacional/`, `/comunidade-parafuzo/`, `/condominios/`,
`blog.parafuzo.com`, `/cidades-atendidas/`, `/termos-de-uso/`, `/politicas-privacidade/`,
`/sitemap/`, `/protecao-de-dados-e-privacidade/`, `mailto:contato@parafuzo.com`.

---

## 6. Padrões de UX que valem copiar

1. **Preço antes do cadastro.** Só e-mail + CEP destravam o valor. Zero fricção, lead capturado.
2. **Acordeão de 6 passos numa página só**, com resumo de preço sticky sempre visível e recalculado ao vivo.
3. **Opcionais expressos em horas**, não em reais — o cliente entende o que compra e o profissional recebe tempo compatível.
4. **Transparência do surge** ("Opções mais baratas") — transforma preço dinâmico em senso de economia, não em suspeita.
5. **Prova social no topo do funil** (4.8 / 15.000 avaliações), não só na home.
6. **Deep-link de plano** vindo da home já com a frequência aplicada.
7. **Bloqueio antecipado por CEP**, com mensagem clara — ninguém chega ao checkout para descobrir que não é atendido.

## 7. Lacunas exploráveis

- **Cobertura**: Rio Negro/PR (e boa parte do interior Sul) está fora. O discurso de "200+ cidades" concentra-se em capitais.
- **Preço de vitrine ≠ preço final**: sobe de R$ 147 para R$ 151–185 ao escolher data/horário. Quem mostra o preço final antes ganha confiança.
- **Sem precificação por m²** — só por horas; imóveis grandes ficam subdimensionados.
- **Assistência Residencial** é promessa de assinatura, sem funil próprio de contratação avulsa.
