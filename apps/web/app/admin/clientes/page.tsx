'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ClienteAdmin {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  pedidos: number;
}

export default function AdminClientes() {
  const [clientes, setClientes] = useState<ClienteAdmin[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setCarregando(false);
        return;
      }
      const [perfis, pedidos] = await Promise.all([
        supabase
          .from('customers')
          .select('id, created_at, profiles(full_name, email, phone)')
          .order('created_at', { ascending: false }),
        supabase.from('orders').select('customer_id'),
      ]);

      const contagem = new Map<string, number>();
      for (const p of pedidos.data ?? []) {
        contagem.set(p.customer_id, (contagem.get(p.customer_id) ?? 0) + 1);
      }

      setClientes(
        ((perfis.data ?? []) as unknown as {
          id: string;
          created_at: string;
          profiles: { full_name: string; email: string; phone: string | null } | null;
        }[]).map((row) => ({
          id: row.id,
          full_name: row.profiles?.full_name ?? '—',
          email: row.profiles?.email ?? '—',
          phone: row.profiles?.phone ?? null,
          created_at: row.created_at,
          pedidos: contagem.get(row.id) ?? 0,
        })),
      );
      setCarregando(false);
    })();
  }, []);

  const filtrados = busca.trim()
    ? clientes.filter(
        (c) =>
          c.full_name.toLowerCase().includes(busca.toLowerCase()) ||
          c.email.toLowerCase().includes(busca.toLowerCase()),
      )
    : clientes;

  return (
    <main className="bg-tinta-5 pb-16">
      <div className="container-app py-10">
        <p className="rotulo mb-1 text-tinta-50">Administração</p>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="mb-8 text-sm text-tinta-50">{carregando ? 'Carregando…' : `${clientes.length} cadastrados`}</p>

        <input
          className="campo mb-5 max-w-sm"
          placeholder="Buscar por nome ou e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar cliente"
        />

        <section className="cartao p-6">
          {carregando ? (
            <p className="text-sm text-tinta-50">Carregando…</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-tinta-50">Nenhum cliente encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tinta-20 text-left">
                    <th className="py-2 pr-4 rotulo">Nome</th>
                    <th className="py-2 pr-4 rotulo">E-mail</th>
                    <th className="py-2 pr-4 rotulo">Celular</th>
                    <th className="py-2 pr-4 rotulo">Pedidos</th>
                    <th className="py-2 rotulo">Cliente desde</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((c) => (
                    <tr key={c.id} className="border-b border-tinta-10 last:border-0">
                      <td className="py-3 pr-4 font-semibold">{c.full_name}</td>
                      <td className="py-3 pr-4">{c.email}</td>
                      <td className="py-3 pr-4 numero">{c.phone ?? '—'}</td>
                      <td className="py-3 pr-4 numero">{c.pedidos}</td>
                      <td className="py-3 numero">
                        {new Date(c.created_at).toLocaleDateString('pt-BR')}
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
