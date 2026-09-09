export type StatusChamado = 'open' | 'in_progress' | 'resolved' | 'closed';

export const ROTULO_STATUS_CHAMADO: Record<StatusChamado, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

export const COR_STATUS_CHAMADO: Record<StatusChamado, string> = {
  open: 'bg-azul-50 text-azul-700',
  in_progress: 'bg-tinta-10 text-tinta-70',
  resolved: 'bg-verde-50 text-verde-700',
  closed: 'bg-tinta-10 text-tinta-50',
};
