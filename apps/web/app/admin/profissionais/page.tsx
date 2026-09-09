'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Credenciamento = 'pending' | 'in_review' | 'approved' | 'suspended' | 'blocked';

interface ProfissionalAdmin {
  id: string;
  document: string;
  accreditation_status: Credenciamento;
  rating_avg: number;
  rating_count: number;
  completed_orders: number;
  full_name: string;
  email: string;
}

const STATUS_CREDENCIAMENTO: Record<Credenciamento, string> = {
  pending: 'Em análise',
  in_review: 'Documentos em verificação',
  approved: 'Aprovado',
  suspended: 'Suspenso',
  blocked: 'Bloqueado',
};

const CORES_STATUS: Record<Credenciamento, string> = {
  pending: 'bg-tinta-10 text-tinta-70',
  in_review: 'bg-azul-50 text-azul-700',
  approved: 'bg-verde-50 text-verde-700',
  suspended: 'bg-tinta-10 text-tinta-70',
  blocked: 'bg-tinta-solida text-white',
};

export default function AdminProfissionais() {
  const [profissionais, setProfissionais] = useState<ProfissionalAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | Credenciamento>('todos');
  const [atualizando, setAtualizando] = useState<string | null>(null);

  async function carregar() {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    const { data } = await supabase
      .from('professionals')
      .select('id, document, accreditation_status, rating_avg, rating_count, completed_orders, profiles(full_name, email)')
      .order('created_at', { ascending: false });
    setProfissionais(
      ((data ?? []) as unknown as {
        id: string;
        document: string;
        accreditation_status: Credenciamento;
        rating_avg: number;
        rating_count: number;
        completed_orders: number;
        profiles: { full_name: string; email: string } | null;
      }[]).map((row) => ({
        id: row.id,
        document: row.document,
        accreditation_status: row.accreditation_status,
        rating_avg: row.rating_avg,
        rating_count: row.rating_count,
        completed_orders: row.completed_orders,
        full_name: row.profiles?.full_name ?? '—',
        email: row.profiles?.email ?? '—',
      })),
    );
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  // O martelo final é a RPC fn_definir_credenciamento — ela confere de novo,
  // no banco, que quem está chamando é mesmo a conta admin. Não existe
  // caminho de UPDATE direto na tabela para ninguém, nem para esta tela.
  async function definirStatus(id: string, status: Credenciamento) {
    if (!supabase) return;
    setAtualizando(id);
    const { data: ok } = await supabase.rpc('fn_definir_credenciamento', {
      p_professional_id: id,
      p_status: status,
    });
    setAtualizando(null);
    if (ok) {
      setProfissionais((atual) => atual.map((p) => (p.id === id ? { ...p, accreditation_status: status } : p)));
    }
  }

  const filtrados = filtro === 'todos' ? profissionais : profissionais.filter((p) => p.accreditation_status === filtro);
  const pendentes = profissionais.filter((p) => ['pending', 'in_review'].includes(p.accreditation_status)).length;

  return (
    <main className="bg-tinta-5 pb-16">
      <div className="container-app py-10">
        <p className="rotulo mb-1 text-tinta-50">Administração</p>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Profissionais</h1>
        <p className="mb-8 text-sm text-tinta-50">
          {carregando ? 'Carregando…' : `${profissionais.length} cadastrados · ${pendentes} aguardando decisão`}
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          {(['todos', 'pending', 'in_review', 'approved', 'suspended', 'blocked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                filtro === f ? 'bg-tinta-solida text-white' : 'bg-tinta-5 text-tinta-70 hover:text-tinta'
              }`}
            >
              {f === 'todos' ? 'Todos' : STATUS_CREDENCIAMENTO[f]}
            </button>
          ))}
        </div>

        <section className="cartao p-6">
          {carregando ? (
            <p className="text-sm text-tinta-50">Carregando…</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-tinta-50">Nenhum profissional com esse filtro.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tinta-20 text-left">
                    <th className="py-2 pr-4 rotulo">Nome</th>
                    <th className="py-2 pr-4 rotulo">CPF</th>
                    <th className="py-2 pr-4 rotulo">Nota</th>
                    <th className="py-2 pr-4 rotulo">Serviços feitos</th>
                    <th className="py-2 pr-4 rotulo">Status</th>
                    <th className="py-2 rotulo">Decisão</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p) => (
                    <tr key={p.id} className="border-b border-tinta-10 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-semibold">{p.full_name}</p>
                        <p className="text-xs text-tinta-50">{p.email}</p>
                      </td>
                      <td className="py-3 pr-4 numero">{p.document}</td>
                      <td className="py-3 pr-4 numero">
                        {p.rating_count > 0 ? `${p.rating_avg.toFixed(2)} (${p.rating_count})` : '—'}
                      </td>
                      <td className="py-3 pr-4 numero">{p.completed_orders}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${CORES_STATUS[p.accreditation_status]}`}>
                          {STATUS_CREDENCIAMENTO[p.accreditation_status]}
                        </span>
                      </td>
                      <td className="flex flex-wrap gap-2 py-3">
                        {p.accreditation_status !== 'approved' && (
                          <button
                            onClick={() => definirStatus(p.id, 'approved')}
                            disabled={atualizando === p.id}
                            className="btn-verde !px-3 !py-1.5 !text-[11px]"
                          >
                            Aprovar
                          </button>
                        )}
                        {p.accreditation_status !== 'suspended' && (
                          <button
                            onClick={() => definirStatus(p.id, 'suspended')}
                            disabled={atualizando === p.id}
                            className="btn-contorno !px-3 !py-1.5 !text-[11px]"
                          >
                            Suspender
                          </button>
                        )}
                        {p.accreditation_status !== 'blocked' && (
                          <button
                            onClick={() => definirStatus(p.id, 'blocked')}
                            disabled={atualizando === p.id}
                            className="btn-contorno !px-3 !py-1.5 !text-[11px]"
                          >
                            Negar
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
