/**
 * Download brain.glb into public/models for self-hosting.
 * Run: node scripts/fetch-brain.mjs
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'models');
const outFile = path.join(outDir, 'brain.glb');
const url =
  'https://cdn.jsdelivr.net/gh/kekkorider/threejs-dala@main/static/brain.glb';

try {
  await access(outFile, constants.F_OK);
  console.log('[fetch-brain] already exists:', outFile);
  process.exit(0);
} catch {
  /* download */
}

await mkdir(outDir, { recursive: true });
const res = await fetch(url);
if (!res.ok) {
  console.error('[fetch-brain] failed', res.status, res.statusText);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
await writeFile(outFile, buf);
console.log('[fetch-brain] wrote', outFile, `(${buf.length} bytes)`);
