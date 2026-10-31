import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CATALOG_SCHEMA, scanLibrary, steamArtwork } from './indexer.mjs';
import { createIgdb, imageUrl } from './igdb.mjs';
import { createSteam, mergeSteamLibrary } from './steam.mjs';
import { createSteamAssets } from './steam-assets.mjs';
import { createArcade } from './mame.mjs';
import { createSessionLog, createSessionTracker } from './sessions.mjs';
import { createTaskHub } from './tasks.mjs';
import { buildActivity } from './activity.mjs';
import { copyToPortable, portableFolder } from './portable.mjs';
import { cleanLists, createLists } from './lists.mjs';
import { createWiki } from './wiki.mjs';
import { displayName } from './names.mjs';
import { arcadeCategoryEs, metaEs } from './es.mjs';
import { createVersionedFile, readJsonCached } from './json-file.mjs';
import { configureLog, log, recentLog } from './log.mjs';
import { badRequest, conflict, createRouter, notImplemented, send } from './http.mjs';
import { libraryRoutes } from './routes/library.mjs';
import { preferencesRoutes } from './routes/preferences.mjs';
import { integrationRoutes } from './routes/integrations.mjs';
import { systemRoutes } from './routes/system.mjs';
import { createUpdates } from './updates.mjs';
import { readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const dataDir = process.env.GML_DATA_DIR ? path.resolve(process.env.GML_DATA_DIR) : path.join(root, 'data');
const dataPath = path.join(dataDir, 'library.json');
const preferencesPath = path.join(dataDir, 'preferences.json');
const coversDir = path.join(dataDir, 'covers');
configureLog(dataDir);
const appVersion = (() => {
  try {
    return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  } catch {
    return 'desconocida';
  }
})();
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};
// El tipo real de una imagen descargada o cacheada se reconoce por sus primeros bytes.
function imageType(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return types['.png'];
  if (bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP')
    return types['.webp'];
  return types['.jpg'];
}
const extensionByMime = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const execFileAsync = promisify(execFile);
const scheduleName = 'Games Meta Launcher - Indexación nocturna';
// Preferencias por juego (favorito, etiquetas, notas, tiempo) y de la aplicación. Versión 1: { games, settings }.
const prefsFile = createVersionedFile(preferencesPath, {
  version: 1,
  fallback: () => ({ games: {}, settings: {} }),
  migrations: {
    1: (saved) => ({
      ...saved,
      games: saved.games && typeof saved.games === 'object' ? saved.games : {},
      settings: saved.settings ?? {}
    })
  }
});
// Lectura compartida (no se modifica). Para cambiar algo: updatePreferences.
async function preferences() {
  const data = await prefsFile.read();
  return data?.games ? data : { games: {}, settings: {} };
}
function updatePreferences(change) {
  return prefsFile.update((prefs) => {
    prefs.games ??= {};
    return change(prefs);
  });
}
async function rawLibrary() {
  const catalog = await readJsonCached(dataPath, null);
  return Array.isArray(catalog?.games) && catalog.schema === CATALOG_SCHEMA ? catalog : runScan();
}
// Memoria de resultados: si las entradas son los mismos objetos (nada cambió en disco), se reutiliza el cálculo.
function memo(compute) {
  let inputs = null;
  let value;
  return (...args) => {
    if (inputs && inputs.length === args.length && inputs.every((item, index) => item === args[index])) return value;
    inputs = args;
    value = compute(...args);
    return value;
  };
}
const mergedLibrary = memo((games, account) => {
  const list = mergeSteamLibrary(games, account);
  return { list, byKey: new Map(list.map((game) => [game.key, game])) };
});
function safeOverride(value) {
  return value &&
    ['uri', 'file', 'appsFolder'].includes(value.type) &&
    typeof value.target === 'string' &&
    value.target.trim()
    ? { type: value.type, target: value.target.trim(), available: true }
    : null;
}
// Imágenes: primero las que guardan los launchers en esta PC; si faltan, la tienda de Steam y después IGDB.
// Lo descargado queda en art-cache y no se vuelve a pedir.
const artCacheDir = path.join(dataDir, 'art-cache');
const ART_RETRY_MS = 7 * 24 * 60 * 60 * 1000;
// wordmark: el logo con fondo transparente que Steam muestra sobre la imagen panorámica.
const steamCdnAssets = {
  cover: ['library_600x900.jpg', 'header.jpg'],
  hero: ['library_hero.jpg'],
  wordmark: ['logo.png']
};
const igdbImageSizes = { cover: 't_cover_big', hero: 't_1080p' };
const pendingDownloads = new Map();
const igdb = createIgdb(dataDir);
const steam = createSteam(dataDir);
const steamAssets = createSteamAssets(dataDir);
const arcade = createArcade(dataDir);
// MAME alternativo: un MAME más viejo para los juegos que el principal no puede correr (ver arcadeGames).
const legacyArcade = createArcade(dataDir, { slot: 'legacy' });
const arcadeFor = (game) => (game?.arcade?.engine === 'legacy' ? legacyArcade : arcade);
// Juegos de Arcade de los dos MAME: del alternativo sólo los que el principal no tiene (ni como versión regional
// ni con el mismo título), para que cada juego aparezca una vez y se abra con el MAME que lo corre.
const normalizedTitle = (name) =>
  String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const combineArcade = memo((main, older) => {
  if (!older.length) return main;
  const sets = new Set(main.flatMap((game) => [game.id, game.arcade.parent, ...game.arcade.versions.map((v) => v.id)]));
  const titles = new Set(main.map((game) => normalizedTitle(game.name)));
  const extra = older.filter(
    (game) =>
      ![game.id, ...game.arcade.versions.map((v) => v.id)].some((id) => sets.has(id)) &&
      !titles.has(normalizedTitle(game.name))
  );
  return extra.length ? [...main, ...extra] : main;
});
async function arcadeGames() {
  const [main, older] = await Promise.all([arcade.games(), legacyArcade.games()]);
  return combineArcade(main, older);
}
// Portable (B8): ¿los datos viven junto al .exe? Sólo tiene sentido con el ejecutable portable.
function portableInfo() {
  const folder = portableFolder(process.env.PORTABLE_EXECUTABLE_DIR);
  if (!folder) return { available: false };
  return { available: true, active: path.resolve(dataDir) === path.resolve(folder), folder };
}
// Búsqueda de juegos instalados con su avance por tienda (la primera vez, «Primeros pasos» lo muestra).
// Dos pedidos a la vez comparten la misma búsqueda.
const STORES = 6;
const scanProgress = { running: false, done: 0, total: STORES, found: {} };
let scanning = null;
function runScan() {
  scanning ??= (async () => {
    Object.assign(scanProgress, { running: true, done: 0, found: {} });
    try {
      const result = await scanLibrary({
        onSource: (platform, count) => {
          scanProgress.done += 1;
          scanProgress.found[platform] = count;
        }
      });
      log('info', 'biblioteca', `Búsqueda de juegos: ${result.games.length} encontrados`);
      return result;
    } finally {
      scanProgress.running = false;
      scanning = null;
    }
  })();
  return scanning;
}
// Fila única de tareas en segundo plano (B7): ver tasks.mjs.
const tasks = createTaskHub({ log });
const progressOf = (status) =>
  status?.running ? { phase: status.phase ?? null, done: status.done ?? 0, total: status.total ?? 0 } : null;
// Indexa un MAME y, si salió bien, pone en fila Wikipedia (y después IGDB) para los juegos de Arcade.
function queueArcade(slot) {
  const instance = slot === 'legacy' ? legacyArcade : arcade;
  return tasks.enqueue(
    slot === 'legacy' ? 'arcade-legacy' : 'arcade',
    slot === 'legacy' ? 'MAME alternativo' : 'Arcade (MAME)',
    async () => {
      await instance.start();
      if (!instance.status().error) queueArcadeInfo();
    },
    { progress: () => progressOf(instance.status()) }
  );
}
// Indexa los MAME configurados (el alternativo después del principal) y sigue con Wikipedia e IGDB.
async function startArcade() {
  if ((await arcade.settings()).exe) queueArcade('main');
  if ((await legacyArcade.settings()).exe) queueArcade('legacy');
}
function queueArcadeInfo() {
  return tasks.enqueue('wiki', 'Descripciones de Wikipedia', enrichArcade, {
    progress: () => progressOf(arcade.status())
  });
}
// IGDB: la lista de juegos se arma al empezar la tarea, con la biblioteca de ese momento.
function queueIgdb(gamesFor = async () => forIgdb((await library()).games)) {
  return tasks.enqueue('igdb', 'Información de IGDB', async () => igdb.start(await gamesFor()), {
    progress: () => progressOf(igdb.status())
  });
}
function queueSteam() {
  return tasks.enqueue('steam', 'Biblioteca de Steam', () => steam.sync(), { lightweight: true });
}
const wiki = createWiki();
// Aviso de versión nueva: el repositorio de publicaciones se indica en package.json (gml.releases).
const updates = createUpdates({
  current: appVersion,
  repository: (() => {
    if (process.env.GML_OFFLINE === '1') return null;
    try {
      return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).gml?.releases ?? null;
    } catch {
      return null;
    }
  })()
});
const isArcade = (game) => game.platform === 'Arcade';
// IGDB: los juegos de Arcade entran con el identificador que da Wikidata o con una búsqueda acotada a Arcade.
// Con colecciones muy grandes sólo se buscan los favoritos y los jugados, para no saturar los servicios.
const ARCADE_INFO_LIMIT = 300;
async function arcadeForInfo(games) {
  const arcadeGames = games.filter(isArcade);
  if (arcadeGames.length <= ARCADE_INFO_LIMIT) return arcadeGames;
  const prefs = await preferences();
  return arcadeGames.filter((game) => prefs.games[game.key]?.favorite || prefs.games[game.key]?.lastLaunchedAt);
}
async function forIgdb(games) {
  const chosen = new Set((await arcadeForInfo(games)).map((game) => game.key));
  return games.filter((game) => !isArcade(game) || chosen.has(game.key));
}
// Después de indexar Arcade: Wikipedia (descripción en español e identificador de IGDB) y, si IGDB está
// conectado, sus fichas. Como todo pasa por la fila, nunca corren dos a la vez.
async function enrichArcade() {
  const games = (await library()).games;
  await arcade.enrich(await arcadeForInfo(games), wiki);
  if ((await igdb.settings()).configured) queueIgdb(async () => forIgdb((await library()).games.filter(isArcade)));
}
const isSteamApp = (game) => game.platform === 'Steam' && /^\d+$/.test(game.id);
// Rutas clásicas de la CDN: alcanzan para saber si hay arte en línea sin consultar a Steam.
// GML_OFFLINE=1 (pruebas de interfaz): sólo imágenes locales, nunca descargas.
const offline = process.env.GML_OFFLINE === '1';
function onlineSources(game, meta, kind) {
  if (offline) return [];
  if (isArcade(game)) return arcade.onlineSources(game, kind);
  const sources = [];
  if (isSteamApp(game))
    sources.push(
      ...steamCdnAssets[kind].map((asset) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.id}/${asset}`)
    );
  const igdbImage =
    igdbImageSizes[kind] && imageUrl(kind === 'hero' ? meta?.artwork : meta?.cover, igdbImageSizes[kind]);
  if (igdbImage) sources.push(igdbImage);
  return sources;
}
function artwork(game, art, meta) {
  const online = (kind) => onlineSources(game, meta, kind).length > 0;
  const cover = art?.portrait
    ? 'portrait'
    : art?.landscape
      ? 'landscape'
      : art?.logo
        ? 'logo'
        : online('cover')
          ? 'portrait'
          : null;
  return {
    cover,
    hero: Boolean(art?.hero || online('hero')),
    wordmark: Boolean(art?.wordmark || online('wordmark')),
    background: art?.background ?? null
  };
}
async function localArt(art = {}, kind) {
  const candidates =
    kind === 'hero' ? [art?.hero] : kind === 'wordmark' ? [art?.wordmark] : [art?.portrait, art?.landscape, art?.logo];
  for (const file of candidates.filter(Boolean)) {
    const type = types[path.extname(file).toLowerCase()];
    if (!type?.startsWith('image/')) continue;
    try {
      return { bytes: await fs.readFile(file), type };
    } catch {
      /* el launcher pudo borrar la imagen desde el último escaneo */
    }
  }
  return null;
}
async function downloadArt(sources, file, missFile) {
  let reachable = false;
  for (const source of sources) {
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(8000) });
      reachable = true;
      if (!response.ok || !String(response.headers.get('content-type')).startsWith('image/')) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 5_000_000) continue;
      await fs.mkdir(artCacheDir, { recursive: true });
      // Temporal y renombre: un corte a mitad de la descarga no deja una imagen rota en la caché.
      const temporary = `${file}.${crypto.randomUUID()}.tmp`;
      await fs.writeFile(temporary, bytes);
      await fs.rename(temporary, file);
      return { bytes, type: imageType(bytes) };
    } catch {
      /* sin conexión o recurso inválido: se prueba el siguiente */
    }
  }
  // Sólo se recuerda la ausencia si algún servidor respondió; sin conexión se reintenta en la próxima carga.
  if (reachable) {
    await fs.mkdir(artCacheDir, { recursive: true });
    await fs.writeFile(missFile, '');
  }
  return null;
}
// Orden de descarga: la ruta vigente que informa la tienda de Steam, la ruta clásica, IGDB y, para la portada,
// la cabecera horizontal como último recurso.
async function downloadSources(game, meta, kind) {
  const classic = onlineSources(game, meta, kind);
  if (isArcade(game) && classic.length) return arcadeFor(game).resolveSources(game, kind, classic);
  if (!isSteamApp(game)) return classic;
  const current = (await steamAssets.urls(game.id)) ?? {};
  const header = kind === 'cover' ? classic.filter((url) => url.endsWith('/header.jpg')) : [];
  const rest = classic.filter((url) => !header.includes(url));
  return [...new Set([current[kind], ...rest, kind === 'cover' ? current.header : null, ...header].filter(Boolean))];
}
async function onlineArt(game, meta, kind) {
  const sources = await downloadSources(game, meta, kind);
  if (!sources.length) return null;
  // El nombre depende de las fuentes: si IGDB aporta una imagen nueva, no la bloquea una ausencia anterior.
  const name = crypto
    .createHash('sha256')
    .update(`${game.key}:${kind}:${sources.join('|')}`)
    .digest('hex')
    .slice(0, 20);
  const file = path.join(artCacheDir, `${name}.jpg`);
  const missFile = path.join(artCacheDir, `${name}.miss`);
  try {
    const bytes = await fs.readFile(file);
    return { bytes, type: imageType(bytes) };
  } catch {
    /* todavía no se descargó */
  }
  try {
    if (Date.now() - (await fs.stat(missFile)).mtimeMs < ART_RETRY_MS) return null;
  } catch {
    /* no hay ausencia registrada */
  }
  if (!pendingDownloads.has(file))
    pendingDownloads.set(
      file,
      downloadArt(sources, file, missFile).finally(() => pendingDownloads.delete(file))
    );
  return pendingDownloads.get(file);
}
async function gameArt(key, kind) {
  if (key.startsWith('arcade:')) {
    const game = (await arcadeGames()).find((item) => item.key === key);
    if (!game) return null;
    for (const file of await arcadeFor(game).localArt(game, kind)) {
      const local = await localArt(
        { [kind === 'hero' ? 'hero' : kind === 'wordmark' ? 'wordmark' : 'portrait']: file },
        kind
      );
      if (local) return local;
    }
    return onlineArt(game, null, kind);
  }
  const [catalog, metadata, account] = await Promise.all([rawLibrary(), igdb.metadata(), steam.account()]);
  const game = mergedLibrary(catalog.games, account).byKey.get(key);
  if (!game) return null;
  // Los juegos de la cuenta que no están instalados (y los inventarios anteriores, que no registraban el logo)
  // pueden tener el arte en la caché local del cliente de Steam: se busca ahí antes de descargar.
  const missing = kind === 'cover' ? !(game.art?.portrait || game.art?.landscape || game.art?.logo) : !game.art?.[kind];
  const art = missing && isSteamApp(game) ? { ...(await steamArtwork(game.id)), ...game.art } : game.art;
  return (await localArt(art, kind)) ?? (await onlineArt(game, metadata[key], kind));
}
function publicMeta(meta) {
  if (!meta?.igdbId) return null;
  const { cover, artwork: igdbArtwork, source, fetchedAt, ...rest } = meta;
  return { ...rest, ...(fetchedAt ? { fetchedAt } : {}) };
}
async function library() {
  const [catalog, prefs, metadata, account, arcadeList] = await Promise.all([
    rawLibrary(),
    preferences(),
    igdb.metadata(),
    steam.account(),
    arcadeGames()
  ]);
  return buildLibrary(catalog, prefs, metadata, account, arcadeList);
}
const buildLibrary = memo((catalog, prefs, metadata, account, arcadeList) => {
  const merged = mergedLibrary(catalog.games, account).list;
  return {
    ...catalog,
    steamUpdatedAt: account.updatedAt,
    lists: cleanLists(prefs.lists),
    games: [...merged, ...arcadeList].map(({ art, ...game }) => {
      const saved = prefs.games[game.key] ?? {};
      const name = displayName(game.name);
      return {
        ...game,
        name,
        ...(name !== game.name ? { originalName: game.name } : {}),
        artwork: isArcade(game)
          ? { cover: 'portrait', hero: true, wordmark: true, background: null }
          : artwork(game, art, metadata[game.key]),
        meta: metaEs(publicMeta(metadata[game.key]) ?? game.meta ?? null),
        ...(game.arcade?.category
          ? { arcade: { ...game.arcade, category: arcadeCategoryEs(game.arcade.category) } }
          : {}),
        favorite: false,
        tags: [],
        progress: 'Pendiente',
        rating: 0,
        notes: '',
        lastLaunchedAt: null,
        ...saved,
        launch: safeOverride(saved.launchOverride) ?? game.launch
      };
    })
  };
});
// La respuesta de /api/library se serializa una vez por versión de la biblioteca.
const libraryJson = memo((value) => JSON.stringify(value));
async function schedule() {
  if (process.platform !== 'win32') return { supported: false, configured: false };
  const script = `$task = Get-ScheduledTask -TaskName '${scheduleName}' -ErrorAction SilentlyContinue; if ($null -eq $task) { @{ configured = $false } | ConvertTo-Json -Compress } else { $info = Get-ScheduledTaskInfo -TaskName '${scheduleName}'; $trigger = $task.Triggers | Select-Object -First 1; [pscustomobject]@{ configured = $true; enabled = $task.State -ne 'Disabled'; nextRun = $info.NextRunTime; lastRun = $info.LastRunTime; time = if ($trigger.StartBoundary) { ([datetime]$trigger.StartBoundary).ToString('HH:mm') } else { $null } } | ConvertTo-Json -Compress }`;
  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
    return { supported: true, ...JSON.parse(stdout) };
  } catch {
    return { supported: true, configured: false };
  }
}
async function configureSchedule(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw badRequest('Indicá una hora válida en formato HH:MM.');
  if (process.platform !== 'win32') throw notImplemented('La indexación programada sólo está disponible en Windows.');
  const command = process.versions.electron
    ? `"${process.env.PORTABLE_EXECUTABLE_FILE || process.execPath}" --scan`
    : `"${process.execPath}" "${path.join(root, 'src', 'indexer.mjs')}"`;
  await execFileAsync('schtasks.exe', [
    '/Create',
    '/TN',
    scheduleName,
    '/TR',
    command,
    '/SC',
    'DAILY',
    '/ST',
    time,
    '/F'
  ]);
  return schedule();
}
async function health() {
  const catalog = await library();
  const groups = new Map();
  for (const game of catalog.games) {
    const item = groups.get(game.platform) ?? { platform: game.platform, total: 0, ready: 0, review: 0 };
    item.total += 1;
    item.ready += game.launch?.available ? 1 : 0;
    item.review += game.status === 'attention' ? 1 : 0;
    groups.set(game.platform, item);
  }
  return {
    total: catalog.games.length,
    ready: catalog.games.filter((game) => game.launch?.available).length,
    review: catalog.games.filter((game) => game.status === 'attention').length,
    generatedAt: catalog.generatedAt,
    platforms: [...groups.values()].sort((a, b) => a.platform.localeCompare(b.platform, 'es'))
  };
}
// Política de contenido: la interfaz sólo ejecuta sus propios scripts y sólo habla con este servidor. Las imágenes
// pueden venir de las tiendas (capturas de Steam e IGDB, arte de libretro), siempre por https.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'"
].join('; ');
// Sin cmd.exe: sus metacaracteres (&, |) permitirían encadenar comandos desde una ruta de lanzamiento.
function startDetached(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, detached: true, stdio: 'ignore' });
    child.once('error', () => reject(new Error('No se pudo iniciar el juego. Revisá la ruta de lanzamiento.')));
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}
async function launch(game) {
  if (!game.launch?.available) throw conflict(`El lanzamiento directo aún no está disponible para ${game.platform}.`);
  const { type, target } = game.launch;
  if (type === 'appsFolder') return startDetached('explorer.exe', [`shell:AppsFolder\\${target}`]);
  if (type === 'file' && /\.exe$/i.test(target)) return startDetached(target, [], { cwd: path.dirname(target) });
  return startDetached('explorer.exe', [target]);
}
const coverName = /^[a-f0-9]{20}\.(png|jpg|webp)$/;
function gameUpdate(current, update) {
  const next = { ...current };
  if (typeof update.favorite === 'boolean') next.favorite = update.favorite;
  if (Array.isArray(update.tags))
    next.tags = update.tags
      .map(String)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);
  if (['Pendiente', 'Jugando', 'Completado', 'Abandonado'].includes(update.progress)) next.progress = update.progress;
  if (Number.isInteger(update.rating) && update.rating >= 0 && update.rating <= 5) next.rating = update.rating;
  if (typeof update.notes === 'string') next.notes = update.notes.slice(0, 4000);
  if ('launchOverride' in update) next.launchOverride = safeOverride(update.launchOverride);
  return next;
}
function importedGame(saved) {
  const next = gameUpdate({}, saved);
  if (typeof saved.lastLaunchedAt === 'string' && !Number.isNaN(Date.parse(saved.lastLaunchedAt)))
    next.lastLaunchedAt = new Date(saved.lastLaunchedAt).toISOString();
  if (typeof saved.coverFile === 'string' && coverName.test(saved.coverFile)) next.coverFile = saved.coverFile;
  if (Number.isFinite(saved.playSeconds) && saved.playSeconds > 0) next.playSeconds = Math.round(saved.playSeconds);
  return next;
}
async function saveCover(update) {
  const match =
    typeof update.dataUrl === 'string' &&
    update.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw badRequest('La portada debe ser PNG, JPG o WebP.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 5_000_000) throw badRequest('La portada no puede superar 5 MB.');
  const name = `${crypto.createHash('sha256').update(update.key).digest('hex').slice(0, 20)}${extensionByMime[match[1]]}`;
  await fs.mkdir(coversDir, { recursive: true });
  const temporary = path.join(coversDir, `${name}.${crypto.randomUUID()}.tmp`);
  await fs.writeFile(temporary, bytes);
  await fs.rename(temporary, path.join(coversDir, name));
  return name;
}
function trustedRequest(req) {
  const host = String(req.headers.host || '');
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(host)) return false;
  const origin = req.headers.origin;
  return req.method === 'GET' || !origin || origin.toLowerCase() === `http://${host}`.toLowerCase();
}
const themes = ['system', 'light', 'dark'];
export async function appSettings() {
  const settings = (await preferences()).settings ?? {};
  // Oscuro primero: sin una elección guardada, la aplicación usa el tema oscuro.
  // Al iniciar un juego, la ventana se minimiza salvo que se haya desactivado.
  return {
    theme: themes.includes(settings.theme) ? settings.theme : 'dark',
    minimizeOnLaunch: settings.minimizeOnLaunch !== false,
    // «Primeros pasos» en Inicio: oculto si se descartó.
    onboardingDismissed: settings.onboardingDismissed === true
  };
}
// Sesiones medidas por el launcher: Arcade (abre y ve cerrarse a MAME) y, en Windows, cualquier juego con
// carpeta de instalación conocida (se vigilan sus procesos). Suman al tiempo jugado y quedan en sessions.json.
const sessionLog = createSessionLog(dataDir);
async function recordSession(game, { start, seconds, source }) {
  if (!Number.isFinite(seconds) || seconds < 5) return null;
  log('info', 'juego', `Sesión de ${Math.round(seconds)} s en ${game.key}`);
  const entry = await sessionLog.add({ key: game.key, name: game.name, start, seconds, source });
  await updatePreferences((prefs) => {
    const saved = prefs.games[game.key] ?? {};
    prefs.games[game.key] = { ...saved, playSeconds: (saved.playSeconds ?? 0) + Math.min(seconds, 86400) };
  });
  return entry;
}
// La interfaz puede registrar errores; se limita la cantidad para que un error en bucle no llene el disco.
let clientLogWindow = { start: 0, count: 0 };
function clientLogAllowed() {
  const now = Date.now();
  if (now - clientLogWindow.start > 60000) clientLogWindow = { start: now, count: 0 };
  clientLogWindow.count += 1;
  return clientLogWindow.count <= 30;
}
// Diagnóstico para exportar: versión, sistema, archivos de datos (tamaño, fecha y versión de esquema, nunca su
// contenido), juegos por tienda, integraciones conectadas (sin claves) y las últimas líneas del registro.
async function diagnostics() {
  const files = [];
  for (const name of (await fs.readdir(dataDir).catch(() => [])).sort()) {
    const info = await fs.stat(path.join(dataDir, name)).catch(() => null);
    if (!info?.isFile() || !name.endsWith('.json')) continue;
    const saved = info.size < 50_000_000 ? await readJsonCached(path.join(dataDir, name), null) : null;
    files.push({
      name,
      bytes: info.size,
      modifiedAt: info.mtime.toISOString(),
      schema: saved?.schemaVersion ?? saved?.schema ?? null,
      readable: saved !== null
    });
  }
  const catalog = await library().catch(() => ({ games: [] }));
  const byPlatform = {};
  for (const game of catalog.games) byPlatform[game.platform] = (byPlatform[game.platform] ?? 0) + 1;
  const [steamSettings, igdbSettings, arcadeInfo, legacyInfo, settings] = await Promise.all([
    steam.settings().catch((error) => ({ error: error.message })),
    igdb.settings().catch((error) => ({ error: error.message })),
    arcade.info().catch((error) => ({ error: error.message })),
    legacyArcade.info().catch((error) => ({ error: error.message })),
    appSettings()
  ]);
  return {
    generatedAt: new Date().toISOString(),
    app: { version: appVersion, electron: process.versions.electron ?? null, node: process.versions.node },
    system: { platform: process.platform, release: (await import('node:os')).release(), arch: process.arch },
    settings,
    library: { total: catalog.games.length, generatedAt: catalog.generatedAt ?? null, byPlatform },
    integrations: {
      steam: { configured: Boolean(steamSettings.configured), updatedAt: steamSettings.updatedAt ?? null },
      igdb: { configured: Boolean(igdbSettings.configured), status: igdb.status() },
      arcade: {
        configured: Boolean(arcadeInfo.exe || arcadeInfo.configured),
        version: arcadeInfo.version ?? null,
        visible: arcadeInfo.visible ?? null,
        legacy: {
          configured: Boolean(legacyInfo.exe || legacyInfo.configured),
          version: legacyInfo.version ?? null,
          visible: legacyInfo.visible ?? null
        }
      }
    },
    files,
    log: await recentLog(1500)
  };
}
// Rutas de la API agrupadas por dominio (src/routes/). Lo que no es /api se sirve desde public/.
export function createServer({ onSettingsChange, onLaunch, onGameExit, onRestart, listProcesses } = {}) {
  const router = createRouter();
  // Al cerrarse un juego medido: se guarda la sesión y la ventana vuelve al frente.
  async function finishSession(game, session) {
    const entry = await recordSession(game, session).catch((error) => {
      log('warn', 'juego', `No se pudo guardar la sesión de ${game.key}: ${error.message}`);
      return null;
    });
    if (entry) tasks.emit('session', entry);
    tasks.emit('library', { reason: 'session' });
    onGameExit?.(game, entry);
  }
  const tracker = createSessionTracker({
    ...(listProcesses ? { listProcesses } : {}),
    onEnd: (game, session) => finishSession(game, { ...session, source: 'proceso' }),
    onMissing: (game) => log('info', 'juego', `No se detectó el proceso de ${game.key}; la sesión no se mide`)
  });
  const deps = {
    library,
    libraryJson,
    health,
    preferences,
    updatePreferences,
    gameUpdate,
    saveCover,
    readCover,
    appSettings,
    themes,
    steam,
    igdb,
    arcade,
    legacyArcade,
    arcadeGames,
    startArcade,
    queueArcade,
    queueIgdb,
    queueSteam,
    tasks,
    forIgdb,
    // Primeros pasos (F1): juegos encontrados por tienda y qué falta conectar.
    portable: portableInfo,
    lists: createLists(updatePreferences),
    async copyToPortable() {
      const info = portableInfo();
      if (!info.available) throw conflict('Esta opción es sólo para el ejecutable portable.');
      if (info.active) throw conflict('Los datos ya están junto al ejecutable.');
      await copyToPortable(dataDir, info.folder);
      log('info', 'app', `Datos copiados junto al ejecutable: ${info.folder}`);
      if (onRestart) setTimeout(onRestart, 1500);
      return { ok: true, folder: info.folder, restart: Boolean(onRestart) };
    },
    async onboarding() {
      const [catalog, steamSettings, igdbSettings, arcadeSettings, legacySettings, settings] = await Promise.all([
        library(),
        steam.settings().catch(() => ({})),
        igdb.settings().catch(() => ({})),
        arcade.settings(),
        legacyArcade.settings(),
        appSettings()
      ]);
      const byPlatform = {};
      for (const game of catalog.games)
        if (game.platform !== 'Arcade' && game.installed !== false)
          byPlatform[game.platform] = (byPlatform[game.platform] ?? 0) + 1;
      return {
        dismissed: settings.onboardingDismissed,
        library: { generatedAt: catalog.generatedAt ?? null, byPlatform },
        scan: { ...scanProgress, found: { ...scanProgress.found }, queued: tasks.has('scan') },
        steam: { configured: Boolean(steamSettings.configured) },
        igdb: { configured: Boolean(igdbSettings.configured) },
        // Claves guardadas en otra PC o con otro usuario de Windows: hay que volver a conectar.
        needsReconnect: [steamSettings.needsReconnect && 'Steam', igdbSettings.needsReconnect && 'IGDB'].filter(
          Boolean
        ),
        portable: portableInfo(),
        arcade: {
          configured: Boolean(arcadeSettings.exe || legacySettings.exe),
          games: catalog.games.filter((game) => game.platform === 'Arcade').length
        }
      };
    },
    async activity(now = Date.now()) {
      const [sessions, catalog] = await Promise.all([sessionLog.list(), library()]);
      return buildActivity({ sessions, games: catalog.games, now });
    },
    gameArt,
    startDetached,
    schedule,
    configureSchedule,
    diagnostics,
    updates,
    clientLog,
    async scan() {
      const scanned = await tasks.enqueue('scan', 'Buscar juegos', runScan, {
        lightweight: true,
        progress: () =>
          scanProgress.running ? { phase: 'stores', done: scanProgress.done, total: scanProgress.total } : null
      });
      if ((await steam.settings()).configured) queueSteam();
      await startArcade();
      return scanned;
    },
    async play(game, key) {
      let tracked = false;
      if (game.launch?.type === 'mame') {
        tracked = true;
        await arcadeFor(game).launch(key.slice('arcade:'.length), async (seconds) => {
          const start = new Date(Date.now() - seconds * 1000).toISOString();
          await finishSession(game, { start, seconds, source: 'mame' });
        });
      } else {
        await launch(game);
        tracked = tracker.track(game);
      }
      log('info', 'juego', `Iniciado ${game.key} (${game.launch?.type ?? 'sin tipo'})`);
      await updatePreferences((prefs) => {
        prefs.games[game.key] = { ...(prefs.games[game.key] ?? {}), lastLaunchedAt: new Date().toISOString() };
      });
      // La aplicación de escritorio se minimiza para dejar el juego adelante.
      const minimize = (await appSettings()).minimizeOnLaunch;
      if (minimize) setTimeout(() => onLaunch?.(game), 1200);
      return { ok: true, minimize, tracked };
    },
    async importPreferences(imported) {
      const games = Object.fromEntries(
        Object.entries(imported.games)
          .filter(([, saved]) => saved && typeof saved === 'object')
          .map(([key, saved]) => [key, importedGame(saved)])
      );
      await updatePreferences((prefs) => ({
        ...prefs,
        games,
        ...(Array.isArray(imported.lists) ? { lists: cleanLists(imported.lists) } : {})
      }));
      log('info', 'preferencias', `Preferencias importadas: ${Object.keys(games).length} juegos`);
      return { ok: true };
    },
    async saveSettings(patch) {
      await updatePreferences((prefs) => ({ ...prefs, settings: { ...prefs.settings, ...patch } }));
      const settings = await appSettings();
      onSettingsChange?.(settings);
      return settings;
    }
  };
  libraryRoutes(router, deps);
  preferencesRoutes(router, deps);
  integrationRoutes(router, deps);
  systemRoutes(router, deps);

  const server = http.createServer(async (req, res) => {
    try {
      if (!trustedRequest(req)) return send(res, 403, JSON.stringify({ error: 'Solicitud no permitida.' }));
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (await router.handle(req, res, url)) return;
      if (url.pathname.startsWith('/api/')) return send(res, 404, JSON.stringify({ error: 'Ruta no encontrada.' }));
      if (req.method !== 'GET' && req.method !== 'HEAD')
        return send(res, 405, JSON.stringify({ error: 'Método no permitido.' }), undefined, { allow: 'GET' });
      return serveStatic(res, url);
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      if (status >= 500)
        log('error', 'servidor', `${req.method} ${req.url?.split('?')[0]}: ${error.message}`, error.stack);
      else log('info', 'servidor', `${status} ${req.method} ${req.url?.split('?')[0]}: ${error.message}`);
      if (res.headersSent) return res.end();
      return send(res, status, JSON.stringify({ error: error.message || 'Error inesperado.' }));
    }
  });
  server.on('close', () => {
    steam.close();
    tracker.stop();
  });
  return server;
}
async function serveStatic(res, url) {
  const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  let decoded;
  try {
    decoded = decodeURIComponent(relative);
  } catch {
    return send(res, 400, 'Dirección mal formada.', 'text/plain');
  }
  // Barras invertidas o «..» codificados nunca son una ruta válida de la interfaz (igual en Windows y en Linux).
  if (decoded.includes('\\') || decoded.split('/').includes('..'))
    return send(res, 403, 'Acceso denegado.', 'text/plain');
  const target = path.resolve(publicDir, decoded);
  if (!target.startsWith(publicDir + path.sep)) return send(res, 403, 'Acceso denegado.', 'text/plain');
  try {
    const bytes = await fs.readFile(target);
    const headers = target.endsWith('.html') ? { 'content-security-policy': CONTENT_SECURITY_POLICY } : {};
    return send(res, 200, bytes, types[path.extname(target)] || 'application/octet-stream', headers);
  } catch {
    return send(res, 404, 'No encontrado.', 'text/plain');
  }
}
// Portada propia: null si no existe, false si el nombre no es válido.
async function readCover(name) {
  if (!coverName.test(name)) return false;
  try {
    const target = path.join(coversDir, name);
    return { bytes: await fs.readFile(target), type: types[path.extname(target)] };
  } catch {
    return null;
  }
}
function clientLog(entry) {
  if (!clientLogAllowed()) return;
  log(
    ['info', 'warn', 'error'].includes(entry.level) ? entry.level : 'error',
    'interfaz',
    String(entry.message ?? '').slice(0, 1000),
    entry.detail ? String(entry.detail).slice(0, 2000) : undefined
  );
}
export function startServer(port = Number(process.env.PORT || 4321), options = {}) {
  const server = createServer(options);
  const updateSteam = setTimeout(async () => {
    try {
      const settings = await steam.settings();
      if (settings.configured && settings.stale) await queueSteam();
    } catch {}
  }, 1000);
  updateSteam.unref();
  server.listen(port, '127.0.0.1', () =>
    console.log(`Games Meta Launcher disponible en http://127.0.0.1:${server.address().port}`)
  );
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) startServer();
