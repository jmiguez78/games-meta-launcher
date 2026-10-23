import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanLibrary } from './indexer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const dataPath = path.join(root, 'data', 'library.json');
const port = Number(process.env.PORT || 4321);
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

async function library() {
  try { return JSON.parse(await fs.readFile(dataPath, 'utf8')); }
  catch { return await scanLibrary(); }
}
function reply(res, code, body, type = 'application/json; charset=utf-8') { res.writeHead(code, { 'content-type': type }); res.end(body); }
function launch(uri) { spawn('cmd.exe', ['/c', 'start', '', uri], { detached: true, stdio: 'ignore' }).unref(); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/api/library') return reply(res, 200, JSON.stringify(await library()));
  if (req.method === 'POST' && url.pathname === '/api/scan') return reply(res, 200, JSON.stringify(await scanLibrary()));
  if (req.method === 'POST' && url.pathname.startsWith('/api/launch/')) {
    const game = (await library()).games.find((item) => item.key === decodeURIComponent(url.pathname.slice('/api/launch/'.length)));
    if (!game) return reply(res, 404, JSON.stringify({ error: 'Juego no encontrado.' }));
    if (!game.launcherUri) return reply(res, 409, JSON.stringify({ error: `El lanzamiento directo aún no está disponible para ${game.platform}.` }));
    launch(game.launcherUri); return reply(res, 200, JSON.stringify({ ok: true }));
  }
  const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const target = path.resolve(publicDir, relative);
  if (!target.startsWith(publicDir)) return reply(res, 403, 'Acceso denegado.', 'text/plain');
  try { return reply(res, 200, await fs.readFile(target), types[path.extname(target)] || 'application/octet-stream'); }
  catch { return reply(res, 404, 'No encontrado.', 'text/plain'); }
});
server.listen(port, () => console.log(`Games Meta Launcher disponible en http://localhost:${port}`));
