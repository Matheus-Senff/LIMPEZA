import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { priceGrid, quote } from '../src/index.ts';
import type { Ruleset } from '../src/types.ts';

const ruleset: Ruleset = JSON.parse(
  readFileSync(fileURLToPath(new URL('../fixtures/sp-capital-cleaning.json', import.meta.url)), 'utf8'),
);

/** Momento de referência das medições: seg 07/09/2026, 09:00 BRT. */
const NOW = new Date('2026-09-07T09:00:00-03:00');
const brl = (cents: number) => cents / 100;

const base = {
  service: 'CLEANING' as const,
  minutes: 240,
  bedrooms: 2,
  bathrooms: 1,
  homeType: 'HOUSE' as const,
  now: NOW,
};

// ---------------------------------------------------------------- vitrine
test('preço de vitrine reproduz os R$ 147 medidos (4h, diária única)', () => {
  const r = quote({ ...base, frequency: 'SINGLE' }, ruleset);
  assert.equal(brl(r.priceCents), 147);
  assert.ok(r.warnings.some((w) => w.includes('vitrine')));
});

test('multiplicadores de frequência reproduzem os preços medidos', () => {
  assert.equal(brl(quote({ ...base, frequency: 'WEEKLY' }, ruleset).priceCents), 130);
  assert.equal(brl(quote({ ...base, frequency: 'BIWEEKLY' }, ruleset).priceCents), 133);
  assert.equal(brl(quote({ ...base, frequency: 'MONTHLY' }, ruleset).priceCents), 135);
});

// -------------------------------------------------------------- curva de horas
test('curva de horas bate com a medição em assinatura semanal', () => {
  const esperado: Array<[number, number]> = [
    [210, 122], [240, 130], [270, 140], [300, 156], [330, 161],
    [360, 173], [390, 183], [420, 195], [450, 198], [480, 205],
  ];
  for (const [minutes, reais] of esperado) {
    const r = quote({ ...base, minutes, frequency: 'WEEKLY' }, ruleset);
    assert.equal(brl(r.priceCents), reais, `${minutes} min deveria custar R$ ${reais}`);
  }
});

test('interpolação linear entre âncoras (3h45 fica entre 3h30 e 4h)', () => {
  const r = quote({ ...base, minutes: 225, frequency: 'SINGLE' }, ruleset);
  assert.ok(r.priceCents > 13800 && r.priceCents < 14700);
});

test('abaixo do piso de horas o motor recusa', () => {
  assert.throws(
    () => quote({ ...base, minutes: 120, frequency: 'SINGLE' }, ruleset),
    /Duração mínima/,
  );
});

// --------------------------------------------------------------------- surge
test('mesmo dia aplica o "Agora" (+25,9%) — R$ 185 medidos', () => {
  const r = quote(
    { ...base, frequency: 'SINGLE', scheduledAt: '2026-09-07T13:00:00-03:00' },
    ruleset,
  );
  assert.equal(brl(r.priceCents), 185);
  assert.ok(r.breakdown.some((b) => b.step === 'lead_time' && b.factor === 1.259));
});

test('amanhã à tarde = R$ 151 e depois de amanhã = R$ 153 (medidos)', () => {
  assert.equal(
    brl(quote({ ...base, frequency: 'SINGLE', scheduledAt: '2026-09-08T14:30:00-03:00' }, ruleset).priceCents),
    151,
  );
  assert.equal(
    brl(quote({ ...base, frequency: 'SINGLE', scheduledAt: '2026-09-09T13:00:00-03:00' }, ruleset).priceCents),
    153,
  );
});

test('janelas da manhã de amanhã: 07:00 = R$ 166 e 08:00 = R$ 164 (medidos)', () => {
  assert.equal(
    brl(quote({ ...base, frequency: 'SINGLE', scheduledAt: '2026-09-08T07:00:00-03:00' }, ruleset).priceCents),
    166,
  );
  assert.equal(
    brl(quote({ ...base, frequency: 'SINGLE', scheduledAt: '2026-09-08T08:00:00-03:00' }, ruleset).priceCents),
    164,
  );
});

