// Empaqueta el portable de Windows y guarda sólo lo necesario:
// 1. electron-builder compila siempre en dist/ (se sobrescribe en cada build).
// 2. El .exe se copia a releases/ con su número de versión.
// 3. Se borra dist/ (incluye win-unpacked, la copia intermedia de ~300 MB).
// 4. En releases/ quedan sólo las dos versiones más recientes: la actual y la anterior.
// Cualquier versión vieja se reconstruye desde su etiqueta de Git (por ejemplo, git checkout v0.18.0).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const releasesDir = path.join(root, 'releases');
const KEEP = 2;

// Versión a partir del nombre («Viciodromo-0.36.0.exe»; antes, «Games Meta Launcher 0.18.0.exe»).
export function versionOf(file) {
  const match = /(\d+)\.(\d+)\.(\d+)\.exe$/i.exec(file);
  return match ? match.slice(1, 4).map(Number) : null;
}
export function compareVersions(a, b) {
  for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] - b[index];
  return 0;
}
// Devuelve los ejecutables que sobran, del más viejo al más nuevo, dejando los `keep` más recientes.
export function releasesToPrune(files, keep = KEEP) {
  return files
    .filter((file) => versionOf(file))
    .sort((a, b) => compareVersions(versionOf(a), versionOf(b)))
    .slice(0, Math.max(0, files.filter((file) => versionOf(file)).length - keep));
}

async function main() {
  const { version, build } = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  if (build?.directories?.output !== 'dist') throw new Error('build.directories.output debe ser "dist".');
  await fs.rm(distDir, { recursive: true, force: true });
  const cli = path.join(root, 'node_modules', 'electron-builder', 'cli.js');
  const result = spawnSync(process.execPath, [cli, '--win', 'portable'], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
  const exe = (await fs.readdir(distDir)).find((file) => file.endsWith(version + '.exe'));
  if (!exe) throw new Error('electron-builder no generó el ejecutable de la versión ' + version + '.');
  await fs.mkdir(releasesDir, { recursive: true });
  await fs.copyFile(path.join(distDir, exe), path.join(releasesDir, exe));
  await fs.rm(distDir, { recursive: true, force: true });
  for (const old of releasesToPrune(await fs.readdir(releasesDir))) {
    await fs.rm(path.join(releasesDir, old));
    console.log('Se quitó ' + old + ' (se puede reconstruir desde su etiqueta de Git).');
  }
  console.log('Listo: releases/' + exe);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
