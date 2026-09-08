'use client';

import { useState } from 'react';
import { Chat } from './Chat';

export function ChatPedido({ orderId, meuId }: { orderId: string; meuId: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="cartao p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Chat</h2>
        <button onClick={() => setAberto((a) => !a)} className="btn-contorno !px-4 !py-2 !text-xs">
          {aberto ? 'Fechar conversa' : 'Abrir conversa'}
        </button>
      </div>
      {aberto && (
        <div className="mt-4">
          <Chat orderId={orderId} meuId={meuId} />
        </div>
      )}
    </div>
  );
}
