// Biblioteca: inventario, estado, búsqueda de juegos, jugar, instalar e imágenes.
import { HANDLED, badRequest, notFound, send } from '../http.mjs';

const ART_WAIT_MS = 1500;
const PENDING = Symbol('descargando');

export function libraryRoutes(router, d) {
  router.get('/api/library', async ({ res }) => {
    send(res, 200, d.libraryJson(await d.library()));
    return HANDLED;
  });
  router.get('/api/health', () => d.health());
  router.get('/api/onboarding', () => d.onboarding());
  // now: la hora de la interfaz (el mismo equipo); define qué semana es «esta».
  router.get('/api/activity', ({ query }) => {
    const now = Number(query.get('now'));
    return d.activity(Number.isFinite(now) && now > 0 ? now : Date.now());
  });
  router.post('/api/scan', () => d.scan());
  router.post('/api/launch/:key', async ({ params }) => {
    const games = (await d.library()).games;
    // Una versión regional de Arcade se juega con su set, pero el tiempo se suma al juego.
    const game =
      games.find((item) => item.key === params.key) ??
      (params.key.startsWith('arcade:')
        ? games.find((item) => item.arcade?.versions.some((version) => `arcade:${version.id}` === params.key))
        : null);
    if (!game) throw notFound('Juego no encontrado.');
    return d.play(game, params.key);
  });
  router.post('/api/install/:key', async ({ params }) => {
    const game = (await d.library()).games.find((item) => item.key === params.key);
    if (!game || game.platform !== 'Steam' || game.ownership !== 'owned' || !/^\d+$/.test(game.id))
      throw badRequest('Este juego no tiene una instalación de Steam disponible desde tu biblioteca.');
    await d.startDetached('explorer.exe', [`steam://install/${game.id}`]);
    return { ok: true };
  });
  // Una imagen que todavía se está descargando no retiene la conexión: el navegador abre pocas a la vez y
  // las portadas ya guardadas quedarían esperando detrás. Pasado ARTWAIT_MS se responde 503 y la descarga
  // sigue; la interfaz vuelve a pedirla cuando la portada está a la vista.
  router.get('/api/art/:kind(cover|hero|wordmark)/:key', async ({ res, params }) => {
    let timer;
    const image = await Promise.race([
      d.gameArt(params.key, params.kind),
      new Promise((resolve) => (timer = setTimeout(resolve, ART_WAIT_MS, PENDING)))
    ]).finally(() => clearTimeout(timer));
    if (image === PENDING) {
      send(res, 503, 'Descargando la imagen.', 'text/plain', { 'retry-after': '3' });
      return HANDLED;
    }
    if (!image) {
      send(res, 404, 'Sin imagen.', 'text/plain');
      return HANDLED;
    }
    send(res, 200, image.bytes, image.type, { 'cache-control': 'private, max-age=3600' });
    return HANDLED;
  });
  router.get('/covers/:name', async ({ res, params }) => {
    const cover = await d.readCover(params.name);
    if (cover === null) send(res, 404, 'No encontrado.', 'text/plain');
    else if (cover === false) send(res, 403, 'Acceso denegado.', 'text/plain');
    else send(res, 200, cover.bytes, cover.type);
    return HANDLED;
  });
}
