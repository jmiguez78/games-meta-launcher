import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeJsonAtomic } from './json-file.mjs';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
  process.env.GML_DATA_DIR ? path.resolve(process.env.GML_DATA_DIR) : path.join(projectRoot, 'data'),
  'library.json'
);
// Se incrementa cuando cambia la forma del inventario, para que el servidor lo regenere.
export const CATALOG_SCHEMA = 2;

// Lo que el buscador necesita saber de la PC: qué unidades hay y qué dice el registro de Windows. Las pruebas
// pasan su propia versión (carpetas temporales en lugar de unidades y un registro inventado).
const DRIVE_TIMEOUT_MS = 1500;
export const windowsEnv = {
  // Unidades que existen (sin A: ni B:). Una de red desconectada puede tardar: pasado el límite se saltea.
  async drives() {
    if (process.platform !== 'win32') return [];
    const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const found = await Promise.all(
      letters.map((letter) =>
        Promise.race([
          fs.access(`${letter}:\\`).then(
            () => letter,
            () => null
          ),
          new Promise((resolve) => setTimeout(resolve, DRIVE_TIMEOUT_MS, null))
        ])
      )
    );
    return found.filter(Boolean);
  },
  root: (letter) => `${letter}:\\`,
  // La clave (y con recurse, todas sus subclaves) con sus valores; [] si no existe. Con PowerShell y salida UTF-8:
  // reg.exe escribe en la página de códigos de la consola y una carpeta con tildes («C:\Users\José») llegaría rota.
  async registry(key, { recurse = true } = {}) {
    if (process.platform !== 'win32') return [];
    const full = key.replace(/^HKLM\\/i, 'HKEY_LOCAL_MACHINE\\').replace(/^HKCU\\/i, 'HKEY_CURRENT_USER\\');
    if (!/^HKEY_(LOCAL_MACHINE|CURRENT_USER)\\[\w .\\-]+$/.test(full)) return [];
    const script =
      "[Console]::OutputEncoding = [Text.Encoding]::UTF8; $k = 'Registry::" +
      full +
      "'; if (Test-Path $k) { @(@(Get-Item $k)" +
      (recurse ? ' + @(Get-ChildItem $k -Recurse -ErrorAction SilentlyContinue)' : '') +
      ' | ' +
      'ForEach-Object { $v = @{}; foreach ($n in $_.GetValueNames()) { $v[$n] = [string]$_.GetValue($n) }; ' +
      '[pscustomobject]@{ key = $_.Name; values = $v } }) | ConvertTo-Json -Depth 4 -Compress }';
    try {
      const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024
      });
      return parseRegistryJson(stdout);
    } catch {
      return [];
    }
  }
};

// Respuesta de PowerShell → [{ key, values: { nombre: valor } }]. Con una sola clave llega un objeto, no una lista.
export function parseRegistryJson(text) {
  let data;
  try {
    data = JSON.parse(String(text ?? '').trim() || '[]');
  } catch {
    return [];
  }
  return (Array.isArray(data) ? data : [data])
    .filter((item) => item && typeof item.key === 'string')
    .map((item) => ({
      key: item.key,
      values: Object.fromEntries(
        Object.entries(item.values && typeof item.values === 'object' ? item.values : {}).map(([name, value]) => [
          name,
          String(value ?? '')
        ])
      )
    }));
}
const lastSegment = (key) => key.split('\\').pop();
// Las rutas del registro pueden venir con barras normales o una barra final («C:/Games/Anno 1800/»).
const cleanPath = (value) => {
  const text = String(value ?? '')
    .trim()
    .replace(/^"|"$/g, '');
  return text ? path.normalize(text).replace(/(?<!^[A-Za-z]:)[\\/]+$/, '') : '';
};
const sameLocation = (location) => location.toLowerCase().replace(/[\\/]+$/, '');

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

