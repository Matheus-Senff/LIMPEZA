'use client';

import { Chat } from './Chat';

export function ChatPedido({
  orderId,
  meuId,
  meuNome,
  outroNome,
}: {
  orderId: string;
  meuId: string;
  meuNome: string;
  outroNome: string;
}) {
  return (
    <div className="cartao p-4">
      <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-wide text-tinta-50">Chat</h2>
      <Chat orderId={orderId} meuId={meuId} meuNome={meuNome} outroNome={outroNome} />
    </div>
  );
}
