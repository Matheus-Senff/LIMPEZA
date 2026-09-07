# Modelo de Precificação Dinâmica

Calibrado com os preços reais medidos no Parafuzo (SP, Limpeza Padrão, casa 2q/1b, 07/09/2026).
A implementação de referência está em `packages/pricing/` e as tabelas em
`supabase/migrations/*_pricing.sql`.

---

## 1. Princípios

1. **Uma passada, dois números.** O motor devolve sempre `{ price, payout }`. Nenhum desconto ao
   cliente reduz o repasse do profissional por acidente — a margem é explícita no `breakdown`.
2. **Config, não código.** Curvas, multiplicadores e overrides ficam em tabelas versionadas
   (`pricing_rulesets`). Trocar preço de uma cidade é `INSERT`, não deploy.
3. **Cotação assinada.** Todo preço exibido vira uma linha em `quotes` com hash das entradas e
   validade (30 min). O checkout **só** aceita `quote_id` — o cliente nunca paga um preço recalculado.
4. **Determinismo.** Mesmas entradas + mesmo `ruleset_version` ⇒ mesmo centavo. Indispensável para
   auditoria, disputa e teste.

---

## 2. Pipeline

```
1. curva de horas       base(serviço, região, horas)        → ancoragem + interpolação linear
2. frequência           × freq_multiplier                    SINGLE 1.00 · WEEKLY 0.885 · BIWEEKLY 0.905 · MONTHLY 0.920
3. dia                  × day_multiplier                     por dia da semana / feriado / calendário de demanda
4. janela de horário    × window_multiplier                  manhã 1.10 · meio-da-manhã 1.086 · tarde 1.00
5. antecedência         × lead_time_multiplier               por DIA DE CALENDÁRIO: D+0 1.26 · D+1 1.03 · D+2 1.04 · ≥D+3 1.00
6. taxa de conexão      + connect_fee                        por serviço/região (hoje 0)
7. overrides            zipcode > neighborhood > city > region > global
8. arredondamento       real inteiro (ceil no cliente, floor no payout)
```

Multiplicadores são **multiplicativos entre si** e aplicados sobre o preço base — foi assim que
o comportamento observado se reproduziu (mesmo dia + manhã compõem).

---

## 3. Curva de horas (ancoragem calibrada)

Preço-base para `SINGLE`, região `SP-CAPITAL`, serviço `CLEANING`
(derivado dos valores medidos em assinatura semanal, normalizados por `1 / 0.885`):

| Horas | Base R$ (SINGLE) | Medido semanal | R$/hora |
|---|---|---|---|
| 3,5 | 138 | 122 | 39,4 |
| 4,0 | 147 | 130 | 36,8 |
| 4,5 | 158 | 140 | 35,1 |
| 5,0 | 176 | 156 | 35,2 |
| 5,5 | 182 | 161 | 33,1 |
| 6,0 | 196 | 173 | 32,7 |
| 6,5 | 207 | 183 | 31,8 |
| 7,0 | 220 | 195 | 31,4 |
| 7,5 | 224 | 198 | 29,9 |
| 8,0 | 232 | 205 | 29,0 |

Entre âncoras: **interpolação linear**. Fora da faixa: extrapola pela inclinação da última dupla,
respeitando `min_hours` e `max_hours` do serviço.

**Leitura de negócio:** a curva é regressiva de propósito. Uma aproximação de bolso é
`preço ≈ R$ 55 de deslocamento + R$ 18,75/hora` — o custo fixo de ir até a casa é diluído
em blocos maiores, e é isso que faz a 8ª hora custar 26% menos que a 4ª.

---

## 4. Multiplicadores calibrados

### 4.1 Frequência (medido a 4h)

| Modalidade | Preço medido | Multiplicador | Selo de marketing |
|---|---|---|---|
| `SINGLE` | R$ 147 | 1,000 | — |
| `WEEKLY` | R$ 130 | 0,885 | "até 20% OFF" |
| `BIWEEKLY` | R$ 133 | 0,905 | "até 15% OFF" |
| `MONTHLY` | R$ 135 | 0,920 | "até 7% OFF" |

