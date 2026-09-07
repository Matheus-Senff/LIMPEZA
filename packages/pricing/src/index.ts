import { PricingError } from './types.ts';
import type { BreakdownLine, QuoteInput, QuoteResult, Ruleset } from './types.ts';

export * from './types.ts';

/** Minutos totais = base escolhida + soma dos addons, respeitando os limites do ruleset. */
export function totalMinutes(input: QuoteInput, ruleset: Ruleset): number {
  const addonMinutes = (input.addons ?? []).reduce((s, a) => s + a.extraMinutes, 0);
  const raw = input.minutes + addonMinutes;
  const { minMinutes, maxMinutes } = ruleset.limits;
  if (raw < minMinutes) {
    throw new PricingError(
      'MIN_MINUTES',
      `Duração mínima de ${minMinutes / 60}h para este serviço.`,
    );
  }
  return Math.min(raw, maxMinutes);
}

/**
 * Preço-base pela curva de horas: interpolação linear entre âncoras.
 * Fora da faixa, extrapola pela inclinação do segmento da ponta —
 * nunca devolve preço menor que a primeira âncora.
 */
export function basePriceCents(minutes: number, ruleset: Ruleset): number {
  const anchors = [...ruleset.hourAnchors].sort((a, b) => a.minutes - b.minutes);
  if (anchors.length === 0) throw new PricingError('NO_ANCHORS', 'Ruleset sem curva de horas.');

  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (minutes <= first.minutes) return first.cents;
  if (minutes >= last.minutes) {
    const prev = anchors[anchors.length - 2] ?? first;
    const slope = (last.cents - prev.cents) / (last.minutes - prev.minutes || 1);
    return Math.round(last.cents + (minutes - last.minutes) * slope);
  }
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (minutes >= a.minutes && minutes <= b.minutes) {
      const t = (minutes - a.minutes) / (b.minutes - a.minutes);
      return Math.round(a.cents + t * (b.cents - a.cents));
    }
  }
  return last.cents;
}

function toMinutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Extrai hora/minuto/dia-da-semana respeitando o offset embutido no ISO. */
function localParts(iso: string): { minutesOfDay: number; weekday: number } {
  const m = iso.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?$/,
  );
  if (!m) throw new PricingError('BAD_DATE', `Data inválida: ${iso}`);
  const [, y, mo, d, hh, mi] = m;
  const minutesOfDay = Number(hh) * 60 + Number(mi);
  // Zeller via Date UTC apenas para o dia da semana da data local informada.
  const weekday = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay();
  return { minutesOfDay, weekday };
}

export function windowFactor(iso: string, ruleset: Ruleset) {
  const { minutesOfDay } = localParts(iso);
  const rule = ruleset.windowMultipliers.find(
    (w) => minutesOfDay >= toMinutesOfDay(w.from) && minutesOfDay <= toMinutesOfDay(w.to),
  );
  return rule ?? { factor: 1, label: 'Horário padrão', from: '', to: '' };
}

export function weekdayFactor(iso: string, ruleset: Ruleset) {
  const { weekday } = localParts(iso);
  return { factor: ruleset.weekdayMultipliers[String(weekday)] ?? 1, weekday };
}

/** Offset em minutos embutido no ISO (ex.: "-03:00" → -180). Default: -180 (BRT). */
function isoOffsetMinutes(iso: string): number {
  const m = iso.match(/(Z|[+-]\d{2}:?\d{2})$/);
  if (!m || m[1] === 'Z') return m ? 0 : -180;
  const sign = m[1][0] === '-' ? -1 : 1;
  const [h, mi] = m[1].slice(1).replace(':', '').match(/.{2}/g)!.map(Number);
  return sign * (h * 60 + mi);
}

/** Diferença em DIAS DE CALENDÁRIO no fuso do agendamento. */
export function calendarDaysAhead(iso: string, now: Date): number {
  const off = isoOffsetMinutes(iso) * 60_000;
  const dayOf = (t: number) => Math.floor((t + off) / 86_400_000);
  return dayOf(new Date(iso).getTime()) - dayOf(now.getTime());
}

