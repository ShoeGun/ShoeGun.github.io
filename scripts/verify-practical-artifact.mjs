import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const lab = resolve('public/lab');
const manifest = JSON.parse(await readFile(resolve(lab, 'release.json'), 'utf8'));
if (manifest.schemaVersion !== 1 || manifest.modelWeightsRequired !== false || manifest.files.length !== 6) throw Error('Unexpected release manifest.');
for (const entry of manifest.files) {
  if (!/^(?:index\.html|S2-NOTICES\.txt|assets\/[A-Za-z0-9_.-]+)$/.test(entry.path)) throw Error('Invalid public artifact path.');
  const data = await readFile(resolve(lab, entry.path));
  if (data.length !== entry.bytes || createHash('sha256').update(data).digest('hex') !== entry.sha256) throw Error(`Artifact mismatch: ${entry.path}`);
}
const assets = await readdir(resolve(lab, 'assets'));
if (assets.some(path => /planner|model\.worker|Qualification|\.onnx$|\.wasm$/.test(path))) throw Error('Experimental model runtime in practical release.');
const html = await readFile('index.html', 'utf8');
if (!html.includes('src="/lab/"') || !html.includes('portfolio-lab-frame')) throw Error('Portfolio does not embed the practical workbench.');
console.log(`Practical Dom: ${manifest.files.length} artifact hashes matched; model runtime absent; portfolio embed present.`);
