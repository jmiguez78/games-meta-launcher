import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanLibrary } from './indexer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public'); const dataPath = path.join(root, 'data', 'library.json'); const preferencesPath = path.join(root, 'data', 'preferences.json');
const port = Number(process.env.PORT || 4321); const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
async function readJson(target, fallback) { try { return JSON.parse(await fs.readFile(target, 'utf8')); } catch { return fallback; } }
async function preferences() { return readJson(preferencesPath, { games: {} }); }
async function writePreferences(data) { await fs.mkdir(path.dirname(preferencesPath), { recursive: true }); await fs.writeFile(preferencesPath, JSON.stringify(data, null, 2), 'utf8'); }
async function rawLibrary() { return readJson(dataPath, null) ?? scanLibrary(); }
async function library() { const [catalog, prefs] = await Promise.all([rawLibrary(), preferences()]); return { ...catalog, games: catalog.games.map((game) => ({ ...game, favorite: false, tags: [], lastLaunchedAt: null, ...prefs.games[game.key] })) }; }
function reply(res, code, body, type = 'application/json; charset=utf-8') { res.writeHead(code, { 'content-type': type }); res.end(body); }
async function body(req) { let value = ''; for await (const chunk of req) { value += chunk; if (value.length > 50_000) throw new Error('Solicitud demasiado grande.'); } return JSON.parse(value || '{}'); }
function startTarget(target) { spawn('cmd.exe', ['/c', 'start', '', target], { detached: true, stdio: 'ignore' }).unref(); }
function launch(game) { if (!game.launch?.available) throw new Error(`El lanzamiento directo aún no está disponible para ${game.platform}.`); startTarget(game.launch.type === 'appsFolder' ? `shell:AppsFolder\\${game.launch.target}` : game.launch.target); }
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/api/library') return reply(res, 200, JSON.stringify(await library()));
    if (req.method === 'POST' && url.pathname === '/api/scan') return reply(res, 200, JSON.stringify(await scanLibrary()));
    if (req.method === 'PUT' && url.pathname === '/api/preferences') {
      const update = await body(req); if (!update.key) return reply(res, 400, JSON.stringify({ error: 'Falta la clave del juego.' }));
      const prefs = await preferences(); const current = prefs.games[update.key] ?? {};
      prefs.games[update.key] = { ...current, ...(typeof update.favorite === 'boolean' ? { favorite: update.favorite } : {}), ...(Array.isArray(update.tags) ? { tags: update.tags.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 12) } : {}) };
      await writePreferences(prefs); return reply(res, 200, JSON.stringify(prefs.games[update.key]));
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/launch/')) {
      const game = (await library()).games.find((item) => item.key === decodeURIComponent(url.pathname.slice('/api/launch/'.length))); if (!game) return reply(res, 404, JSON.stringify({ error: 'Juego no encontrado.' }));
      launch(game); const prefs = await preferences(); prefs.games[game.key] = { ...(prefs.games[game.key] ?? {}), lastLaunchedAt: new Date().toISOString() }; await writePreferences(prefs); return reply(res, 200, JSON.stringify({ ok: true }));
    }
    const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, ''); const target = path.resolve(publicDir, relative); if (!target.startsWith(publicDir)) return reply(res, 403, 'Acceso denegado.', 'text/plain');
    try { return reply(res, 200, await fs.readFile(target), types[path.extname(target)] || 'application/octet-stream'); } catch { return reply(res, 404, 'No encontrado.', 'text/plain'); }
  } catch (error) { return reply(res, 500, JSON.stringify({ error: error.message || 'Error inesperado.' })); }
});
server.listen(port, () => console.log(`Games Meta Launcher disponible en http://localhost:${port}`));
