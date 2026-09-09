"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePerfil } from "@/lib/usePerfil";
import { supabase } from "@/lib/supabase";
import { horas, reais } from "@/lib/catalogo";
import { rotuloStatusPedido } from "@/lib/statusPedido";

interface Pedido {
  id: string;
  code: string;
  service: string;
  scheduled_at: string;
  minutes: number;
  status: string;
  payout_cents: number;
}

const FILTROS_FIXOS = [
  "assigned",
  "in_progress",
  "completed",
  "rated",
  "cancelled_by_customer",
  "cancelled_by_professional",
];

export default function MeusPedidosProfissional() {
  const perfil = usePerfil();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setCarregando(false);
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select(
          "id, code, service, scheduled_at, minutes, status, payout_cents",
        )
        .eq("professional_id", perfil.id)
        .order("scheduled_at", { ascending: true })
        .limit(20);
      setPedidos(data ?? []);
      setCarregando(false);
    })();
  }, [perfil.id]);

  const statusFiltraveis = useMemo(() => {
    const extras = pedidos
      .map((p) => p.status)
      .filter((s) => !FILTROS_FIXOS.includes(s));
    return [...FILTROS_FIXOS, ...Array.from(new Set(extras))];
  }, [pedidos]);
  const pedidosFiltrados =
    filtro === "todos" ? pedidos : pedidos.filter((p) => p.status === filtro);

  return (
    <main className="container-app flex flex-col gap-10 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Meus pedidos</h1>

      {carregando ? (
        <p className="text-sm text-tinta-50">Carregando…</p>
      ) : pedidos.length === 0 ? (
        <div className="cartao p-8 text-center">
          <p className="font-semibold">Nenhum pedido no momento</p>
          <p className="mt-1 text-sm text-tinta-50">
            Vá em{" "}
            <Link href="/profissional" className="font-semibold text-azul-600">
              Serviços
            </Link>{" "}
            para ver ofertas disponíveis.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:gap-6">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sem-barra sm:mx-0 sm:flex-col sm:overflow-visible sm:px-0 sm:pb-0">
            <button
              onClick={() => setFiltro("todos")}
              className={`shrink-0 rounded-full px-4 py-2 text-left text-sm font-bold transition sm:rounded-xl ${
                filtro === "todos"
                  ? "bg-tinta-solida text-white"
                  : "bg-tinta-5 text-tinta-70 hover:text-tinta"
              }`}
            >
              Todos
            </button>
            {statusFiltraveis.map((s) => (
              <button
                key={s}
                onClick={() => setFiltro(s)}
                className={`shrink-0 rounded-full px-4 py-2 text-left text-sm font-bold transition sm:rounded-xl ${
                  filtro === s
                    ? "bg-tinta-solida text-white"
                    : "bg-tinta-5 text-tinta-70 hover:text-tinta"
                }`}
              >
                {rotuloStatusPedido(s)}
              </button>
            ))}
          </div>

          <div className="cartao flex flex-col divide-y divide-tinta-10 p-2">
            {pedidosFiltrados.map((p) => (
              <Link
                key={p.id}
                href={`/profissional/pedidos/${p.id}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-tinta-5"
              >
                <div>
                  <p className="font-bold numero">
                    {new Date(p.scheduled_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-tinta-50 numero">
                    #{p.code} · {horas(p.minutes)}
                  </p>
                </div>
                <span className="rounded-full bg-tinta-5 px-3 py-1 text-xs font-bold text-tinta-70">
                  {rotuloStatusPedido(p.status)}
                </span>
                <span className="font-bold text-verde-700 numero">
                  {reais(p.payout_cents)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
