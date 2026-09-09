-- Torna o catálogo de serviços editável pelo admin. `services` e
-- `service_addons` já existiam prontas (com RLS e tudo) mas nunca foram
-- usadas — o app inteiro lia de um arquivo TypeScript fixo. Esta migration
-- completa as colunas que faltavam e semeia com o texto que já está no ar
-- hoje, pra nada mudar visualmente no momento em que o app passar a ler
-- daqui.

alter table services
  add column if not exists slug text,
  add column if not exists short_name text,
  add column if not exists tagline text,
  add column if not exists audience text not null default 'HOME' check (audience in ('HOME', 'BUSINESS')),
  add column if not exists availability text not null default 'TODAY' check (availability in ('TODAY', 'TOMORROW')),
  add column if not exists included text[] not null default '{}',
  add column if not exists not_included text[] not null default '{}';

create unique index if not exists services_slug_idx on services(slug);

update services set
  slug = v.slug, short_name = v.short_name, tagline = v.tagline, description = v.description,
  audience = v.audience, availability = v.availability, included = v.included, not_included = v.not_included
from (values
  ('CLEANING', 'padrao', 'Limpeza' || chr(10) || 'Padrão', 'Limpeza na medida certa para as necessidades do dia a dia',
   'A Limpeza Padrão tem a quantidade de horas e as tarefas ideais para manter a sua rotina em ordem.',
   'HOME', 'TODAY',
   array['Varrer, aspirar e passar pano em todos os cômodos contratados','Limpeza completa de banheiros','Cozinha: pia, fogão, bancada e parte externa dos armários','Tirar o pó de móveis e superfícies','Arrumar camas com roupa de cama limpa disponível','Recolher o lixo'],
   array['Limpeza de vidros externos ou em altura','Cuidado com crianças, idosos ou animais','Mover móveis pesados']),
  ('HEAVY_CLEANING', 'pesada', 'Limpeza' || chr(10) || 'Pesada', 'Limpeza com tudo que seu lar precisa para ficar brilhando',
   'Limpeza profunda, para quando a casa precisa de mais do que a manutenção do dia a dia. O profissional leva os produtos.',
   'HOME', 'TODAY',
   array['Tudo da Limpeza Padrão','Produtos de limpeza inclusos','Rodapés, portas e interruptores','Azulejos e box do banheiro com remoção de encardido','Atrás e embaixo de móveis leves'],
   array['Limpeza pós-obra','Lavagem de estofados com máquina','Vidros em altura']),
  ('IRONING', 'passar-roupa', 'Passadoria' || chr(10) || 'de Roupas', 'Suas roupas bem passadas, cuidadas e dobradas',
   'Um profissional dedicado só a passar, dobrar e organizar as suas roupas pelo tempo que você contratar.',
   'HOME', 'TODAY',
   array['Passar as peças separadas por você','Dobrar e organizar','Pendurar o que não pode ser dobrado'],
   array['Lavagem das peças','Costura ou ajustes','Passar peças delicadas sem instrução']),
  ('FURNITURE_ASSEMBLY', 'montagem-de-moveis', 'Montagem' || chr(10) || 'de móveis', 'Montadores qualificados para montar todo tipo de móvel',
   'Montadores com ferramental próprio para armários, guarda-roupas, camas, estantes e escritório.',
   'HOME', 'TOMORROW',
   array['Montagem com ferramentas próprias','Conferência das peças antes de começar','Recolhimento das embalagens'],
   array['Furação de parede estrutural','Instalação elétrica','Peças faltantes do fabricante']),
  ('PRE_MOVING_CLEANING', 'pre-mudanca', 'Limpeza' || chr(10) || 'Pré-mudança', 'Seu imóvel limpo e pronto para a chegada ao novo lar',
   'Para imóvel vazio, antes de a mudança entrar. O profissional leva os produtos.',
   'HOME', 'TOMORROW',
   array['Limpeza profunda com o imóvel vazio','Interior de armários embutidos','Janelas pelo lado interno','Produtos inclusos'],
   array['Remoção de entulho de obra','Limpeza de fachada']),
  ('POST_WORK_CLEANING', 'pos-obra', 'Limpeza' || chr(10) || 'Pós-obra', 'Serviço especializado para imóveis recém reformados',
   'Remoção de poeira fina, respingos de tinta e resíduos leves de construção.',
   'HOME', 'TOMORROW',
   array['Remoção de poeira fina de todas as superfícies','Respingos de tinta, gesso e cimento em pisos','Limpeza de janelas e esquadrias pelo lado interno'],
   array['Retirada de entulho pesado','Trabalho em altura','Uso de produtos ácidos fortes']),
  ('BUSINESS_CLEANING', 'comercial', 'Limpeza' || chr(10) || 'Comercial', 'Para escritórios, consultórios, lojas e salas comerciais',
   'Atendimento para empresas, com nota fiscal e possibilidade de contrato recorrente.',
   'BUSINESS', 'TODAY',
   array['Limpeza de estações de trabalho e áreas comuns','Banheiros e copa','Recolhimento de lixo e reposição de descartáveis fornecidos'],
   array['Limpeza de fachada','Serviços em altura','Manutenção predial']),
  ('HOME_ASSISTANCE', 'assistencia', 'Assistência' || chr(10) || 'Residencial', 'Encanador, eletricista, chaveiro, vidraceiro e mais',
   'Emergência doméstica resolvida com profissional credenciado. Grátis para assinantes, avulso para quem precisar.',
   'HOME', 'TOMORROW',
   array['Visita técnica','Diagnóstico do problema','Reparo emergencial de pequeno porte'],
   array['Peças e materiais','Obras estruturais','Projetos e ART'])
) as v(code, slug, short_name, tagline, description, audience, availability, included, not_included)
where services.code = v.code::service_code;

