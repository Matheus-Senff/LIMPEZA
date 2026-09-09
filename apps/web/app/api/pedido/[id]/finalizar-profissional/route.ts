import { NextResponse } from 'next/server';
import { clienteComToken, clienteServico, tokenDaRequisicao } from '@/lib/supabase';
import { stripeConfigurado, capturarPagamentoPedido } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Check-out do profissional: fecha o serviço (fn_check_out) e, se o
 * pagamento foi no cartão, captura de fato o valor autorizado na hora da
 * compra (ver criarSessaoCheckout em lib/stripe.ts). Pix já foi cobrado na
 * hora, não tem o que capturar — a função ignora isso sozinha.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = tokenDaRequisicao(req);
  const cliente = token ? clienteComToken(token) : null;
  if (!cliente) return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 });

  const { data: finalizado } = await cliente.rpc('fn_check_out', { p_order_id: id });
  if (!finalizado) {
    return NextResponse.json({ erro: 'nao_finalizavel' }, { status: 409 });
  }

  const servico = clienteServico();
  if (!stripeConfigurado || !servico) {
    return NextResponse.json({ finalizado: true });
  }

  const { capturado, erro } = await capturarPagamentoPedido(servico, id);
  return NextResponse.json({ finalizado: true, capturado, captura_erro: erro ?? null });
}
