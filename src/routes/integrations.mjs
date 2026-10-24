// Integraciones: Steam, IGDB y Arcade (MAME).
import { conflict, notFound, withStatus } from '../http.mjs';

export function integrationRoutes(router, d) {
  const { steam, igdb, arcade } = d;
  // Steam
  router.get('/api/integrations/steam', () => steam.settings());
  router.put('/api/integrations/steam', async ({ body }) => {
    const update = await body();
    await steam.connect(String(update.apiKey ?? '').trim(), String(update.steamId ?? '').trim());
    return steam.settings();
  });
  router.delete('/api/integrations/steam', async () => {
    await steam.disconnect();
    return { configured: false };
  });
  router.post('/api/steam/import-local', async () => {
    await steam.importLocal();
    return steam.settings();
  });
  router.post('/api/steam/sync', async () => {
    if (!(await steam.settings()).configured) throw conflict('Conectá Steam primero.');
    steam.sync().catch(() => {});
    return withStatus(202, await steam.settings());
  });
  router.get('/api/steam/games/:appid(\\d+)/:kind(details|achievements)', ({ params, query }) =>
    steam[params.kind](params.appid, query.get('refresh') === '1')
  );
  router.get('/api/steam/:kind(wishlist|followed|recommendations|friends|compare|owners)', ({ params, query }) =>
    steam.collection(params.kind, {
      force: query.get('refresh') === '1',
      otherSteamId: query.get('steamid'),
      appid: query.get('appid')
    })
  );

  // IGDB
  router.get('/api/integrations/igdb', () => igdb.settings());
  router.put('/api/integrations/igdb', async ({ body }) => {
    const update = await body();
    await igdb.connect(String(update.clientId ?? '').trim(), String(update.clientSecret ?? '').trim());
    igdb.start(await d.forIgdb((await d.library()).games));
    return { ...(await igdb.settings()), status: igdb.status() };
  });
  router.delete('/api/integrations/igdb', async () => {
    await igdb.disconnect();
    return igdb.settings();
  });
  router.get('/api/metadata/status', () => igdb.status());
  router.post('/api/metadata/refresh', async () => {
    if (!(await igdb.settings()).configured) throw conflict('Conectá IGDB en Configuración primero.');
    igdb.start(await d.forIgdb((await d.library()).games));
    return withStatus(202, igdb.status());
  });

  // Arcade
  router.get('/api/integrations/mame', () => arcade.info());
  router.put('/api/integrations/mame', async ({ body }) => {
    const update = await body();
    await arcade.configure(update);
    if ('exe' in update && (await arcade.settings()).exe) arcade.start(d.afterArcadeIndex);
    return arcade.info();
  });
  router.post('/api/mame/scan', async () => {
    if (!(await arcade.settings()).exe) throw conflict('Indicá dónde está mame.exe primero.');
    arcade.start(d.afterArcadeIndex);
    return withStatus(202, await arcade.info());
  });
  router.get('/api/arcade/:set([a-z0-9_]+)/commands', async ({ params }) => {
    const sections = await arcade.commands(params.set);
    if (!sections) throw notFound('Sin movimientos para este juego.');
    return { sections };
  });
}
