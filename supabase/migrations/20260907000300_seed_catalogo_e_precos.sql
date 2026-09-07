-- =====================================================================
-- Seed: catálogo, addons, cobertura e ruleset de preço calibrado
-- Calibração: preços reais medidos no concorrente em SP (07/09/2026).
-- =====================================================================

insert into services (code, name, description, min_minutes, suggested_minutes, max_minutes,
                      brings_products, min_lead_minutes, sort_order) values
  ('CLEANING',            'Limpeza Padrão',       'Limpeza na medida certa para o dia a dia',           210, 240, 480, false, 120, 1),
  ('HEAVY_CLEANING',      'Limpeza Pesada',       'Limpeza profunda, com produtos inclusos',            240, 360, 600, true,  120, 2),
  ('PRE_MOVING_CLEANING', 'Limpeza Pré-mudança',  'Imóvel limpo e pronto para a chegada',               240, 360, 600, true,  1440, 3),
  ('POST_WORK_CLEANING',  'Limpeza Pós-obra',     'Remoção técnica de resíduos de obra',                360, 480, 720, false, 1440, 4),
  ('BUSINESS_CLEANING',   'Limpeza Comercial',    'Escritórios, lojas e consultórios',                  180, 240, 600, false, 120, 5),
  ('IRONING',             'Passadoria de Roupas', 'Roupas passadas, cuidadas e dobradas',               120, 180, 480, false, 120, 6),
  ('FURNITURE_ASSEMBLY',  'Montagem de Móveis',   'Montadores com ferramental próprio',                 120, 180, 480, false, 1440, 7),
  ('HOME_ASSISTANCE',     'Assistência Residencial', 'Chaveiro, eletricista, encanador, vidraceiro',     60,  60, 240, false,   0, 8);

insert into service_addons (code, name, extra_minutes, services, sort_order) values
  ('REFRIGERATOR',     'Interior da geladeira',        30,
     '{CLEANING,HEAVY_CLEANING,PRE_MOVING_CLEANING,POST_WORK_CLEANING}', 1),
  ('VACCUM_CARPET',    'Aspirar tapete ou estofado',   30,
     '{CLEANING,HEAVY_CLEANING}', 2),
  ('WASH_WINDOWS',     'Interior de janelas',          60,
     '{CLEANING,HEAVY_CLEANING,PRE_MOVING_CLEANING,POST_WORK_CLEANING,BUSINESS_CLEANING}', 3),
  ('CLEANUP_CABINETS', 'Interior de armário de cozinha', 60,
     '{CLEANING,HEAVY_CLEANING,PRE_MOVING_CLEANING}', 4),
  ('LAUNDRY',          'Lavar roupas',                 60,
     '{CLEANING,HEAVY_CLEANING}', 5),
  ('CLEANUP_EXTERNAL', 'Área externa (até 20 m²)',    120,
     '{CLEANING,HEAVY_CLEANING,POST_WORK_CLEANING}', 6),
  ('IRONING_ADDON',    'Passadoria de roupas',        120,
     '{CLEANING,HEAVY_CLEANING}', 7);

-- Cobertura inicial: capital paulista (benchmark) + Vale do Iguaçu/PR,
-- região onde o concorrente NÃO atende (CEP 83883-034 recusado).
insert into coverage_areas (region_code, city, state, zip_start, zip_end, services) values
  ('SP-CAPITAL', 'São Paulo',   'SP', '01000000', '05999999',
     '{CLEANING,HEAVY_CLEANING,PRE_MOVING_CLEANING,POST_WORK_CLEANING,BUSINESS_CLEANING,IRONING,FURNITURE_ASSEMBLY,HOME_ASSISTANCE}'),
  ('SP-CAPITAL', 'São Paulo',   'SP', '08000000', '08499999',
     '{CLEANING,HEAVY_CLEANING,BUSINESS_CLEANING,IRONING}'),
  ('PR-SUL',     'Rio Negro',   'PR', '83880000', '83889999',
     '{CLEANING,HEAVY_CLEANING,PRE_MOVING_CLEANING,BUSINESS_CLEANING,IRONING,FURNITURE_ASSEMBLY}'),
  ('PR-SUL',     'Mafra',       'SC', '89300000', '89309999',
     '{CLEANING,HEAVY_CLEANING,BUSINESS_CLEANING,IRONING}'),
  ('PR-CURITIBA','Curitiba',    'PR', '80000000', '82999999',
     '{CLEANING,HEAVY_CLEANING,PRE_MOVING_CLEANING,POST_WORK_CLEANING,BUSINESS_CLEANING,IRONING,FURNITURE_ASSEMBLY}');

