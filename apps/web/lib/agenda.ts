import type { Ruleset } from './pricing/types';

/** O Brasil não tem horário de verão desde 2019: offset fixo simplifica tudo. */
export const OFFSET_BR = '-03:00';

const paraMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const doisDigitos = (n: number) => String(n).padStart(2, '0');

export const dataISO = (d: Date) =>
  `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;

export interface Dia {
  iso: string;
  diaSemana: string;
  diaMes: string;
  hoje: boolean;
  mes: string;
}

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function proximosDias(quantidade = 21, aPartirDe = new Date()): Dia[] {
  const dias: Dia[] = [];
  for (let i = 0; i < quantidade; i++) {
    const d = new Date(aPartirDe);
    d.setDate(d.getDate() + i);
    dias.push({
      iso: dataISO(d),
      diaSemana: DIAS[d.getDay()],
      diaMes: doisDigitos(d.getDate()),
      mes: MESES[d.getMonth()],
      hoje: i === 0,
    });
  }
  return dias;
}

/**
 * Janelas de atendimento do dia. Regras espelhadas do mercado:
 * o serviço tem de caber antes do fechamento e, para hoje, respeitar a folga
 * mínima de deslocamento do profissional (`minutesBeforeFirstJob`).
 */
export function janelasDoDia(
  diaISO: string,
  duracaoMinutos: number,
  ruleset: Ruleset,
  agora = new Date(),
): string[] {
  const inicio = paraMinutos(ruleset.servicesFrom ?? '07:00');
  const fim = paraMinutos(ruleset.servicesUntil ?? '21:00');
  const ehHoje = diaISO === dataISO(agora);
  const minutoAtual = agora.getHours() * 60 + agora.getMinutes();
  const folga = ruleset.limits?.minutesBeforeFirstJob ?? 120;

  const janelas: string[] = [];
  for (let m = inicio; m + duracaoMinutos <= fim; m += 30) {
    if (ehHoje && m < minutoAtual + folga) continue;
    janelas.push(`${diaISO}T${doisDigitos(Math.floor(m / 60))}:${doisDigitos(m % 60)}:00${OFFSET_BR}`);
  }
  return janelas;
}

export const horaDaJanela = (iso: string) => iso.slice(11, 16);

export function faixaDaJanela(iso: string, duracaoMinutos: number) {
  const inicio = paraMinutos(horaDaJanela(iso));
  const fim = inicio + duracaoMinutos;
  return `${horaDaJanela(iso)} - ${doisDigitos(Math.floor(fim / 60) % 24)}:${doisDigitos(fim % 60)}`;
}

export function rotuloData(diaISO: string) {
  const [a, m, d] = diaISO.split('-').map(Number);
  const data = new Date(a, m - 1, d);
  const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  return { diaSemana: nomes[data.getDay()], extenso: `${d} de ${meses[m - 1]}` };
}

/**
 * Data e hora por extenso, no fuso de Brasília — usado nas telas de
 * detalhe do pedido, onde o dia/horário do serviço é a informação mais
 * importante da tela.
 */
export function dataHoraPorExtenso(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? '';
  const diaSemana = valor('weekday');
  const diaSemanaComMaiuscula = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

  return `${diaSemanaComMaiuscula}, ${valor('day')} de ${valor('month')} de ${valor('year')}, às ${valor('hour')}:${valor('minute')}`;
}
