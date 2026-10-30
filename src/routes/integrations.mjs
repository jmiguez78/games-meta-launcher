// Integraciones: Steam, IGDB y Arcade (MAME).
import { conflict, notFound, withStatus } from '../http.mjs';

export function integrationRoutes(router, d) {
  const { steam, igdb, arcade, legacyArcade } = d;
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
  // MAME principal y, en «legacy», el MAME alternativo (más viejo) para los juegos que el principal no corre.
  // extra: juegos del alternativo que se suman a la biblioteca (los que el principal no tiene).
  const mameInfo = async () => {
    const [main, legacy, games] = await Promise.all([arcade.info(), legacyArcade.info(), d.arcadeGames()]);
    const extra = games.filter((game) => game.arcade.engine === 'legacy').length;
    return { ...main, legacy: { ...legacy, extra } };
  };
  router.get('/api/integrations/mame', mameInfo);
  router.put('/api/integrations/mame', async ({ body }) => {
    const update = await body();
    const { legacyExe, ...main } = update;
    await arcade.configure(main);
    if ('exe' in main && (await arcade.settings()).exe) arcade.start(d.afterArcadeIndex);
    if (legacyExe !== undefined) {
      await legacyArcade.configure({ exe: legacyExe });
      if ((await legacyArcade.settings()).exe) legacyArcade.start(d.afterArcadeIndex);
    }
    return mameInfo();
  });
  router.post('/api/mame/scan', async () => {
    if (!(await arcade.settings()).exe && !(await legacyArcade.settings()).exe)
      throw conflict('Indicá dónde está mame.exe primero.');
    await d.startArcade();
    return withStatus(202, await mameInfo());
  });
  router.get('/api/arcade/:set([a-z0-9_]+)/commands', async ({ params }) => {
    const sections = (await arcade.commands(params.set)) ?? (await legacyArcade.commands(params.set));
    if (!sections) throw notFound('Sin movimientos para este juego.');
    return { sections };
  });
}