export function leadTimeFactor(iso: string, ruleset: Ruleset, now: Date) {
  const minutesAhead = (new Date(iso).getTime() - now.getTime()) / 60_000;
  if (minutesAhead < ruleset.limits.minLeadMinutes) {
    throw new PricingError(
      'MIN_LEAD',
      `Antecedência mínima de ${ruleset.limits.minLeadMinutes} minutos.`,
    );
  }
  const days = calendarDaysAhead(iso, now);
  const rules = [...ruleset.leadTimeMultipliers].sort(
    (a, b) => (a.maxDays ?? Infinity) - (b.maxDays ?? Infinity),
  );
  return rules.find((r) => r.maxDays === null || days <= r.maxDays) ?? rules[rules.length - 1];
}

function applyRounding(cents: number, ruleset: Ruleset): number {
  const step = ruleset.rounding.toCents || 1;
  const q = cents / step;
  const rounded =
    ruleset.rounding.mode === 'up'
      ? Math.ceil(q)
      : ruleset.rounding.mode === 'down'
        ? Math.floor(q)
        : Math.round(q);
  return rounded * step;
}

/** Hash estável das entradas — amarra a cotação persistida ao que o cliente viu. */
export function hashInput(input: QuoteInput, rulesetVersion: number | string): string {
  const canonical = JSON.stringify({
    s: input.service,
    m: input.minutes,
    a: (input.addons ?? []).map((a) => a.code).sort(),
    f: input.frequency,
    d: input.scheduledAt ?? null,
    b: input.bedrooms ?? null,
    w: input.bathrooms ?? null,
    h: input.homeType ?? null,
    v: rulesetVersion,
  });
  let h = 5381;
  for (let i = 0; i < canonical.length; i++) h = ((h * 33) ^ canonical.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

/**
 * Motor de precificação: uma passada, dois números.
 * Sempre devolve `price` e `payout` — nenhum desconto ao cliente toca o repasse.
 */
export function quote(
  input: QuoteInput,
  ruleset: Ruleset,
  rulesetVersion: number | string = 1,
): QuoteResult {
  const warnings: string[] = [];
  const breakdown: BreakdownLine[] = [];
  const now = input.now ?? new Date();

  const minutes = totalMinutes(input, ruleset);
  if (
    (input.addons ?? []).reduce((s, a) => s + a.extraMinutes, input.minutes) >
    ruleset.limits.maxMinutes
  ) {
    warnings.push(
      `Duração limitada a ${ruleset.limits.maxMinutes / 60}h — considere 2 profissionais.`,
    );
  }

  let cents = basePriceCents(minutes, ruleset);
  breakdown.push({
    step: 'base',
    label: `${(minutes / 60).toFixed(1).replace('.0', '')}h de serviço`,
    amountCents: cents,
  });

  const applyFactor = (
    step: BreakdownLine['step'],
    label: string,
    factor: number,
  ) => {
    if (factor === 1) return;
    const before = cents;
    cents = cents * factor;
    breakdown.push({
      step,
      label,
      factor,
      amountCents: Math.round(cents - before),
    });
  };

  const freqFactor = ruleset.frequencyMultipliers[input.frequency] ?? 1;
  applyFactor(
    'frequency',
    {
      SINGLE: 'Diária única',
      WEEKLY: 'Assinatura semanal',
      BIWEEKLY: 'Assinatura quinzenal',
      MONTHLY: 'Assinatura mensal',
    }[input.frequency],
    freqFactor,
  );

  // Quartos acima da linha de base (desligado por padrão: o concorrente cobra por hora, não por cômodo)
  const ra = ruleset.roomAdjustment;
  if (ra.bedroomOverBaseline > 0 && (input.bedrooms ?? ra.baselineBedrooms) > ra.baselineBedrooms) {
    const extra = (input.bedrooms as number) - ra.baselineBedrooms;
    applyFactor('rooms', `${extra} quarto(s) adicional(is)`, 1 + extra * ra.bedroomOverBaseline);
  }

  if (input.scheduledAt) {
    const wd = weekdayFactor(input.scheduledAt, ruleset);
    applyFactor('weekday', 'Dia da semana', wd.factor);

    const win = windowFactor(input.scheduledAt, ruleset);
    applyFactor('window', win.label, win.factor);

    const lead = leadTimeFactor(input.scheduledAt, ruleset, now);
    applyFactor('lead_time', lead.label, lead.factor);
  } else {
    warnings.push('Preço de vitrine: sobe conforme a data e o horário escolhidos.');
  }

  if (ruleset.connectFeeCents > 0) {
    cents += ruleset.connectFeeCents;
    breakdown.push({
      step: 'connect_fee',
      label: 'Taxa de deslocamento',
      amountCents: ruleset.connectFeeCents,
    });
  }

  // Repasse sai do MESMO pipeline, antes de qualquer cupom.
  const payoutCents = Math.max(
    ruleset.payout.minCents,
    Math.round((minutes / 60) * ruleset.payout.hourCents * ruleset.payout.multiplier),
  );

  // Cupom: custo de marketing, nunca desconto no repasse.
  if (input.couponPercent || input.couponCents) {
    const discount =
      Math.round(cents * ((input.couponPercent ?? 0) / 100)) + (input.couponCents ?? 0);
    cents -= discount;
    breakdown.push({ step: 'coupon', label: 'Cupom', amountCents: -discount });
  }

  const beforeRounding = cents;
  cents = applyRounding(cents, ruleset);
  if (cents !== Math.round(beforeRounding)) {
    breakdown.push({
      step: 'rounding',
      label: 'Arredondamento',
      amountCents: Math.round(cents - beforeRounding),
    });
  }

  const priceCents = Math.max(cents, payoutCents); // trava dura: nunca vender abaixo do repasse
  if (priceCents !== cents) {
    warnings.push('Preço elevado ao piso do repasse — revise o cupom ou a regra da região.');
  }

  const loyaltyBonusCents =
    input.frequency === 'SINGLE'
      ? 0
      : input.isPreferredProfessional
        ? ruleset.loyaltyBonusCents.preferred
        : ruleset.loyaltyBonusCents.recurring;

  return {
    currency: 'BRL',
    minutes,
    priceCents,
    payoutCents,
    loyaltyBonusCents,
    takeRate: Number(((priceCents - payoutCents - loyaltyBonusCents) / priceCents).toFixed(4)),
    breakdown,
    inputHash: hashInput(input, rulesetVersion),
    warnings,
  };
}

/** Preço de vitrine (piso) usado no passo 1 do funil. */
export function showcasePrice(
  service: QuoteInput['service'],
  minutes: number,
  frequency: QuoteInput['frequency'],
  ruleset: Ruleset,
): number {
  return quote({ service, minutes, frequency }, ruleset).priceCents;
}

/** Grade de horários com o preço de cada janela — alimenta o chip "Opções mais baratas". */
export function priceGrid(
  input: Omit<QuoteInput, 'scheduledAt'>,
  slotsIso: string[],
  ruleset: Ruleset,
): Array<{ slot: string; priceCents: number; cheapest: boolean }> {
  const rows = slotsIso.map((slot) => {
    try {
      return { slot, priceCents: quote({ ...input, scheduledAt: slot }, ruleset).priceCents };
    } catch {
      return { slot, priceCents: Number.POSITIVE_INFINITY };
    }
  });
  const min = Math.min(...rows.map((r) => r.priceCents));
  return rows
    .filter((r) => Number.isFinite(r.priceCents))
    .map((r) => ({ ...r, cheapest: r.priceCents === min }));
}
