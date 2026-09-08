const DIA_SEMANA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Extrai dia da semana, horário e data no fuso de Brasília (nunca em UTC). */
export function partesDaData(scheduledAt: string) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(scheduledAt));

  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';

  return {
    weekday: DIA_SEMANA[valor('weekday')] ?? 0,
    windowStart: `${valor('hour')}:${valor('minute')}:00`,
    startDate: `${valor('year')}-${valor('month')}-${valor('day')}`,
  };
}
