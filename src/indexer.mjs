import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
  process.env.GML_DATA_DIR ? path.resolve(process.env.GML_DATA_DIR) : path.join(projectRoot, 'data'),
  'library.json'
);
// Se incrementa cuando cambia la forma del inventario, para que el servidor lo regenere.
export const CATALOG_SCHEMA = 2;
const DRIVE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'H', 'K'];

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}
async function readText(target) {
  try {
    return await fs.readFile(target, 'utf8');
  } catch {
    return '';
  }
}
async function folders(root) {
  try {
    return (await fs.readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}
export function vdfValue(text, key) {
  return text.match(new RegExp(`"${key}"\\s+"([^"]+)"`, 'i'))?.[1] ?? '';
}
function gameKey(platform, id, name) {
  return `${platform}:${id || name}`.toLowerCase();
}
function makeGame({
  platform,
  id = '',
  name,
  location,
  launch = null,
  evidence,
  status = 'installed',
  packageName = '',
  art = null
}) {
  return {
    key: gameKey(platform, id, name),
    id,
    name: name.trim(),
    platform,
    drive: location.slice(0, 2),
    location,
    launch,
    packageName,
    status,
    evidence,
    art
  };
}

const STEAM_LIBRARY_CACHE = 'C:\\Program Files (x86)\\Steam\\appcache\\librarycache';
// Herramientas que Steam instala como aplicaciones pero no son juegos.
const STEAM_NON_GAMES = new Set(['228980']);
const steamArtFiles = {
  portrait: ['library_600x900.jpg', 'library_capsule.jpg'],
  landscape: ['library_header.jpg', 'header.jpg'],
  hero: ['library_hero.jpg'],
  wordmark: ['logo.png']
};
// Steam guarda las imágenes en la carpeta del juego o, en versiones recientes, en subcarpetas con hash.
export async function steamArtwork(id, cacheDir = STEAM_LIBRARY_CACHE) {
  const root = path.join(cacheDir, id);
  let entries = [];
  try {
    entries = await fs.readdir(root, { recursive: true });
  } catch {
    return null;
  }
  const byName = new Map(entries.map((entry) => [path.basename(entry).toLowerCase(), path.join(root, entry)]));
  const art = {};
  for (const [kind, names] of Object.entries(steamArtFiles)) {
    const found = names.map((name) => byName.get(name)).find(Boolean);
    if (found) art[kind] = found;
  }
  return Object.keys(art).length ? art : null;
}
export async function xboxArtwork(location, config) {
  const background = config.match(/BackgroundColor="(#[0-9a-f]{6})"/i)?.[1] ?? null;
  for (const attribute of ['Square480x480Logo', 'Square150x150Logo', 'StoreLogo']) {
    const relative = config.match(new RegExp(`${attribute}="([^"]+)"`, 'i'))?.[1];
    if (!relative) continue;
    // MicrosoftGame.config usa barras invertidas; se separan para que la ruta funcione en cualquier sistema.
    const target = path.join(location, 'Content', ...relative.split(/[\\/]+/));
    if (await exists(target)) return { logo: target, background };
  }
  return null;
}

export function parseSteamManifest(text) {
  return { id: vdfValue(text, 'appid'), name: vdfValue(text, 'name'), installDir: vdfValue(text, 'installdir') };
}
async function steamLibraries() {
  const bases = new Set(['C:\\Program Files (x86)\\Steam\\steamapps']);
  const primary = 'C:\\Program Files (x86)\\Steam\\steamapps\\libraryfolders.vdf';
  const text = await readText(primary);
  for (const match of text.matchAll(/"path"\s+"([^"]+)"/gi))
    bases.add(path.join(match[1].replaceAll('\\\\', '\\'), 'steamapps'));
  for (const drive of DRIVE_LETTERS) {
    bases.add(`${drive}:\\SteamLibrary\\steamapps`);
    bases.add(`${drive}:\\Juegos\\Steam Games\\steamapps`);
  }
  return [...bases];
}
async function steamGames() {
  const games = [];
  for (const base of await steamLibraries()) {
    let files = [];
    try {
      files = await fs.readdir(base);
    } catch {
      continue;
    }
    for (const file of files.filter((name) => /^appmanifest_\d+\.acf$/i.test(name))) {
      const manifest = parseSteamManifest(await readText(path.join(base, file)));
      if (!manifest.name || STEAM_NON_GAMES.has(manifest.id)) continue;
      const location = path.join(base, 'common', manifest.installDir);
      const present = await exists(location);
      games.push(
        makeGame({
          platform: 'Steam',
          id: manifest.id,
          name: manifest.name,
          location,
          launch: present ? { type: 'uri', target: `steam://run/${manifest.id}`, available: true } : null,
          status: present ? 'installed' : 'attention',
          art: await steamArtwork(manifest.id),
          evidence: present
            ? 'Manifiesto Steam y carpeta presentes'
            : 'Steam lo registra como instalado, pero la carpeta no existe. Verificá los archivos o desinstalalo desde Steam.'
        })
      );
    }
  }
  return games;
}
async function epicGames() {
  const manifestDir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
  let files = [];
  try {
    files = await fs.readdir(manifestDir);
  } catch {
    return [];
  }
  const games = [];
  for (const file of files.filter((name) => name.endsWith('.item'))) {
    try {
      const item = JSON.parse(await readText(path.join(manifestDir, file)));
      if (!item.DisplayName || !item.InstallLocation) continue;
      const present = await exists(item.InstallLocation);
      games.push(
        makeGame({
          platform: 'Epic Games',
          id: item.CatalogItemId ?? item.AppName ?? '',
          name: item.DisplayName,
          location: item.InstallLocation,
          launch:
            present && item.AppName
              ? {
                  type: 'uri',
                  target: `com.epicgames.launcher://apps/${item.AppName}?action=launch&silent=true`,
                  available: true
                }
              : null,
          status: present ? 'installed' : 'attention',
          evidence: present
            ? 'Manifiesto Epic y carpeta presentes'
            : 'Epic lo registra como instalado, pero la carpeta no existe. Verificá o desinstalá el juego desde Epic Games Launcher.'
        })
      );
    } catch {
      /* se omite un manifiesto incompleto */
    }
  }
  return games;
}
async function xboxGames() {
  const roots = ['C:\\XboxGames', 'F:\\Juegos', 'G:\\XBoxLibrary'];
  const games = [];
  for (const root of roots)
    for (const folder of await folders(root)) {
      const location = path.join(root, folder);
      const config = await readText(path.join(location, 'Content', 'MicrosoftGame.config'));
      if (!config) continue;
      const name = config.match(/DefaultDisplayName="([^"]+)"/i)?.[1] || folder;
      const packageName = config.match(/<Identity\s+Name="([^"]+)"/i)?.[1] || '';
      const appId = config.match(/<Executable[^>]*\sId="([^"]+)"/i)?.[1] || 'Game';
      games.push(
        makeGame({
          platform: 'Xbox / Microsoft Store',
          id: packageName,
          name,
          location,
          packageName,
          launch: packageName ? { type: 'appsFolder', target: `${packageName}!${appId}`, available: true } : null,
          art: await xboxArtwork(location, config),
          evidence: 'MicrosoftGame.config y contenido presentes'
        })
      );
    }
  return games;
}
const ubisoftIds = { 'Anno 1800': '4553' };
async function ubisoftGames() {
  const games = [];
  for (const drive of DRIVE_LETTERS)
    for (const folder of await folders(`${drive}:\\UbisoftLibrary`)) {
      const location = `${drive}:\\UbisoftLibrary\\${folder}`;
      const id = ubisoftIds[folder] ?? '';
      games.push(
        makeGame({
          platform: 'Ubisoft Connect',
          id: id || folder,
          name: folder,
          location,
          launch: id ? { type: 'uri', target: `uplay://launch/${id}/0`, available: true } : null,
          evidence: id
            ? 'Biblioteca Ubisoft y URI de lanzamiento identificados'
            : 'Biblioteca Ubisoft presente; falta identificar URI de lanzamiento'
        })
      );
    }
  return games;
}
async function firstExecutable(location) {
  const entries = await fs.readdir(location, { withFileTypes: true }).catch(() => []);
  const excluded = /unins|setup|install|crash|redist|easyanticheat/i;
  const exe = entries.find((entry) => entry.isFile() && /\.exe$/i.test(entry.name) && !excluded.test(entry.name));
  return exe ? path.join(location, exe.name) : '';
}
async function folderLibraries(platform, rootNames) {
  const games = [];
  for (const drive of DRIVE_LETTERS)
    for (const rootName of rootNames)
      for (const folder of await folders(`${drive}:\\${rootName}`)) {
        const location = `${drive}:\\${rootName}\\${folder}`;
        const executable = await firstExecutable(location);
        games.push(
          makeGame({
            platform,
            id: folder,
            name: folder,
            location,
            launch: executable ? { type: 'file', target: executable, available: true } : null,
            evidence: executable
              ? `Carpeta de ${platform} y ejecutable principal detectados`
              : `Carpeta de ${platform} presente; falta identificar ejecutable principal`
          })
        );
      }
  return games;
}
export async function scanLibrary() {
  const sources = await Promise.all([
    steamGames(),
    epicGames(),
    xboxGames(),
    ubisoftGames(),
    folderLibraries('EA app', ['EALibrary', 'EA Games']),
    folderLibraries('GOG Galaxy', ['GOG Games', 'GOG Galaxy Games'])
  ]);
  const byKey = new Map();
  for (const game of sources.flat()) byKey.set(game.key, game);
  const result = {
    schema: CATALOG_SCHEMA,
    generatedAt: new Date().toISOString(),
    games: [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  };
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');
  return result;
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(`Inventario actualizado: ${(await scanLibrary()).games.length} juegos.`);
