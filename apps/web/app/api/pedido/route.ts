import { NextResponse } from 'next/server';
import { clienteComToken, tokenDaRequisicao } from '@/lib/supabase';
import { partesDaData } from '@/lib/data';

export const runtime = 'nodejs';

/**
 * Passo 6: fecha o pedido a partir de uma cotação válida.
 *
 * O preço e o repasse usados aqui vêm da cotação assinada gravada em `quotes`
 * (nunca do corpo da requisição) — o valor mostrado na tela é o valor cobrado.
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
  const token = tokenDaRequisicao(req);
  const cliente = token ? clienteComToken(token) : null;

  if (!cliente || !body.quoteId) {
    // Sem sessão autenticada ou sem banco configurado: devolve um pedido
    // consistente sem gravar nada, para o funil continuar funcionando.
    return NextResponse.json({
      codigo,
      status: 'searching_professional',
      metodo,
      simulado: true,
    });
  }

  const {
    data: { user },
  } = await cliente.auth.getUser(token!);
  if (!user) {
    return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 });
  }

  const { data: cotacao } = await cliente
    .from('quotes')
    .select('id, service, frequency, minutes, addons, scheduled_at, price_cents, payout_cents, expires_at, consumed_at')
    .eq('id', body.quoteId)
    .maybeSingle();

  if (!cotacao) {
    return NextResponse.json({ erro: 'cotacao_nao_encontrada' }, { status: 404 });
  }
  if (cotacao.consumed_at) {
    return NextResponse.json({ erro: 'cotacao_ja_usada' }, { status: 410 });
  }
  if (new Date(cotacao.expires_at) < new Date()) {
    return NextResponse.json(
      { erro: 'cotacao_expirada', mensagem: 'Sua cotação expirou. Recalculamos o preço para você.' },
      { status: 410 },
    );
  }
  if (!cotacao.scheduled_at) {
    return NextResponse.json({ erro: 'sem_horario' }, { status: 422 });
  }

  const endereco = body.endereco ?? {};

  await cliente.from('customers').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });

  const { data: enderecoSalvo, error: erroEndereco } = await cliente
    .from('addresses')
    .insert({
      customer_id: user.id,
      zipcode: String(endereco.cep ?? '').replace(/\D/g, ''),
      street: endereco.rua ?? '',
      number: endereco.numero ?? '',
      complement: endereco.complemento || null,
      city: endereco.cidade ?? '',
      state: (endereco.estado ?? '').slice(0, 2),
      home_type: endereco.homeType ?? 'APARTMENT',
      bedrooms: Number(endereco.bedrooms ?? 2),
      bathrooms: Number(endereco.bathrooms ?? 1),
      access_notes: endereco.acesso || null,
    })
    .select('id')
    .single();

  if (erroEndereco || !enderecoSalvo) {
    return NextResponse.json({ erro: 'falha_endereco', mensagem: erroEndereco?.message }, { status: 422 });
  }

  const { data: pedidoSalvo, error: erroPedido } = await cliente
    .from('orders')
    .insert({
      customer_id: user.id,
      address_id: enderecoSalvo.id,
      quote_id: cotacao.id,
      service: cotacao.service,
      frequency: cotacao.frequency,
      minutes: cotacao.minutes,
      addons: cotacao.addons,
      scheduled_at: cotacao.scheduled_at,
      status: 'searching_professional',
      price_cents: cotacao.price_cents,
      payout_cents: cotacao.payout_cents,
    })
    .select('id, code')
    .single();

  if (erroPedido || !pedidoSalvo) {
    return NextResponse.json({ erro: 'falha_pedido', mensagem: erroPedido?.message }, { status: 422 });
  }

  // Assinatura (semanal/quinzenal/mensal): registra a recorrência de verdade,
  // não só o desconto no preço da primeira diária.
  if (cotacao.frequency !== 'SINGLE') {
    const { weekday, windowStart, startDate } = partesDaData(cotacao.scheduled_at);
    const assistencia =
      cotacao.frequency === 'WEEKLY' ? 'complete' : cotacao.frequency === 'BIWEEKLY' ? 'basic' : 'standard';
    const passoDias = cotacao.frequency === 'WEEKLY' ? 7 : cotacao.frequency === 'BIWEEKLY' ? 14 : 30;
    const proximaData = new Date(`${startDate}T00:00:00Z`);
    proximaData.setUTCDate(proximaData.getUTCDate() + passoDias);

    // A primeira diária já foi criada acima; next_run_date aponta pra
    // segunda ocorrência, que o job de assinaturas gera mais pra frente.
    const { data: assinatura } = await cliente
      .from('subscriptions')
      .insert({
        customer_id: user.id,
        address_id: enderecoSalvo.id,
        service: cotacao.service,
        frequency: cotacao.frequency,
        minutes: cotacao.minutes,
        addons: cotacao.addons,
        weekday,
        window_start: windowStart,
        assistance_level: assistencia,
        start_date: startDate,
        next_run_date: proximaData.toISOString().slice(0, 10),
      })
      .select('id')
      .single();

    if (assinatura) {
      await cliente.from('orders').update({ subscription_id: assinatura.id }).eq('id', pedidoSalvo.id);
    }
  }

  // Avisa na hora todo profissional que atende esse serviço na região —
  // mercado pequeno, oferta aberta pra quem quiser pegar primeiro.
  await cliente.rpc('fn_gerar_ofertas', { p_order_id: pedidoSalvo.id });

  return NextResponse.json({
    codigo: pedidoSalvo.code,
    status: 'searching_professional',
    metodo,
  });
}