test('antecedência mínima bloqueia agendamento colado na hora', () => {
  assert.throws(
    () => quote({ ...base, frequency: 'SINGLE', scheduledAt: '2026-09-07T09:30:00-03:00' }, ruleset),
    /Antecedência mínima/,
  );
});

// -------------------------------------------------------------------- addons
test('addon empurra as horas e o preço sai da curva', () => {
  const semAddon = quote({ ...base, frequency: 'SINGLE' }, ruleset);
  const comGeladeira = quote(
    { ...base, frequency: 'SINGLE', addons: [{ code: 'REFRIGERATOR', name: 'Geladeira', extraMinutes: 30 }] },
    ruleset,
  );
  assert.equal(comGeladeira.minutes, 270);
  assert.ok(comGeladeira.priceCents > semAddon.priceCents);
  assert.equal(brl(comGeladeira.priceCents), 158);
});

test('soma de addons respeita o teto de horas do ruleset', () => {
  const r = quote(
    {
      ...base,
      minutes: 420,
      frequency: 'SINGLE',
      addons: [
        { code: 'CLEANUP_EXTERNAL', name: 'Área externa', extraMinutes: 120 },
        { code: 'IRONING_ADDON', name: 'Passadoria', extraMinutes: 120 },
      ],
    },
    ruleset,
  );
  assert.equal(r.minutes, 480);
  assert.ok(r.warnings.some((w) => w.includes('2 profissionais')));
});

// ------------------------------------------------------------------- repasse
test('repasse não muda com cupom nem com frequência', () => {
  const cheio = quote({ ...base, frequency: 'SINGLE' }, ruleset);
  const comCupom = quote({ ...base, frequency: 'SINGLE', couponPercent: 20 }, ruleset);
  const assinatura = quote({ ...base, frequency: 'WEEKLY' }, ruleset);

  assert.equal(cheio.payoutCents, 8800); // 4h × R$ 22
  assert.equal(comCupom.payoutCents, 8800);
  assert.equal(assinatura.payoutCents, 8800);
  assert.ok(comCupom.priceCents < cheio.priceCents);
});

test('piso de repasse protege serviços curtos', () => {
  const r = quote({ ...base, minutes: 210, frequency: 'SINGLE' }, ruleset);
  assert.ok(r.payoutCents >= ruleset.payout.minCents);
});

test('bônus de fidelização só existe em assinatura', () => {
  assert.equal(quote({ ...base, frequency: 'SINGLE' }, ruleset).loyaltyBonusCents, 0);
  assert.equal(
    quote({ ...base, frequency: 'WEEKLY', isPreferredProfessional: true }, ruleset).loyaltyBonusCents,
    1500,
  );
  assert.equal(quote({ ...base, frequency: 'WEEKLY' }, ruleset).loyaltyBonusCents, 800);
});

test('take rate cai conforme o bloco de horas cresce', () => {
  const curto = quote({ ...base, minutes: 240, frequency: 'SINGLE' }, ruleset);
  const longo = quote({ ...base, minutes: 480, frequency: 'SINGLE' }, ruleset);
  assert.ok(curto.takeRate > longo.takeRate);
});

// -------------------------------------------------------- grade de horários
test('priceGrid marca as janelas mais baratas ("Opções mais baratas")', () => {
  const slots = [
    '2026-09-08T07:00:00-03:00',
    '2026-09-08T08:00:00-03:00',
    '2026-09-08T14:00:00-03:00',
    '2026-09-08T15:00:00-03:00',
  ];
  const grid = priceGrid({ ...base, frequency: 'SINGLE' }, slots, ruleset);
  const baratos = grid.filter((g) => g.cheapest).map((g) => g.slot);
  assert.deepEqual(baratos, [
    '2026-09-08T14:00:00-03:00',
    '2026-09-08T15:00:00-03:00',
  ]);
});

// ------------------------------------------------------------ determinismo
test('mesmas entradas produzem o mesmo hash e o mesmo preço', () => {
  const a = quote({ ...base, frequency: 'SINGLE', scheduledAt: '2026-09-10T14:00:00-03:00' }, ruleset);
  const b = quote({ ...base, frequency: 'SINGLE', scheduledAt: '2026-09-10T14:00:00-03:00' }, ruleset);
  assert.equal(a.inputHash, b.inputHash);
  assert.equal(a.priceCents, b.priceCents);
});
