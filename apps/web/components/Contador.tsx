'use client';

export function Contador({
  rotulo,
  valor,
  onChange,
  min,
  max,
}: {
  rotulo: string;
  valor: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-tinta-20 px-4 py-3">
      <span className="text-sm font-semibold numero">
        {valor} {rotulo}
      </span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, valor - 1))}
          className="grid h-8 w-8 place-items-center rounded-full border border-tinta-20 font-bold hover:border-azul-600 hover:text-azul-600"
          aria-label={`Diminuir ${rotulo}`}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, valor + 1))}
          className="grid h-8 w-8 place-items-center rounded-full border border-tinta-20 font-bold hover:border-azul-600 hover:text-azul-600"
          aria-label={`Aumentar ${rotulo}`}
        >
          +
        </button>
      </span>
    </div>
  );
}
