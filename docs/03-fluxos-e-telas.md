# Fluxos e Telas

Três aplicações sobre a mesma base: **cliente**, **profissional** e **backoffice**.

---

## 1. Jornada do cliente — do preço ao pagamento

```mermaid
graph TD
  A([Cliente abre o funil]) --> B[1/6 Serviço + imóvel + e-mail/CEP]
  B --> C{CEP coberto?}
  C -- não --> C1[Bloqueia e captura o lead<br/>“avisamos quando chegarmos aí”]
  C -- sim --> D[(leads: e-mail, CEP, serviço)]
  D --> E[2/6 Opcionais + ajuste de horas<br/>cada opcional empurra minutos]
  E --> F[3/6 Frequência + data + horário<br/>grade com “opções mais baratas”]
  F --> G[(quotes: preço assinado, TTL 30 min)]
  G --> H[4/6 Login ou cadastro]
  H --> I[5/6 Endereço e instruções de acesso]
  I --> J{Pagamento}
  J -- Pix --> K[QR Code · liquidação imediata]
  J -- Cartão --> L[Tokenização · autoriza agora,<br/>captura no check-out]
  K --> M[(orders: searching_professional)]
  L --> M
  M --> N[Matching: preferencial > nota > distância]
  N --> O[(order_offers para os N melhores)]
  O --> P[Primeiro que aceita leva<br/>endereço liberado, chat aberto]
  P --> Q[Acompanhamento em tempo real<br/>a caminho · iniciado · concluído]
  Q --> R[Avaliação 1–5 + favoritar]
  R --> S([Fim])
```

### Telas do app do cliente

| Tela | Conteúdo | Detalhe que importa |
|---|---|---|
| Home | catálogo, prova social, planos | CTA de plano faz deep-link com `?frequency=` já aplicado |
| Funil (6 passos) | acordeão único, resumo sticky | preço recalculado a cada toque; nunca troca de URL |
| Meus serviços | próximos, histórico, recibos | permite remarcar dentro da política de cancelamento |
| Acompanhamento | status, perfil do profissional, chat | foto/nota só aparecem após a atribuição |
| Assinatura | pausar, pular semana, trocar profissional | pular ≠ cancelar — reduz churn |
| Assistência 24h | botão de emergência | nível de cobertura vem do plano |
| Indique e ganhe | código, saldo, extrato | crédito abate no próximo pedido |

---

## 2. Jornada do profissional

```mermaid
graph TD
  A([Cadastro]) --> B[Documentos + selfie + habilidades]
  B --> C{Análise}
  C -- reprovado --> C1[Feedback e nova tentativa]
  C -- aprovado --> D[Seguro ativo · perfil publicado]
  D --> E[Define agenda e raio de atendimento]
  E --> F[Feed de ofertas compatíveis]
  F --> G{Aceita?}
  G -- não --> F
  G -- sim --> H[(order.assigned · endereço liberado)]
  H --> I[Chat com o cliente · rota no mapa]
  I --> J[Check-in geolocalizado]
  J --> K[Execução · suporte 1 toque]
  K --> L[Check-out]
  L --> M[(captura do cartão + professional_earnings)]
  M --> N[Ganhos: base + bônus de fidelização]
  N --> O([Saldo disponível em D+2])
```

**Regras que o app precisa deixar explícitas**
- Endereço completo só após o aceite; telefone nunca é exibido.
- Check-out é o gatilho financeiro: captura o cartão e cria o ganho.
- Bônus de fidelização aparece na tela de ganhos, por cliente recorrente.
- Nota abaixo de 4,6 tira do feed até a reciclagem — informado com antecedência, nunca de surpresa.

---

## 3. Backoffice

| Módulo | O que resolve |
|---|---|
| Credenciamento | fila de análise, verificação de documentos, recheck periódico |
| Cobertura | faixas de CEP por região e serviço, ativação de cidade |
| Preços | editor de ruleset com **simulador lado a lado** e publicação versionada |
| Matching | pedidos sem profissional, reoferta manual, escalonamento |
| Financeiro | conciliação de pagamentos, lotes de repasse, margem por mês |
| Disputas | reembolso, taxa de cancelamento, reagendamento |
| Assistência | chamados abertos, despacho, custo coberto vs cobrado |

---

## 4. Máquina de estados do pedido

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> pending_payment: cotação aceita
  pending_payment --> searching_professional: Pix pago / cartão autorizado
  searching_professional --> assigned: profissional aceita
  searching_professional --> cancelled_by_customer: cliente desiste
  assigned --> in_progress: check-in
  assigned --> cancelled_by_professional: desistência (reoferta automática)
  assigned --> no_show: ninguém apareceu
  in_progress --> completed: check-out (captura do cartão)
  completed --> rated: avaliação enviada
  completed --> refunded: disputa procedente
  rated --> [*]
```

**Política de cancelamento (configurável por região)**
- Mais de 24h antes: sem taxa.
- Entre 24h e 4h: 30% do valor, integralmente repassado ao profissional.
- Menos de 4h ou no-show: 50%, integralmente repassado ao profissional.
- Cancelamento pelo profissional: sem custo ao cliente, reoferta automática e impacto no score.
