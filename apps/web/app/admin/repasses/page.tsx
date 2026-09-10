'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { reais } from '@/lib/catalogo';

interface RepasseAdmin {
  id: string;
  order_id: string;
  base_cents: number;
  loyalty_bonus_cents: number;
  total_cents: number;
  available_at: string;
  paid: boolean;
  paid_at: string | null;
  professional: { full_name: string; pix_key: string | null } | null;
  order: { code: string } | null;
}

/**
 * Repasse manual: não existe integração bancária/Pix automática ainda —
 * essa tela só mostra quanto cada profissional tem a receber (calculado
 * sozinho pelo banco 2 dias depois do check-out, ver
 * fn_gerar_ganho_profissional) e deixa marcar como pago depois de
 * transferir por fora do sistema.
 */
export default function AdminRepasses() {
  const [repasses, setRepasses] = useState<RepasseAdmin[]>([]);
  const [filtro, setFiltro] = useState<'pendentes' | 'todos'>('pendentes');
  const [carregando, setCarregando] = useState(true);
  const [marcando, setMarcando] = useState<string | null>(null);

  async function carregar() {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    const { data } = await supabase
      .from('professional_earnings')
      .select(
        'id, order_id, base_cents, loyalty_bonus_cents, total_cents, available_at, paid, paid_at, professional:professional_id(full_name, pix_key), order:order_id(code)',
      )
      .order('available_at', { ascending: true });
    setRepasses((data as unknown as RepasseAdmin[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function marcarPago(id: string) {
    if (!supabase) return;
    setMarcando(id);
    await supabase
      .from('professional_earnings')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq('id', id);
    setMarcando(null);
    await carregar();
  }

  const filtrados = filtro === 'todos' ? repasses : repasses.filter((r) => !r.paid);
  const totalPendente = repasses.filter((r) => !r.paid).reduce((s, r) => s + r.total_cents, 0);

  return (
    <main className="bg-tinta-5 pb-16">
      <div className="container-app py-10">
        <p className="rotulo mb-1 text-tinta-50">Administração</p>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Repasses aos profissionais</h1>
        <p className="mb-8 text-sm text-tinta-50">
          {carregando ? 'Carregando…' : `${reais(totalPendente)} pendente de repasse`}
        </p>

        <div className="mb-5 flex gap-2">
          <button
            onClick={() => setFiltro('pendentes')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filtro === 'pendentes' ? 'bg-tinta-solida text-white' : 'bg-tinta-5 text-tinta-70'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFiltro('todos')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              filtro === 'todos' ? 'bg-tinta-solida text-white' : 'bg-tinta-5 text-tinta-70'
            }`}
          >
            Todos
          </button>
        </div>

        <section className="cartao p-6">
          {carregando ? (
            <p className="text-sm text-tinta-50">Carregando…</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-tinta-50">Nenhum repasse por aqui.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tinta-20 text-left">
                    <th className="py-2 pr-4 rotulo">Profissional</th>
                    <th className="py-2 pr-4 rotulo">Pedido</th>
                    <th className="py-2 pr-4 rotulo">Chave Pix</th>
                    <th className="py-2 pr-4 rotulo">Valor</th>
                    <th className="py-2 pr-4 rotulo">Disponível em</th>
                    <th className="py-2 rotulo">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((r) => (
                    <tr key={r.id} className="border-b border-tinta-10 last:border-0">
                      <td className="py-3 pr-4 font-semibold">{r.professional?.full_name ?? '—'}</td>
                      <td className="py-3 pr-4 numero">{r.order?.code ?? '—'}</td>
                      <td className="py-3 pr-4">
                        {r.professional?.pix_key ?? (
                          <span className="text-tinta-50">Não cadastrada</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-bold numero">{reais(r.total_cents)}</td>
                      <td className="py-3 pr-4 numero">
                        {new Date(r.available_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3">
                        {r.paid ? (
                          <span className="rounded-full bg-verde-50 px-2.5 py-1 text-xs font-bold text-verde-700">
                            Pago{r.paid_at ? ` em ${new Date(r.paid_at).toLocaleDateString('pt-BR')}` : ''}
                          </span>
                        ) : (
                          <button
                            onClick={() => marcarPago(r.id)}
                            disabled={marcando === r.id}
                            className="btn-verde !px-3 !py-1.5 !text-[11px]"
                          >
                            {marcando === r.id ? 'Marcando…' : 'Marcar como pago'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
