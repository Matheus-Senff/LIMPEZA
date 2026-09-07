// Fonte única do motor de preço: packages/pricing/src.
// Este script copia para os pontos de consumo (app web e Edge Function),
// porque cada runtime resolve módulos de um jeito. Roda no predev e no prebuild.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'packages', 'pricing', 'src');
const destinos = [
  join(root, 'apps', 'web', 'lib', 'pricing'),
  join(root, 'supabase', 'functions', '_shared', 'pricing'),
];

for (const destino of destinos) {
  mkdirSync(destino, { recursive: true });
  for (const arquivo of ['index.ts', 'types.ts']) {
    copyFileSync(join(src, arquivo), join(destino, arquivo));
  }
}

console.log(`motor de preço sincronizado em ${destinos.length} destinos`);
