# Limpeza — Plataforma de Serviços Residenciais

Marketplace de serviços domésticos sob demanda: app do cliente, app do profissional e backoffice,
com **precificação dinâmica** calibrada em preços reais de mercado.

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

## Configuração

Copie `.env.example` para `.env` e preencha. **Nunca** comite `.env`, chaves de service role,
tokens de gateway ou credenciais — o `.gitignore` já bloqueia, mas a conferência é sua.
A `SUPABASE_SERVICE_ROLE_KEY` só existe no servidor e nas Edge Functions; no front-end, apenas a
chave publicável.

## Licença

Projeto privado. Todos os direitos reservados.
