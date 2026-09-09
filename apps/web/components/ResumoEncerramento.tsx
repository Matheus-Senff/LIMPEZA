'use client';

import { rotuloStatusPedido } from '@/lib/statusPedido';

export const STATUS_CANCELADO = [
  'cancelled_by_customer',
  'cancelled_by_professional',
  'no_show',
  'refunded',
];

export const STATUS_ENCERRADO = [...STATUS_CANCELADO, 'completed', 'rated'];

/** O chat só faz sentido enquanto o serviço está de pé. */
export function chatLiberado(status: string): boolean {
  return status === 'assigned' || status === 'in_progress';
}

export function Estrelas({ nota }: { nota: number }) {
  return (
    <div className="flex gap-1" aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= nota ? 'text-verde-600' : 'text-tinta-20'} aria-hidden="true">
          ★
        </span>
      ))}
    </div>
  );
}

/**
 * Fecha o pedido no lugar do chat: pedido cancelado mostra a justificativa
 * de quem cancelou; pedido concluído mostra a avaliação (estrelas e o
 * comentário do cliente) assim que ela existe.
 */
export function ResumoEncerramento({
  status,
  motivo,
  avaliacao,
}: {
  status: string;
  motivo: string | null;
  avaliacao: { rating: number; comment: string | null } | null;
}) {
  if (STATUS_CANCELADO.includes(status)) {
    return (
      <div className="cartao p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-tinta-50">{rotuloStatusPedido(status)}</h2>
        <p className="rotulo mt-4">Justificativa</p>
        <p className="mt-1 text-sm text-tinta-70">{motivo?.trim() || 'Nenhuma justificativa foi informada.'}</p>
      </div>
    );
  }

  if (!avaliacao) {
    // Sem chat e sem avaliação a tela ficava vazia depois do serviço — o
    // profissional não sabia se ainda ia ser avaliado ou não.
    if (status === 'completed') {
      return (
        <div className="cartao p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-tinta-50">Serviço concluído</h2>
          <p className="mt-2 text-sm text-tinta-70">Aguardando a avaliação do cliente.</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="cartao p-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-tinta-50">Avaliação do serviço</h2>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-2xl">
          <Estrelas nota={avaliacao.rating} />
        </span>
        <span className="text-sm font-bold numero">{avaliacao.rating} de 5</span>
      </div>
      {avaliacao.comment && <p className="mt-3 text-sm text-tinta-70">“{avaliacao.comment}”</p>}
    </div>
  );
}
