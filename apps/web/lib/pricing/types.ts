export type ServiceCode =
  | 'CLEANING'
  | 'HEAVY_CLEANING'
  | 'PRE_MOVING_CLEANING'
  | 'POST_WORK_CLEANING'
  | 'BUSINESS_CLEANING'
  | 'IRONING'
  | 'FURNITURE_ASSEMBLY'
  | 'HOME_ASSISTANCE';

export type Frequency = 'SINGLE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type HomeType = 'HOUSE' | 'APARTMENT' | 'STUDIO' | 'COMMERCIAL';

export interface HourAnchor {
  minutes: number;
  cents: number;
}

export interface LeadTimeRule {
  /**
   * Limite superior da faixa em DIAS DE CALENDÁRIO de antecedência
   * (0 = hoje, 1 = amanhã…). `null` = catch-all.
   * Dias de calendário, e não horas: foi assim que o "Agora" se comportou
   * na medição — tudo que é hoje é caro, mesmo faltando 10 horas.
   */
  maxDays: number | null;
  factor: number;
  label: string;
}

export interface WindowRule {
  /** "HH:MM" no fuso da região. */
  from: string;
  to: string;
  factor: number;
  label: string;
}

export interface Ruleset {
  currency: 'BRL';
  hourAnchors: HourAnchor[];
  frequencyMultipliers: Record<Frequency, number>;
  leadTimeMultipliers: LeadTimeRule[];
  windowMultipliers: WindowRule[];
  /** 0 = domingo … 6 = sábado */
  weekdayMultipliers: Record<string, number>;
  roomAdjustment: {
    /** Acréscimo proporcional por quarto acima da linha de base. 0 = desligado. */
    bedroomOverBaseline: number;
    baselineBedrooms: number;
    baselineBathrooms: number;
  };
  connectFeeCents: number;
  payout: { hourCents: number; minCents: number; multiplier: number };
  loyaltyBonusCents: { preferred: number; recurring: number };
  rounding: { toCents: number; mode: 'nearest' | 'up' | 'down' };
  limits: {
    minMinutes: number;
    maxMinutes: number;
    minLeadMinutes: number;
    minutesBeforeFirstJob: number;
  };
  allowedPaymentTypes: Array<'pix' | 'credit_card'>;
  servicesFrom: string;
  servicesUntil: string;
}

export interface AddonDef {
  code: string;
  name: string;
  extraMinutes: number;
}

export interface QuoteInput {
  service: ServiceCode;
  /** Minutos-base escolhidos pelo cliente (sem os addons). */
  minutes: number;
  addons?: AddonDef[];
  frequency: Frequency;
  /** ISO 8601 com offset. Ausente = preço de vitrine (piso, sem surge de data). */
  scheduledAt?: string;
  /** Momento de referência para calcular antecedência. Default: agora. */
  now?: Date;
  homeType?: HomeType;
  bedrooms?: number;
  bathrooms?: number;
  /** Desconto aplicado ao cliente; NUNCA reduz o repasse. */
  couponPercent?: number;
  couponCents?: number;
  /** Ocorrência de assinatura atendida pelo profissional preferencial. */
  isPreferredProfessional?: boolean;
}

export interface BreakdownLine {
  step:
    | 'base'
    | 'frequency'
    | 'weekday'
    | 'window'
    | 'lead_time'
    | 'rooms'
    | 'connect_fee'
    | 'coupon'
    | 'rounding';
  label: string;
  factor?: number;
  amountCents: number;
}

export interface QuoteResult {
  currency: 'BRL';
  minutes: number;
  priceCents: number;
  payoutCents: number;
  loyaltyBonusCents: number;
  takeRate: number;
  breakdown: BreakdownLine[];
  inputHash: string;
  warnings: string[];
}

export class PricingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'PricingError';
    this.code = code;
  }
}
