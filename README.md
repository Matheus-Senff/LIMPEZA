# Plano Limpo — Plataforma de Serviços Residenciais

Marketplace de serviços domésticos sob demanda: app do cliente, app do profissional e backoffice,
com **precificação dinâmica** calibrada em preços reais de mercado.

**No ar:** https://plano-limpo-br-ee-zic.vercel.app
Todo push na `main` publica automaticamente (projeto Vercel `plano-limpo`, root `apps/web`).

Backend em **Supabase** (Postgres + Auth + RLS + Edge Functions).

---

## Estrutura

```
docs/                       análise de mercado, spec, fluxos, modelo de preço, roadmap
packages/pricing/           motor de precificação (TypeScript, sem dependências) + testes
supabase/migrations/        esquema, RLS, funções e seed
supabase/functions/quote/   Edge Function de cotação (cobertura + preço + cotação assinada)
```

## Documentação

| Documento | Conteúdo |
|---|---|
| [Análise de mercado](docs/01-analise-parafuzo.md) | engenharia reversa do líder do setor, com **preços medidos** e mapa do funil |
| [Spec unificada](docs/02-spec-unificada.md) | o que o produto é, catálogo, funil de 6 passos, requisitos |
| [Fluxos e telas](docs/03-fluxos-e-telas.md) | jornadas do cliente, do profissional e do backoffice + máquina de estados |
| [Modelo de precificação](docs/04-modelo-precificacao.md) | pipeline, curvas, multiplicadores e regras de repasse |
| [Roadmap](docs/05-roadmap.md) | fases de execução, métricas e riscos |

## Motor de precificação

Preço e repasse saem do **mesmo** cálculo, em uma passada:

```
curva de horas → frequência → dia → janela de horário → antecedência
              → taxa de conexão → overrides regionais → arredondamento
```

Regras ficam em `pricing_rulesets` (JSON versionado por região e serviço) — mudar preço de uma
cidade é `INSERT`, não deploy. Toda cotação é persistida com hash das entradas e validade de
30 minutos: **o preço mostrado é o preço cobrado**.

```bash
cd packages/pricing && npm test
```

Os 17 testes reproduzem, ao real, os preços praticados no mercado em set/2026
(R$ 147 avulso · R$ 130 semanal · R$ 185 no mesmo dia · R$ 166 na manhã seguinte).

## Banco de dados

24 tabelas com **RLS em todas**. Regras de acesso principais:

- O cliente só enxerga o que é dele.
- O profissional só vê o pedido que recebeu como oferta ou aceitou —
  **o endereço completo só é liberado após o aceite**.
- Telefone e e-mail nunca trafegam no chat (campo `redacted`).
- Regras de preço não são legíveis pelo client: só pelo service role, dentro da Edge Function.

Aplicar em um projeto novo:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
supabase functions deploy quote
```

## Aplicação web

```
apps/web/          Next.js 15 + Tailwind — cliente, profissional e backoffice
scripts/           sync do motor de preço para os pontos de consumo
```

| Rota | O que é |
|---|---|
| `/` | Home: catálogo, como contratar, assistência 24h, planos, depoimentos |
| `/contratar/[servico]` | Funil de 6 passos em acordeão, com resumo de preço fixo |
| `/conta` | Área do cliente: serviços, assinatura, assistência, indicações |
| `/profissional` | App do profissional: ofertas, agenda, ganhos + cadastro |
| `/admin` | Backoffice: cobertura, regras ativas e simulador de preço/margem |
| `/api/cobertura` · `/api/cotacao` · `/api/pedido` | Cotação e fechamento do pedido |

```bash
cd apps/web && npm install && npm run dev
```

Sem variáveis de ambiente o app continua funcionando: o funil cai para o ruleset
local e as telas internas mostram estado vazio.

### Deploy na Vercel

Projeto **`plano-limpo`** (time BReeZic), vinculado a este repositório, branch de produção `main`,
Root Directory `apps/web`. A configuração de build vive no `vercel.json` — os caminhos são
relativos ao Root Directory, porque é lá que a build roda.

As variáveis públicas do Supabase estão em `apps/web/.env.production`, versionado de propósito:
`NEXT_PUBLIC_*` chega ao browser em qualquer app Supabase, e quem protege os dados é o RLS.
A chave de service role não vive no repositório.

> O projeto antigo `limpeza` (domínio `limpeza-marketplace.vercel.app`) continua servindo outro
> app e **não** está ligado a este repositório: a API da Vercel vincula um repositório a um único
> projeto. Para reaproveitar aquele domínio, mova-o para `plano-limpo` pelo dashboard.

## Configuração

Copie `.env.example` para `.env` e preencha. **Nunca** comite `.env`, chaves de service role,
tokens de gateway ou credenciais — o `.gitignore` já bloqueia, mas a conferência é sua.
A `SUPABASE_SERVICE_ROLE_KEY` só existe no servidor e nas Edge Functions; no front-end, apenas a
chave publicável.

## Licença

Projeto privado. Todos os direitos reservados.
