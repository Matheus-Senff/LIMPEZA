'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export interface OfertaNoMapa {
  id: string;
  order_id: string;
  cidade: string;
  rotulo: string;
  valor: string;
  /** Centro aproximado do bairro, quando já geocodificado — mais preciso
   * que o centro da cidade, mas o pino ainda cai num ponto aleatório
   * próximo, nunca no endereço exato. */
  bairroLat?: number | null;
  bairroLng?: number | null;
}

/**
 * Coordenadas aproximadas do centro de cada cidade atendida — conhecimento
 * geográfico público, não dado de negócio. O pino de cada oferta cai em um
 * ponto aleatório (mas estável) dentro da cidade, nunca no endereço real:
 * o profissional só sabe o endereço exato depois de aceitar o pedido.
 */
const CENTRO_CIDADES: Record<string, [number, number]> = {
  itaiopolis: [-26.339, -49.912],
  mafra: [-26.112, -49.805],
  rionegro: [-26.096, -49.799],
};

function chaveCidade(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/** Hash simples e determinístico — mesma oferta sempre cai no mesmo pino. */
function hash(texto: string): number {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h * 33) ^ texto.charCodeAt(i)) >>> 0;
  return h;
}

function posicaoNoMapa(o: OfertaNoMapa): [number, number] | null {
  const h = hash(o.order_id);
  if (o.bairroLat != null && o.bairroLng != null) {
    // Bairro já geocodificado: variação bem menor (~150m), só pra não
    // empilhar vários pedidos do mesmo bairro no mesmo pixel.
    const dLat = (((h % 2000) - 1000) / 1000) * 0.0015;
    const dLng = ((((h >> 11) % 2000) - 1000) / 1000) * 0.0015;
    return [o.bairroLat + dLat, o.bairroLng + dLng];
  }

  const centro = CENTRO_CIDADES[chaveCidade(o.cidade)];
  if (!centro) return null;
  // Sem bairro geocodificado ainda: distribui em qualquer ponto da cidade.
  const dLat = (((h % 2000) - 1000) / 1000) * 0.01;
  const dLng = ((((h >> 11) % 2000) - 1000) / 1000) * 0.01;
  return [centro[0] + dLat, centro[1] + dLng];
}

export function MapaOfertas({
  ofertas,
  onSelecionar,
}: {
  ofertas: OfertaNoMapa[];
  onSelecionar: (id: string) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<import('leaflet').Map | null>(null);
  const marcadoresRef = useRef<import('leaflet').LayerGroup | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const L = (await import('leaflet')).default;
      if (!ativo || !divRef.current || mapaRef.current) return;

      const mapa = L.map(divRef.current, { scrollWheelZoom: false }).setView(
        [-26.18, -49.84],
        11,
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(mapa);

      mapaRef.current = mapa;
      marcadoresRef.current = L.layerGroup().addTo(mapa);
    })();
    return () => {
      ativo = false;
      mapaRef.current?.remove();
      mapaRef.current = null;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const L = (await import('leaflet')).default;
      const grupo = marcadoresRef.current;
      if (!grupo) return;
      grupo.clearLayers();

      const icone = L.divIcon({
        className: '',
        html: '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#16a34a;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      for (const o of ofertas) {
        const pos = posicaoNoMapa(o);
        if (!pos) continue;
        const marcador = L.marker(pos, { icon: icone }).bindTooltip(`${o.rotulo} · ${o.valor}`);
        marcador.on('click', () => onSelecionar(o.id));
        marcador.addTo(grupo);
      }
    })();
  }, [ofertas, onSelecionar]);

  return (
    // relative + z-0 isolam o mapa num contexto de empilhamento próprio:
    // os controles internos do Leaflet (zoom, atribuição) usam z-index
    // até 1000 e, sem isso, vazam por cima de modais da página.
    <div className="relative z-0 overflow-hidden rounded-card border border-tinta-10">
      <div ref={divRef} style={{ height: 360, width: '100%' }} />
      <p className="bg-tinta-5 px-4 py-2 text-xs text-tinta-50">
        O pino mostra a região da cidade, não o endereço exato — isso só aparece depois de aceitar.
      </p>
    </div>
  );
}
