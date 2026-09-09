/**
 * Único lugar com a tradução do status do pedido — antes cada tela tinha
 * sua própria cópia parcial desse mapa, e as que esqueciam um status
 * (ex: cancelled_by_professional) mostravam o valor cru do banco em
 * inglês em vez de traduzido.
 */
export const ROTULO_STATUS_PEDIDO: Record<string, string> = {
  draft: 'Rascunho',
  pending_payment: 'Aguardando pagamento',
  searching_professional: 'Procurando profissional',
  assigned: 'Profissional confirmado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  rated: 'Avaliado',
  cancelled_by_customer: 'Cancelado pelo cliente',
  cancelled_by_professional: 'Cancelado pelo profissional',
  no_show: 'Profissional não compareceu',
  refunded: 'Reembolsado',
};

export function rotuloStatusPedido(status: string): string {
  return ROTULO_STATUS_PEDIDO[status] ?? status;
}
