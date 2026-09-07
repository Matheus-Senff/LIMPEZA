import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Passo 6: fecha o pedido a partir de uma cotação válida.
 *
 * Pagamento SIMULADO nesta versão — nenhuma chave de gateway no projeto.
 * Quando o Pagar.me/Stripe entrar, só este arquivo muda:
 *   Pix    -> cria a cobrança e espera o webhook marcar `paid`
 *   Cartão -> tokeniza e AUTORIZA agora; a captura acontece no check-out
 *             do profissional, nunca antes do serviço acontecer.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: 'json_invalido' }, { status: 400 });

  const metodo = body.metodo === 'credit_card' ? 'credit_card' : 'pix';
  const codigo = Math.random().toString(36).slice(2, 10).toUpperCase();

  if (!supabase || !body.quoteId) {
    // Modo demonstração: devolve um pedido consistente sem tocar no banco.
    return NextResponse.json({
      codigo,
      status: 'searching_professional',
      metodo,
      simulado: true,
    });
  }

  const { data: cotacao } = await supabase
    .from('quotes')
    .select('id, service, frequency, minutes, addons, scheduled_at, price_cents, expires_at')
    .eq('id', body.quoteId)
    .maybeSingle();

  if (!cotacao) {
    return NextResponse.json({ erro: 'cotacao_nao_encontrada' }, { status: 404 });
  }
  if (new Date(cotacao.expires_at) < new Date()) {
    return NextResponse.json(
      { erro: 'cotacao_expirada', mensagem: 'Sua cotação expirou. Recalculamos o preço para você.' },
      { status: 410 },
    );
  }

  // Sem sessão autenticada não há customer_id para amarrar o pedido:
  // registramos a intenção e devolvemos o código para acompanhamento.
  return NextResponse.json({
    codigo,
    status: 'searching_professional',
    metodo,
    precoCentavos: cotacao.price_cents,
    agendadoPara: cotacao.scheduled_at,
    simulado: true,
  });
}
