// Tus capturas: las de cada juego, las últimas de todos, las carpetas que se revisan y los archivos.
import fs from 'node:fs';
import { HANDLED, notFound, send } from '../http.mjs';

// Videos por partes: el reproductor pide sólo el tramo que necesita (los de Game Bar pueden pesar varios GB).
const CHUNK = 4 * 1024 * 1024;
function streamVideo(req, res, video) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''));
  const base = {
    'accept-ranges': 'bytes',
    'cache-control': 'private, max-age=3600',
    'x-content-type-options': 'nosniff'
  };
  let start = 0;
  let end = video.size - 1;
  let status = 200;
  if (match && (match[1] || match[2])) {
    if (match[1]) {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), video.size - 1) : Math.min(start + CHUNK - 1, video.size - 1);
    } else start = Math.max(0, video.size - Number(match[2]));
    if (start > end || start >= video.size) {
      res.writeHead(416, { ...base, 'content-range': `bytes */${video.size}` });
      res.end();
      return;
    }
    status = 206;
    base['content-range'] = `bytes ${start}-${end}/${video.size}`;
  }
  res.writeHead(status, { ...base, 'content-type': video.type, 'content-length': String(end - start + 1) });
  if (req.method === 'HEAD') return res.end();
  const stream = fs.createReadStream(video.file, { start, end });
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}

const refreshOf = (query) => ({ refresh: query.get('refresh') === '1' });

export function screenshotRoutes(router, d) {
  router.get('/api/screenshots/game/:key', ({ params, query }) => d.screenshots.forGame(params.key, refreshOf(query)));
  router.get('/api/screenshots/recent', ({ query }) => {
    const limit = Number(query.get('limit'));
    const kind = ['image', 'video'].includes(query.get('kind')) ? query.get('kind') : undefined;
    return d.screenshots.recent(Number.isInteger(limit) && limit > 0 ? Math.min(limit, 60) : 12, {
      ...refreshOf(query),
      kind
    });
  });
  router.get('/api/screenshots/folders', async ({ query }) => ({
    folders: await d.screenshots.folders(refreshOf(query))
  }));
  router.put('/api/screenshots/folders', async ({ body }) => ({
    folders: await d.saveScreenshotFolders((await body()).folders)
  }));
  router.get('/api/screenshots/video/:id([a-f0-9]{20})', async ({ req, res, params }) => {
    const video = await d.screenshots.video(params.id);
    if (!video) throw notFound('No se encontró el video.');
    streamVideo(req, res, video);
    return HANDLED;
  });
  router.get('/api/screenshots/file/:id([a-f0-9]{20})', async ({ res, params, query }) => {
    const image = await d.screenshots.file(params.id, { thumb: query.get('thumb') === '1' });
    if (!image) throw notFound('No se encontró la captura.');
    send(res, 200, image.bytes, image.type, { 'cache-control': 'private, max-age=86400' });
    return HANDLED;
  });
  router.post('/api/screenshots/file/:id([a-f0-9]{20})/open', ({ params }) => d.openScreenshot(params.id));
}