const STEAM_DEFAULT = 'C:\\Program Files (x86)\\Steam';
const STEAM_LIBRARY_CACHE = `${STEAM_DEFAULT}\\appcache\\librarycache`;
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
// Dónde está Steam: lo dice el registro (instalado en otra unidad también); si no, la carpeta por defecto.
export async function steamDirectory(env) {
  const only = { recurse: false };
  const user = (await env.registry('HKCU\\Software\\Valve\\Steam', only))[0]?.values.SteamPath;
  const machine = (await env.registry('HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', only))[0]?.values.InstallPath;
  return cleanPath(user || machine) || STEAM_DEFAULT;
}
// Bibliotecas de Steam: las que lista libraryfolders.vdf y, por si falta, «SteamLibrary» en cada unidad.
async function steamLibraries(env, steamDir, drives) {
  const bases = new Map();
  const add = (base) => bases.set(sameLocation(base), base);
  add(path.join(steamDir, 'steamapps'));
  const text = await readText(path.join(steamDir, 'steamapps', 'libraryfolders.vdf'));
  for (const match of text.matchAll(/"path"\s+"([^"]+)"/gi))
    add(path.join(match[1].replaceAll('\\\\', '\\'), 'steamapps'));
  for (const drive of drives) add(path.join(env.root(drive), 'SteamLibrary', 'steamapps'));
  return [...bases.values()];
}
async function steamGames(env, drives) {
  const steamDir = await steamDirectory(env);
  const cache = path.join(steamDir, 'appcache', 'librarycache');
  const games = [];
  for (const base of await steamLibraries(env, steamDir, drives)) {
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
          art: await steamArtwork(manifest.id, cache),
          evidence: present
            ? 'Manifiesto Steam y carpeta presentes'
            : 'Steam lo registra como instalado, pero la carpeta no existe. Verificá los archivos o desinstalalo desde Steam.'
        })
      );
    }
  }
  return games;
}
async function epicGames(env) {
  const programData = env.programData ?? process.env.ProgramData ?? 'C:\\ProgramData';
  const manifestDir = path.join(programData, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests');
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
// .GamingRoot: archivo oculto que la app Xbox deja en la raíz de cada unidad donde instala juegos. Empieza con
// «RGBX», un número de 4 bytes y después las carpetas (relativas a la unidad) en UTF-16, separadas por un cero.
export function parseGamingRoot(bytes) {
  if (!bytes || bytes.length < 10 || bytes.toString('latin1', 0, 4) !== 'RGBX') return [];
  return bytes
    .subarray(8)
    .toString('utf16le')
    .split('\0')
    .map((item) => item.trim().replace(/^[\\/]+/, ''))
    .filter((item) => item && !/[<>:"|?*\u0000-\u001f]/.test(item));
}
// Bibliotecas de la app Xbox: las de .GamingRoot y, por si falta, «XboxGames» (el nombre por defecto) en cada unidad.
async function xboxRoots(env, drives) {
  const roots = new Map();
  for (const drive of drives) {
    const base = env.root(drive);
    const marker = await fs.readFile(path.join(base, '.GamingRoot')).catch(() => null);
    for (const relative of [...parseGamingRoot(marker), 'XboxGames']) {
      const root = path.join(base, ...relative.split(/[\\/]+/));
      roots.set(sameLocation(root), root);
    }
  }
  return [...roots.values()];
}
async function xboxGames(env, drives) {
  const roots = await xboxRoots(env, drives);
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
// Ubisoft Connect anota cada juego en el registro con su número (el que abre uplay://launch/<número>).
const UBISOFT_INSTALLS = 'HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs';
async function ubisoftGames(env, drives) {
  const games = [];
  const seen = new Set();
  for (const entry of await env.registry(UBISOFT_INSTALLS)) {
    const id = lastSegment(entry.key);
    const location = cleanPath(entry.values.InstallDir);
    if (!/^\d+$/.test(id) || !location || seen.has(sameLocation(location))) continue;
    seen.add(sameLocation(location));
    const present = await exists(location);
    games.push(
      makeGame({
        platform: 'Ubisoft Connect',
        id,
        name: path.basename(location),
        location,
        launch: present ? { type: 'uri', target: `uplay://launch/${id}/0`, available: true } : null,
        status: present ? 'installed' : 'attention',
        evidence: present
          ? 'Registro de Ubisoft Connect y carpeta presentes'
          : 'Ubisoft Connect lo registra como instalado, pero la carpeta no existe. Verificá el juego desde Ubisoft Connect.'
      })
    );
  }
  // Respaldo: carpetas «UbisoftLibrary» que el registro no menciona (sin número no se pueden abrir).
  for (const drive of drives)
    for (const folder of await folders(path.join(env.root(drive), 'UbisoftLibrary'))) {
      const location = path.join(env.root(drive), 'UbisoftLibrary', folder);
      if (seen.has(sameLocation(location))) continue;
      seen.add(sameLocation(location));
      games.push(
        makeGame({
          platform: 'Ubisoft Connect',
          id: folder,
          name: folder,
          location,
          evidence: 'Biblioteca Ubisoft presente; Ubisoft Connect no la registra, así que falta el número para abrirla'
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
// Respaldo para EA y GOG: carpetas con nombres habituales en cada unidad (y las que se pasen en extraRoots).
async function folderLibraries(platform, rootNames, env, drives, { extraRoots = [], seen = new Set() } = {}) {
  const games = [];
  const roots = [
    ...extraRoots,
    ...drives.flatMap((drive) => rootNames.map((name) => path.join(env.root(drive), name)))
  ];
  for (const root of roots)
    for (const folder of await folders(root)) {
      const location = path.join(root, folder);
      if (seen.has(sameLocation(location))) continue;
      seen.add(sameLocation(location));
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
// GOG Galaxy anota cada juego en el registro con su número, carpeta y ejecutable principal.
const GOG_GAMES = 'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games';
async function gogGames(env, drives) {
  const games = [];
  const seen = new Set();
  for (const entry of await env.registry(GOG_GAMES)) {
    const { gameID, gameName, path: folder, exe, workingDir } = entry.values;
    const location = cleanPath(folder);
    if (!gameID || !location || seen.has(sameLocation(location))) continue;
    seen.add(sameLocation(location));
    const executable = cleanPath(exe);
    const present = await exists(location);
    const runnable = present && executable && (await exists(executable));
    games.push(
      makeGame({
        platform: 'GOG Galaxy',
        id: gameID,
        name: gameName || path.basename(location),
        location,
        launch: runnable ? { type: 'file', target: executable, available: true } : null,
        status: present ? 'installed' : 'attention',
        evidence: runnable
          ? 'Registro de GOG con carpeta y ejecutable presentes'
          : present
            ? 'Registro de GOG presente; falta el ejecutable que indica'
            : 'GOG lo registra como instalado, pero la carpeta no existe. Verificá el juego desde GOG Galaxy.'
      })
    );
    if (workingDir) seen.add(sameLocation(cleanPath(workingDir)));
  }
  games.push(...(await folderLibraries('GOG Galaxy', ['GOG Games', 'GOG Galaxy Games'], env, drives, { seen })));
  return games;
}
// EA app (y Origin) anotan cada juego en el registro con su carpeta («Install Dir»). El ejecutable no figura:
// se usa el principal de la carpeta.
const EA_KEYS = ['HKLM\\SOFTWARE\\WOW6432Node\\Electronic Arts', 'HKLM\\SOFTWARE\\WOW6432Node\\EA Games'];
const EA_NOT_GAMES = /^(ea desktop|ea core|ea app|origin|ea installer)/i;
async function eaGames(env, drives) {
  const roots = [];
  for (const key of EA_KEYS)
    for (const entry of await env.registry(key)) {
      const location = cleanPath(entry.values['Install Dir'] ?? entry.values.InstallDir);
      if (location && !EA_NOT_GAMES.test(lastSegment(entry.key))) roots.push(location);
    }
  const games = [];
  const seen = new Set();
  // Cada carpeta del registro ya es un juego: se revisa su carpeta madre y se toma sólo esa subcarpeta.
  for (const location of roots) {
    if (seen.has(sameLocation(location)) || !(await exists(location))) continue;
    seen.add(sameLocation(location));
    const folder = path.basename(location);
    const executable = await firstExecutable(location);
    games.push(
      makeGame({
        platform: 'EA app',
        id: folder,
        name: folder,
        location,
        launch: executable ? { type: 'file', target: executable, available: true } : null,
        evidence: executable
          ? 'Registro de EA y ejecutable principal detectados'
          : 'Registro de EA presente; falta identificar ejecutable principal'
      })
    );
  }
  const programFiles = drives.includes('C') ? [path.join(env.root('C'), 'Program Files', 'EA Games')] : [];
  games.push(
    ...(await folderLibraries('EA app', ['EALibrary', 'EA Games'], env, drives, { extraRoots: programFiles, seen }))
  );
  return games;
}
// onSource(tienda, juegos): avisa cada tienda revisada (para mostrar el avance la primera vez).
export async function scanLibrary({ onSource, env = windowsEnv, output = outputPath } = {}) {
  const report = (platform) => (games) => {
    onSource?.(platform, games.length);
    return games;
  };
  const drives = await env.drives();
  const sources = await Promise.all([
    steamGames(env, drives).then(report('Steam')),
    epicGames(env).then(report('Epic Games')),
    xboxGames(env, drives).then(report('Xbox / Microsoft Store')),
    ubisoftGames(env, drives).then(report('Ubisoft Connect')),
    eaGames(env, drives).then(report('EA app')),
    gogGames(env, drives).then(report('GOG Galaxy'))
  ]);
  const byKey = new Map();
  for (const game of sources.flat()) byKey.set(game.key, game);
  const result = {
    schema: CATALOG_SCHEMA,
    generatedAt: new Date().toISOString(),
    games: [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  };
  if (output) await writeJsonAtomic(output, result);
  return result;
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(`Inventario actualizado: ${(await scanLibrary()).games.length} juegos.`);
