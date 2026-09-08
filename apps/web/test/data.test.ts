import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partesDaData } from '../lib/data.ts';

test('partesDaData usa o fuso de Brasília, não UTC', () => {
  // 21:00 em São Paulo (UTC-03) é 00:00 UTC do dia seguinte — tem que
  // continuar contando como o dia original, não o próximo.
  const r = partesDaData('2026-09-11T00:00:00.000Z');
  assert.equal(r.startDate, '2026-09-10');
  assert.equal(r.windowStart, '21:00:00');
  assert.equal(r.weekday, 4); // quinta-feira
});

test('partesDaData calcula o dia da semana certo', () => {
  const r = partesDaData('2026-09-08T13:00:00-03:00'); // terça-feira, 13h BRT
  assert.equal(r.weekday, 2);
  assert.equal(r.windowStart, '13:00:00');
  assert.equal(r.startDate, '2026-09-08');
});
