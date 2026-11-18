import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const sourceRoot = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function measureDirectory(directory: string): { files: number; bytes: number } {
  const total = { files: 0, bytes: 0 };
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const item = entry.isDirectory() ? measureDirectory(path) : { files: 1, bytes: statSync(path).size };
    total.files += item.files;
    total.bytes += item.bytes;
  }
  return total;
}

for (const folder of ['game', 'screenshots']) {
  const path = join(sourceRoot, folder);
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(`Cannot package Calder: required directory is missing: ${path}`);
  }
}
mkdirSync(destination, { recursive: true });
let filesCopied = 0, bytesCopied = 0;
for (const folder of ['game', 'screenshots']) {
  const path = join(sourceRoot, folder);
  const totals = measureDirectory(path);
  cpSync(path, join(destination, folder), { recursive: true });
  filesCopied += totals.files;
  bytesCopied += totals.bytes;
}
const dossier = buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
});
writeFileSync(join(destination, 'dossier.json'), dossier);
console.log(`Calder packaged: ${filesCopied} files copied, ${bytesCopied} bytes. Dossier: ${Buffer.byteLength(dossier)} bytes. Output: ${destination}`);
