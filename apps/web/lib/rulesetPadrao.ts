import type { Ruleset } from './pricing/types';

/**
 * Fallback usado quando o Supabase não está configurado (ex.: preview local
 * sem variáveis de ambiente). Mesmos números da região SP-CAPITAL no banco.
 * Em produção, quem manda é sempre o ruleset ativo vindo do Postgres.
 */
export const RULESET_PADRAO: Ruleset = {
  currency: 'BRL',
  hourAnchors: [
    { minutes: 210, cents: 13800 },
    { minutes: 240, cents: 14700 },
    { minutes: 270, cents: 15800 },
    { minutes: 300, cents: 17600 },
    { minutes: 330, cents: 18200 },
    { minutes: 360, cents: 19600 },
    { minutes: 390, cents: 20700 },
    { minutes: 420, cents: 22000 },
    { minutes: 450, cents: 22400 },
    { minutes: 480, cents: 23200 },
  ],
  frequencyMultipliers: { SINGLE: 1.0, WEEKLY: 0.885, BIWEEKLY: 0.905, MONTHLY: 0.92 },
  leadTimeMultipliers: [
    { maxDays: 0, factor: 1.259, label: 'Hoje (Plano Agora)' },
    { maxDays: 1, factor: 1.027, label: 'Amanhã' },
    { maxDays: 2, factor: 1.041, label: 'Depois de amanhã' },
    { maxDays: null, factor: 1.0, label: 'Programado' },
  ],
  windowMultipliers: [
    { from: '07:00', to: '07:59', factor: 1.099, label: 'Início da manhã' },
    { from: '08:00', to: '09:59', factor: 1.086, label: 'Manhã' },
    { from: '10:00', to: '12:59', factor: 1.04, label: 'Meio do dia' },
    { from: '13:00', to: '21:00', factor: 1.0, label: 'Tarde' },
  ],
  weekdayMultipliers: { '0': 1.08, '1': 1.0, '2': 1.0, '3': 1.0, '4': 1.0, '5': 1.02, '6': 1.06 },
  roomAdjustment: { bedroomOverBaseline: 0, baselineBedrooms: 2, baselineBathrooms: 1 },
  connectFeeCents: 0,
  payout: { hourCents: 2200, minCents: 7000, multiplier: 1.0 },
  loyaltyBonusCents: { preferred: 1500, recurring: 800 },
  rounding: { toCents: 100, mode: 'nearest' },
  limits: { minMinutes: 210, maxMinutes: 480, minLeadMinutes: 120, minutesBeforeFirstJob: 120 },
  allowedPaymentTypes: ['pix', 'credit_card'],
  servicesFrom: '07:00',
  servicesUntil: '21:00',
};
