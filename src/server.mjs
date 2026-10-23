import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { scanLibrary } from './indexer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const dataDir = process.env.GML_DATA_DIR ? path.resolve(process.env.GML_DATA_DIR) : path.join(root, 'data');
const dataPath = path.join(dataDir, 'library.json');
const preferencesPath = path.join(dataDir, 'preferences.json');
const coversDir = path.join(dataDir, 'covers');
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};
const extensionByMime = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };
const execFileAsync = promisify(execFile);
const scheduleName = 'Games Meta Launcher - Indexación nocturna';
async function readJson(target, fallback) {
  try {
    return JSON.parse(await fs.readFile(target, 'utf8'));
  } catch {
    return fallback;
  }
}
async function preferences() {
  const data = await readJson(preferencesPath, { games: {} });
  return data?.games ? data : { games: {} };
}
async function writePreferences(data) {
  await fs.mkdir(path.dirname(preferencesPath), { recursive: true });
  await fs.writeFile(preferencesPath, JSON.stringify(data, null, 2), 'utf8');
}
async function rawLibrary() {
  const catalog = await readJson(dataPath, null);
  return Array.isArray(catalog?.games) ? catalog : scanLibrary();
}
function safeOverride(value) {
  return value &&
    ['uri', 'file', 'appsFolder'].includes(value.type) &&
    typeof value.target === 'string' &&
    value.target.trim()
    ? { type: value.type, target: value.target.trim(), available: true }
    : null;
}
// Imágenes: primero las que guardan los launchers en esta PC; si faltan, la CDN pública de Steam.
const artCacheDir = path.join(dataDir, 'art-cache');
const ART_RETRY_MS = 7 * 24 * 60 * 60 * 1000;
const steamCdnAssets = { cover: ['library_600x900.jpg', 'header.jpg'], hero: ['library_hero.jpg'] };
const pendingDownloads = new Map();
function hasSteamCdn(game) {
  return game.platform === 'Steam' && /^\d+$/.test(game.id);
}
function artwork(game, art = {}) {
  const online = hasSteamCdn(game);
  const cover = art?.portrait
    ? 'portrait'
    : art?.landscape
      ? 'landscape'
      : art?.logo
        ? 'logo'
        : online
          ? 'portrait'
          : null;
  return { cover, hero: Boolean(art?.hero || online), background: art?.background ?? null };
}
async function localArt(art = {}, kind) {
  const candidates = kind === 'hero' ? [art?.hero] : [art?.portrait, art?.landscape, art?.logo];
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
async function downloadSteamArt(id, kind, file, missFile) {
  let reachable = false;
  for (const asset of steamCdnAssets[kind]) {
    try {
      const response = await fetch(`https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/${asset}`, {
        signal: AbortSignal.timeout(8000)
      });
      reachable = true;
      if (!response.ok || !String(response.headers.get('content-type')).startsWith('image/')) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 5_000_000) continue;
      await fs.mkdir(artCacheDir, { recursive: true });
      await fs.writeFile(file, bytes);
      return { bytes, type: types['.jpg'] };
    } catch {
      /* sin conexión o recurso inválido: se prueba el siguiente */
    }
  }
  // Sólo se recuerda la ausencia si Steam respondió; sin conexión se reintenta en la próxima carga.
  if (reachable) {
    await fs.mkdir(artCacheDir, { recursive: true });
    await fs.writeFile(missFile, '');
  }
  return null;
}
async function onlineArt(game, kind) {
  if (!hasSteamCdn(game)) return null;
  const name = crypto.createHash('sha256').update(`${game.key}:${kind}`).digest('hex').slice(0, 20);
  const file = path.join(artCacheDir, `${name}.jpg`);
  const missFile = path.join(artCacheDir, `${name}.miss`);
  try {
    return { bytes: await fs.readFile(file), type: types['.jpg'] };
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
      downloadSteamArt(game.id, kind, file, missFile).finally(() => pendingDownloads.delete(file))
    );
  return pendingDownloads.get(file);
}
async function gameArt(key, kind) {
  const catalog = await rawLibrary();
  const game = catalog.games.find((item) => item.key === key);
  if (!game) return null;
  return (await localArt(game.art, kind)) ?? (await onlineArt(game, kind));
}
async function library() {
  const [catalog, prefs] = await Promise.all([rawLibrary(), preferences()]);
  return {
    ...catalog,
    games: catalog.games.map(({ art, ...game }) => {
      const saved = prefs.games[game.key] ?? {};
      return {
        ...game,
        artwork: artwork(game, art),
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
}
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
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Indicá una hora válida en formato HH:MM.');
  if (process.platform !== 'win32') throw new Error('La indexación programada sólo está disponible en Windows.');
  const command = process.versions.electron
    ? `"${process.execPath}" --scan`
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
function reply(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}
async function body(req) {
  let value = '';
  for await (const chunk of req) {
    value += chunk;
    if (value.length > 8_000_000) throw new Error('Archivo o solicitud demasiado grande.');
  }
  return JSON.parse(value || '{}');
}
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
  if (!game.launch?.available) throw new Error(`El lanzamiento directo aún no está disponible para ${game.platform}.`);
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
  return next;
}
async function saveCover(update) {
  const match =
    typeof update.dataUrl === 'string' &&
    update.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('La portada debe ser PNG, JPG o WebP.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 5_000_000) throw new Error('La portada no puede superar 5 MB.');
  const name = `${crypto.createHash('sha256').update(update.key).digest('hex').slice(0, 20)}${extensionByMime[match[1]]}`;
  await fs.mkdir(coversDir, { recursive: true });
  await fs.writeFile(path.join(coversDir, name), bytes);
  return name;
}
function trustedRequest(req) {
  const host = String(req.headers.host || '');
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(host)) return false;
  const origin = req.headers.origin;
  return req.method === 'GET' || !origin || origin.toLowerCase() === `http://${host}`.toLowerCase();
}
export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (!trustedRequest(req)) return reply(res, 403, JSON.stringify({ error: 'Solicitud no permitida.' }));
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (req.method === 'GET' && url.pathname === '/api/library')
        return reply(res, 200, JSON.stringify(await library()));
      if (req.method === 'GET' && url.pathname === '/api/health')
        return reply(res, 200, JSON.stringify(await health()));
      if (req.method === 'GET' && url.pathname === '/api/schedule')
        return reply(res, 200, JSON.stringify(await schedule()));
      if (req.method === 'PUT' && url.pathname === '/api/schedule') {
        const update = await body(req);
        return reply(res, 200, JSON.stringify(await configureSchedule(String(update.time || ''))));
      }
      if (req.method === 'POST' && url.pathname === '/api/scan')
        return reply(res, 200, JSON.stringify(await scanLibrary()));
      if (req.method === 'GET' && url.pathname === '/api/preferences/export')
        return reply(res, 200, JSON.stringify(await preferences()), 'application/json; charset=utf-8');
      if (req.method === 'POST' && url.pathname === '/api/preferences/import') {
        const imported = await body(req);
        if (!imported?.games || typeof imported.games !== 'object')
          return reply(res, 400, JSON.stringify({ error: 'El archivo no contiene preferencias válidas.' }));
        const games = Object.fromEntries(
          Object.entries(imported.games)
            .filter(([, saved]) => saved && typeof saved === 'object')
            .map(([key, saved]) => [key, importedGame(saved)])
        );
        await writePreferences({ games });
        return reply(res, 200, JSON.stringify({ ok: true }));
      }
      if (req.method === 'POST' && url.pathname === '/api/covers') {
        const update = await body(req);
        if (!update.key) return reply(res, 400, JSON.stringify({ error: 'Falta el juego asociado a la portada.' }));
        const file = await saveCover(update);
        const prefs = await preferences();
        prefs.games[update.key] = { ...(prefs.games[update.key] ?? {}), coverFile: file };
        await writePreferences(prefs);
        return reply(res, 200, JSON.stringify({ coverFile: file }));
      }
      if (req.method === 'PUT' && url.pathname === '/api/preferences') {
        const update = await body(req);
        if (!update.key) return reply(res, 400, JSON.stringify({ error: 'Falta la clave del juego.' }));
        const prefs = await preferences();
        prefs.games[update.key] = gameUpdate(prefs.games[update.key] ?? {}, update);
        await writePreferences(prefs);
        return reply(res, 200, JSON.stringify(prefs.games[update.key]));
      }
      if (req.method === 'POST' && url.pathname.startsWith('/api/launch/')) {
        const game = (await library()).games.find(
          (item) => item.key === decodeURIComponent(url.pathname.slice('/api/launch/'.length))
        );
        if (!game) return reply(res, 404, JSON.stringify({ error: 'Juego no encontrado.' }));
        await launch(game);
        const prefs = await preferences();
        prefs.games[game.key] = { ...(prefs.games[game.key] ?? {}), lastLaunchedAt: new Date().toISOString() };
        await writePreferences(prefs);
        return reply(res, 200, JSON.stringify({ ok: true }));
      }
      const artRoute = req.method === 'GET' && url.pathname.match(/^\/api\/art\/(cover|hero)\/([^/]+)$/);
      if (artRoute) {
        const image = await gameArt(decodeURIComponent(artRoute[2]), artRoute[1]);
        if (!image) return reply(res, 404, 'Sin imagen.', 'text/plain');
        res.writeHead(200, { 'content-type': image.type, 'cache-control': 'private, max-age=3600' });
        return res.end(image.bytes);
      }
      if (req.method === 'GET' && url.pathname.startsWith('/covers/')) {
        const name = path.basename(url.pathname);
        const target = path.join(coversDir, name);
        if (!coverName.test(name)) return reply(res, 403, 'Acceso denegado.', 'text/plain');
        try {
          return reply(res, 200, await fs.readFile(target), types[path.extname(target)]);
        } catch {
          return reply(res, 404, 'No encontrado.', 'text/plain');
        }
      }
      const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
      const target = path.resolve(publicDir, relative);
      if (!target.startsWith(publicDir)) return reply(res, 403, 'Acceso denegado.', 'text/plain');
      try {
        return reply(res, 200, await fs.readFile(target), types[path.extname(target)] || 'application/octet-stream');
      } catch {
        return reply(res, 404, 'No encontrado.', 'text/plain');
      }
    } catch (error) {
      return reply(res, 500, JSON.stringify({ error: error.message || 'Error inesperado.' }));
    }
  });
}
export function startServer(port = Number(process.env.PORT || 4321)) {
  const server = createServer();
  server.listen(port, '127.0.0.1', () =>
    console.log(`Games Meta Launcher disponible en http://127.0.0.1:${server.address().port}`)
  );
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) startServer();