### 4.2 Antecedência (medido, avulso 4h)

| Quando | Preço medido | Multiplicador |
|---|---|---|
| Hoje (**"Agora"**, D+0) | R$ 185 | 1,259 |
| Amanhã (D+1) | R$ 151 | 1,027 |
| D+2 | R$ 153 | 1,041 |
| D+3 ou mais | R$ 147 (vitrine) | 1,000 |

### 4.3 Janela de horário (medido em D+1, sobre a base do dia)

| Janela | Preço medido | Multiplicador |
|---|---|---|
| 07:00 / 07:30 | R$ 166 | 1,099 |
| 08:00 – 09:30 | R$ 164 | 1,086 |
| 13:00 – 18:30 | R$ 151 | 1,000 |

O chip **"Opções mais baratas"** marca as janelas com multiplicador 1,00 — o desconto vira benefício
percebido em vez de penalidade escondida.

### 4.4 Addons (tempo, não dinheiro)

| Addon | +min | Efeito medido (base 147/4h) |
|---|---|---|
| Geladeira, aspirar tapete | +30 | R$ 165 |
| Janelas, armário, lavar roupa | +60 | R$ 182 |
| Área externa, passadoria | +120 | R$ 201 |

O addon **não tem preço próprio**: ele empurra as horas e o preço sai da curva. Isso garante que o
profissional seja pago pelo tempo real e elimina a discussão de "cobrou a mais pelo extra".

---

## 5. Repasse ao profissional

```
payout = max(payout_min, horas × payout_hour × payout_multiplier)
bônus_fidelização = aplicado quando order.subscription_id != null e o profissional é o preferencial
take_rate = (price − payout − bônus) / price
```

Referência inicial sugerida (calibrável por região): `payout_hour = R$ 22,00`,
`payout_min = R$ 70,00`, `payout_multiplier = 1,00`, bônus de fidelização de R$ 8 a R$ 15 por diária
recorrente. Com a curva acima isso dá take rate de ~34% em 4h e ~24% em 8h — margem maior no ticket
curto, que é o mais caro de operar.

**Regra dura:** promoções e cupons alteram `price`, nunca `payout`. Cupom vira linha de custo de
marketing no `breakdown`.

---

## 6. Overrides e cobertura

Resolução em cascata, o mais específico vence:

`zipcode` → `neighborhood` → `city` → `region` → `global`

Cada override pode redefinir: curva de horas, qualquer multiplicador, `connect_fee`,
`payout_hour`, `min_hours`/`max_hours`, `allowed_payment_types`, `services_from`/`services_until`
(horário de operação) e `minutes_before_first_job` (folga mínima para o "Agora").

CEP fora de `coverage_areas` bloqueia o passo 1 com mensagem explícita — como o concorrente faz com
Rio Negro/PR.

---

## 7. Contrato do motor

```ts
quote({
  service: 'CLEANING',
  hours: 4,
  addons: ['REFRIGERATOR'],
  frequency: 'SINGLE',
  zipcode: '01310100',
  scheduledAt: '2026-09-08T07:00:00-03:00',
  homeType: 'HOUSE', bedrooms: 2, bathrooms: 1,
}) -> {
  price: 18200, payout: 11000, currency: 'BRL',
  hours: 4.5, rulesetVersion: 3, expiresAt: '...',
  breakdown: [
    { step: 'base',       label: 'Limpeza Padrão · 4h30', amount: 15800 },
    { step: 'frequency',  label: 'Diária única',          factor: 1.0 },
    { step: 'window',     label: 'Manhã (07:00)',         factor: 1.099, amount: +1564 },
    { step: 'lead_time',  label: 'Amanhã',                factor: 1.027, amount: +473 },
    { step: 'rounding',   amount: -35 },
  ],
}
```

Valores sempre em **centavos inteiros**. Nunca `float` no banco.