-- Os 7 serviços sem linha própria em pricing_rulesets vinham caindo no
-- RULESET_PADRAO fixo no código (fallback do /api/cotacao quando não acha
-- regra ativa) — sem perceber, era esse número genérico que valia pra eles,
-- não os números do CLEANING. Semeia com o EXATO mesmo valor do fallback
-- (não o do CLEANING, que é outra régua) pra não mudar nenhum preço que já
-- está no ar — só torna editável o que já valia escondido no código.
insert into pricing_rulesets (region_code, service, version, active, rules)
select 'PR-SUL', s.code, 1, true, jsonb_set(jsonb_set('{
  "currency": "BRL",
  "hourAnchors": [
    {"minutes":210,"cents":13800},{"minutes":240,"cents":14700},{"minutes":270,"cents":15800},
    {"minutes":300,"cents":17600},{"minutes":330,"cents":18200},{"minutes":360,"cents":19600},
    {"minutes":390,"cents":20700},{"minutes":420,"cents":22000},{"minutes":450,"cents":22400},
    {"minutes":480,"cents":23200}
  ],
  "frequencyMultipliers": {"SINGLE":1.0,"WEEKLY":0.885,"BIWEEKLY":0.905,"MONTHLY":0.92},
  "leadTimeMultipliers": [
    {"maxDays":0,"factor":1.259,"label":"Hoje (Plano Agora)"},
    {"maxDays":1,"factor":1.027,"label":"Amanhã"},
    {"maxDays":2,"factor":1.041,"label":"Depois de amanhã"},
    {"maxDays":null,"factor":1.0,"label":"Programado"}
  ],
  "windowMultipliers": [
    {"from":"07:00","to":"07:59","factor":1.099,"label":"Início da manhã"},
    {"from":"08:00","to":"09:59","factor":1.086,"label":"Manhã"},
    {"from":"10:00","to":"12:59","factor":1.04,"label":"Meio do dia"},
    {"from":"13:00","to":"21:00","factor":1.0,"label":"Tarde"}
  ],
  "weekdayMultipliers": {"0":1.08,"1":1.0,"2":1.0,"3":1.0,"4":1.0,"5":1.02,"6":1.06},
  "roomAdjustment": {"bedroomOverBaseline":0,"baselineBedrooms":2,"baselineBathrooms":1},
  "connectFeeCents": 0,
  "payout": {"hourCents":2200,"minCents":7000,"multiplier":1.0},
  "loyaltyBonusCents": {"preferred":1500,"recurring":800},
  "rounding": {"toCents":100,"mode":"nearest"},
  "limits": {"minMinutes":210,"maxMinutes":480,"minLeadMinutes":120,"minutesBeforeFirstJob":120},
  "allowedPaymentTypes": ["pix","credit_card"],
  "servicesFrom": "07:00",
  "servicesUntil": "21:00"
}'::jsonb, '{limits,minMinutes}', to_jsonb(s.min_minutes)), '{limits,maxMinutes}', to_jsonb(s.max_minutes))
  from services s
 where not exists (
   select 1 from pricing_rulesets pr where pr.region_code = 'PR-SUL' and pr.service = s.code
 );