-- ---------------------------------------------------------------------
-- Ruleset v1 — SP-CAPITAL / CLEANING
-- hourAnchors: preço-base (frequência SINGLE) por minutos, em centavos.
-- Derivado dos valores medidos em assinatura semanal / 0.885.
-- ---------------------------------------------------------------------
insert into pricing_rulesets (version, region_code, service, active, published_at, rules) values
(1, 'SP-CAPITAL', 'CLEANING', true, now(), '{
  "currency": "BRL",
  "hourAnchors": [
    { "minutes": 210, "cents": 13800 },
    { "minutes": 240, "cents": 14700 },
    { "minutes": 270, "cents": 15800 },
    { "minutes": 300, "cents": 17600 },
    { "minutes": 330, "cents": 18200 },
    { "minutes": 360, "cents": 19600 },
    { "minutes": 390, "cents": 20700 },
    { "minutes": 420, "cents": 22000 },
    { "minutes": 450, "cents": 22400 },
    { "minutes": 480, "cents": 23200 }
  ],
  "frequencyMultipliers": { "SINGLE": 1.0, "WEEKLY": 0.885, "BIWEEKLY": 0.905, "MONTHLY": 0.92 },
  "leadTimeMultipliers": [
    { "maxDays": 0,    "factor": 1.259, "label": "Agora (mesmo dia)" },
    { "maxDays": 1,    "factor": 1.027, "label": "Amanhã" },
    { "maxDays": 2,    "factor": 1.041, "label": "Depois de amanhã" },
    { "maxDays": null, "factor": 1.0,   "label": "Programado" }
  ],
  "windowMultipliers": [
    { "from": "07:00", "to": "07:59", "factor": 1.099, "label": "Início da manhã" },
    { "from": "08:00", "to": "09:59", "factor": 1.086, "label": "Manhã" },
    { "from": "10:00", "to": "12:59", "factor": 1.040, "label": "Meio do dia" },
    { "from": "13:00", "to": "21:00", "factor": 1.000, "label": "Tarde (mais barato)" }
  ],
  "weekdayMultipliers": { "0": 1.08, "1": 1.0, "2": 1.0, "3": 1.0, "4": 1.0, "5": 1.02, "6": 1.06 },
  "roomAdjustment": { "bedroomOverBaseline": 0.0, "baselineBedrooms": 2, "baselineBathrooms": 1 },
  "connectFeeCents": 0,
  "payout": { "hourCents": 2200, "minCents": 7000, "multiplier": 1.0 },
  "loyaltyBonusCents": { "preferred": 1500, "recurring": 800 },
  "rounding": { "toCents": 100, "mode": "nearest" },
  "limits": { "minMinutes": 210, "maxMinutes": 480, "minLeadMinutes": 120, "minutesBeforeFirstJob": 120 },
  "allowedPaymentTypes": ["pix", "credit_card"],
  "servicesFrom": "07:00",
  "servicesUntil": "21:00"
}'::jsonb);

-- Interior do Paraná: mesma estrutura, patamar ~22% menor e surge mais suave.
insert into pricing_rulesets (version, region_code, service, active, published_at, rules) values
(1, 'PR-SUL', 'CLEANING', true, now(), '{
  "currency": "BRL",
  "hourAnchors": [
    { "minutes": 210, "cents": 10800 },
    { "minutes": 240, "cents": 11500 },
    { "minutes": 270, "cents": 12300 },
    { "minutes": 300, "cents": 13700 },
    { "minutes": 330, "cents": 14200 },
    { "minutes": 360, "cents": 15300 },
    { "minutes": 390, "cents": 16100 },
    { "minutes": 420, "cents": 17200 },
    { "minutes": 450, "cents": 17500 },
    { "minutes": 480, "cents": 18100 }
  ],
  "frequencyMultipliers": { "SINGLE": 1.0, "WEEKLY": 0.88, "BIWEEKLY": 0.90, "MONTHLY": 0.92 },
  "leadTimeMultipliers": [
    { "maxDays": 0,    "factor": 1.18, "label": "Agora (mesmo dia)" },
    { "maxDays": 1,    "factor": 1.02, "label": "Amanhã" },
    { "maxDays": null, "factor": 1.0,  "label": "Programado" }
  ],
  "windowMultipliers": [
    { "from": "07:00", "to": "09:59", "factor": 1.05, "label": "Manhã" },
    { "from": "10:00", "to": "21:00", "factor": 1.00, "label": "Tarde (mais barato)" }
  ],
  "weekdayMultipliers": { "0": 1.10, "1": 1.0, "2": 1.0, "3": 1.0, "4": 1.0, "5": 1.02, "6": 1.05 },
  "roomAdjustment": { "bedroomOverBaseline": 0.0, "baselineBedrooms": 2, "baselineBathrooms": 1 },
  "connectFeeCents": 0,
  "payout": { "hourCents": 1900, "minCents": 6000, "multiplier": 1.0 },
  "loyaltyBonusCents": { "preferred": 1200, "recurring": 600 },
  "rounding": { "toCents": 100, "mode": "nearest" },
  "limits": { "minMinutes": 210, "maxMinutes": 480, "minLeadMinutes": 180, "minutesBeforeFirstJob": 180 },
  "allowedPaymentTypes": ["pix", "credit_card"],
  "servicesFrom": "07:00",
  "servicesUntil": "20:00"
}'::jsonb);
