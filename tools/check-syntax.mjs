// Sintaxis de todo el código del servidor (src/, también las rutas) y de los scripts clásicos de la interfaz.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  ...readdirSync(path.join(root, 'src'), { recursive: true })
    .filter((name) => name.endsWith('.mjs'))
    .map((name) => path.join('src', name)),
  ...readdirSync(path.join(root, 'public'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join('public', name))
];
let failed = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  } catch (error) {
    failed++;
    console.error(String(error.stderr || error.message));
  }
}
if (failed) process.exit(1);
console.log(`${files.length} archivos sin errores de sintaxis.`);
