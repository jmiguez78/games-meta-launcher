// Tus capturas: las de cada juego, las últimas de todos, las carpetas que se revisan y los archivos.
import { HANDLED, notFound, send } from '../http.mjs';

const refreshOf = (query) => ({ refresh: query.get('refresh') === '1' });

export function screenshotRoutes(router, d) {
  router.get('/api/screenshots/game/:key', ({ params, query }) => d.screenshots.forGame(params.key, refreshOf(query)));
  router.get('/api/screenshots/recent', ({ query }) => {
    const limit = Number(query.get('limit'));
    return d.screenshots.recent(Number.isInteger(limit) && limit > 0 ? Math.min(limit, 60) : 12, refreshOf(query));
  });
  router.get('/api/screenshots/folders', async ({ query }) => ({
    folders: await d.screenshots.folders(refreshOf(query))
  }));
  router.put('/api/screenshots/folders', async ({ body }) => ({
    folders: await d.saveScreenshotFolders((await body()).folders)
  }));
  router.get('/api/screenshots/file/:id([a-f0-9]{20})', async ({ res, params, query }) => {
    const image = await d.screenshots.file(params.id, { thumb: query.get('thumb') === '1' });
    if (!image) throw notFound('No se encontró la captura.');
    send(res, 200, image.bytes, image.type, { 'cache-control': 'private, max-age=86400' });
    return HANDLED;
  });
  router.post('/api/screenshots/file/:id([a-f0-9]{20})/open', ({ params }) => d.openScreenshot(params.id));
}
