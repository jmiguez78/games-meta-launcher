import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(projectRoot, 'data', 'library.json');
const DRIVE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'H', 'K'];

async function exists(target) {
  try { await fs.access(target); return true; } catch { return false; }
}

async function readText(target) {
  try { return await fs.readFile(target, 'utf8'); } catch { return ''; }
}

function vdfValue(text, key) {
  const match = text.match(new RegExp(`"${key}"\\s+"([^"]+)"`, 'i'));
  return match?.[1] ?? '';
}

function parseSteamManifest(text) {
  return {
    id: vdfValue(text, 'appid'),
    name: vdfValue(text, 'name'),
    installDir: vdfValue(text, 'installdir')
  };
}

function gameKey(platform, id, name, location) {
  return `${platform}:${id || name}:${location}`.toLowerCase();
}

function makeGame({ platform, id = '', name, location, launcherUri = '', evidence, packageName = '' }) {
  return {
    key: gameKey(platform, id, name, location),
    id,
    name: name.trim(),
    platform,
    drive: location.slice(0, 2),
    location,
    launcherUri,
    packageName,
    status: 'installed',
    evidence
  };
}

async function steamGames() {
  const bases = [];
  for (const drive of DRIVE_LETTERS) {
    bases.push(`${drive}:\\SteamLibrary\\steamapps`);
    bases.push(`${drive}:\\Juegos\\Steam Games\\steamapps`);
  }
  bases.push('C:\\Program Files (x86)\\Steam\\steamapps');
  const games = [];
  for (const base of [...new Set(bases)]) {
    let files = [];
    try { files = await fs.readdir(base); } catch { continue; }
    for (const file of files.filter((name) => /^appmanifest_\d+\.acf$/i.test(name))) {
      const manifest = parseSteamManifest(await readText(path.join(base, file)));
      const location = path.join(base, 'common', manifest.installDir);
      if (manifest.name && await exists(location)) {
        games.push(makeGame({
          platform: 'Steam', id: manifest.id, name: manifest.name, location,
          launcherUri: `steam://run/${manifest.id}`,
          evidence: 'Manifiesto Steam y carpeta presentes'
        }));
      }
    }
  }
  return games;
}

async function epicGames() {
  const manifestDir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
  let files = [];
  try { files = await fs.readdir(manifestDir); } catch { return []; }
  const games = [];
  for (const file of files.filter((name) => name.endsWith('.item'))) {
    try {
      const item = JSON.parse(await readText(path.join(manifestDir, file)));
      if (item.DisplayName && item.InstallLocation && await exists(item.InstallLocation)) {
        games.push(makeGame({
          platform: 'Epic Games', id: item.CatalogItemId ?? '', name: item.DisplayName,
          location: item.InstallLocation, evidence: 'Manifiesto Epic y carpeta presentes'
        }));
      }
    } catch { /* manifiesto incompleto: se omite */ }
  }
  return games;
}

async function xboxGames() {
  const roots = ['C:\\XboxGames', 'F:\\Juegos', 'G:\\XBoxLibrary'];
  const games = [];
  for (const root of roots) {
    let folders = [];
    try { folders = await fs.readdir(root, { withFileTypes: true }); } catch { continue; }
    for (const folder of folders.filter((entry) => entry.isDirectory())) {
      const location = path.join(root, folder.name);
      const configPath = path.join(location, 'Content', 'MicrosoftGame.config');
      const config = await readText(configPath);
      if (!config) continue;
      const name = config.match(/DefaultDisplayName="([^"]+)"/i)?.[1] || folder.name;
      const packageName = config.match(/<Identity\s+Name="([^"]+)"/i)?.[1] || '';
      games.push(makeGame({
        platform: 'Xbox / Microsoft Store', id: packageName, name, location, packageName,
        evidence: 'MicrosoftGame.config y contenido presentes'
      }));
    }
  }
  return games;
}

async function ubisoftGames() {
  const location = 'G:\\UbisoftLibrary\\Anno 1800';
  if (!await exists(location)) return [];
  return [makeGame({
    platform: 'Ubisoft Connect', id: '4553', name: 'Anno 1800', location,
    evidence: 'Biblioteca Ubisoft y archivos del juego presentes'
  })];
}

export async function scanLibrary() {
  const sources = await Promise.all([steamGames(), epicGames(), xboxGames(), ubisoftGames()]);
  const byKey = new Map();
  for (const game of sources.flat()) byKey.set(game.key, game);
  const result = { generatedAt: new Date().toISOString(), games: [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')) };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await scanLibrary();
  console.log(`Inventario actualizado: ${result.games.length} juegos.`);
}
