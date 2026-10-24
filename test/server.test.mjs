import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-test-'));
process.env.GML_DATA_DIR = dataDir;
const { createServer } = await import('../src/server.mjs');

const catalog = {
  schema: 2,
  generatedAt: '2026-10-23T00:00:00.000Z',
  games: [
    {
      key: 'steam:10',
      id: '10',
      name: 'Counter-Strike',
      platform: 'Steam',
      drive: 'C:',
      location: 'C:\\Steam\\cs',
      launch: { type: 'uri', target: 'steam://run/10', available: true },
      status: 'installed',
      evidence: '',
      art: { portrait: path.join(dataDir, 'portada-local.jpg'), wordmark: path.join(dataDir, 'logo-local.png') }
    },
    {
      key: 'epic games:x',
      id: 'x',
      name: 'Tiny Lands - Windows',
      platform: 'Epic Games',
      drive: 'E:',
      location: 'E:\\Epic\\tiny',
      launch: null,
      status: 'attention',
      evidence: ''
    },
    {
      key: 'gog galaxy:roto',
      id: 'roto',
      name: 'Juego roto',
      platform: 'GOG Galaxy',
      drive: 'C:',
      location: 'C:\\no-existe',
      launch: { type: 'file', target: 'C:\\no-existe\\juego.exe', available: true },
      status: 'installed',
      evidence: ''
    }
  ]
};

let server;
let base;
before(async () => {
  await fs.writeFile(path.join(dataDir, 'library.json'), JSON.stringify(catalog));
  await fs.writeFile(path.join(dataDir, 'portada-local.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  await fs.writeFile(
    path.join(dataDir, 'logo-local.png'),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  );
  await fs.writeFile(
    path.join(dataDir, 'metadata.json'),
    JSON.stringify({
      games: {
        'gog galaxy:roto': {
          igdbId: 7,
          title: 'Roto',
          summary: 'Resumen',
          genres: ['RPG'],
          cover: 'co7',
          artwork: null,
          fetchedAt: '2026-10-23T22:34:58.000Z',
          source: { id: 7, screenshots: [{ image_id: 'internal' }] },
          languages: [{ name: 'Spanish', support: 'Subtitles' }]
        },
        'epic games:x': { igdbId: null, fetchedAt: 'x' }
      }
    })
  );
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.close();
  await fs.rm(dataDir, { recursive: true, force: true });
});

const json = (body) => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
// fetch normaliza rutas y fija Host; http.request envía la solicitud tal cual.
const rawStatus = (target, headers = {}) =>
  new Promise((resolve, reject) => {
    http
      .request({ host: '127.0.0.1', port: server.address().port, path: target, headers }, (res) => {
        res.resume();
        resolve(res.statusCode);
      })
      .on('error', reject)
      .end();
  });
const preferencesFile = async () => JSON.parse(await fs.readFile(path.join(dataDir, 'preferences.json'), 'utf8'));

test('la biblioteca combina el inventario con valores personales por defecto', async () => {
  const library = await (await fetch(`${base}/api/library`)).json();
  assert.equal(library.games.length, 3);
  assert.deepEqual(
    {
      favorite: library.games[0].favorite,
      tags: library.games[0].tags,
      progress: library.games[0].progress,
      rating: library.games[0].rating
    },
    { favorite: false, tags: [], progress: 'Pendiente', rating: 0 }
  );
  const tiny = library.games.find((game) => game.key === 'epic games:x');
  assert.equal(tiny.name, 'Tiny Lands');
  assert.equal(tiny.originalName, 'Tiny Lands - Windows');
  assert.equal(library.games[0].originalName, undefined);
});

test('el diagnóstico agrupa juegos listos y en revisión por plataforma', async () => {
  const health = await (await fetch(`${base}/api/health`)).json();
  assert.equal(health.total, 3);
  assert.equal(health.ready, 2);
  assert.equal(health.review, 1);
  assert.deepEqual(
    health.platforms.map((item) => item.platform),
    ['Epic Games', 'GOG Galaxy', 'Steam']
  );
});

test('las preferencias ignoran valores inválidos', async () => {
  const response = await fetch(`${base}/api/preferences`, {
    method: 'PUT',
    ...json({ key: 'steam:10', favorite: true, rating: 9, progress: '<b>x</b>', tags: [' rpg ', '', 'coop'] })
  });
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved.favorite, true);
  assert.equal(saved.rating, undefined);
  assert.equal(saved.progress, undefined);
  assert.deepEqual(saved.tags, ['rpg', 'coop']);
});

test('la importación valida cada juego del respaldo', async () => {
  const backup = {
    games: {
      'steam:10': {
        favorite: true,
        progress: '<img src=x onerror=alert(1)>',
        rating: 4,
        notes: 'ok',
        lastLaunchedAt: 'ayer',
        coverFile: '../../evil.png'
      }
    }
  };
  const response = await fetch(`${base}/api/preferences/import`, { method: 'POST', ...json(backup) });
  assert.equal(response.status, 200);
  const saved = (await preferencesFile()).games['steam:10'];
  assert.deepEqual(saved, { favorite: true, rating: 4, notes: 'ok' });
});

test('rechaza solicitudes de otros orígenes o con Host ajeno', async () => {
  const crossOrigin = await fetch(`${base}/api/preferences`, {
    method: 'PUT',
    headers: { origin: 'https://evil.example' },
    body: '{"key":"steam:10","favorite":false}'
  });
  assert.equal(crossOrigin.status, 403);
  assert.equal(await rawStatus('/api/library', { host: 'evil.example' }), 403);
});

test('no sirve archivos fuera de las carpetas públicas', async () => {
  assert.equal(await rawStatus('/covers/..%5Cpreferences.json'), 403);
  assert.equal(await rawStatus('/../package.json'), 404);
  assert.equal(await rawStatus('/..%5Cpackage.json'), 404);
});

test('responde 404 al lanzar un juego inexistente', async () => {
  assert.equal((await fetch(`${base}/api/launch/steam%3A999`, { method: 'POST' })).status, 404);
});

test('informa el error si el ejecutable no existe, sin detener el servidor', async () => {
  const response = await fetch(`${base}/api/launch/${encodeURIComponent('gog galaxy:roto')}`, { method: 'POST' });
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /No se pudo iniciar/);
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
});

test('la biblioteca resume las imágenes disponibles sin exponer rutas locales', async () => {
  const library = await (await fetch(`${base}/api/library`)).json();
  const steam = library.games.find((game) => game.key === 'steam:10');
  const epic = library.games.find((game) => game.key === 'epic games:x');
  assert.equal(steam.art, undefined);
  assert.deepEqual(steam.artwork, { cover: 'portrait', hero: true, wordmark: true, background: null });
  assert.deepEqual(epic.artwork, { cover: null, hero: false, wordmark: false, background: null });
});

test('sirve la imagen local y responde 404 cuando no hay ninguna fuente', async () => {
  const local = await fetch(`${base}/api/art/cover/steam%3A10`);
  assert.equal(local.status, 200);
  assert.equal(local.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual([...new Uint8Array(await local.arrayBuffer())], [0xff, 0xd8, 0xff, 0xd9]);
  assert.equal((await fetch(`${base}/api/art/cover/${encodeURIComponent('epic games:x')}`)).status, 404);
  assert.equal((await fetch(`${base}/api/art/otro/steam%3A10`)).status, 404);
  const logo = await fetch(`${base}/api/art/wordmark/steam%3A10`);
  assert.equal(logo.status, 200);
  assert.equal(logo.headers.get('content-type'), 'image/png');
  assert.equal((await fetch(`${base}/api/art/wordmark/${encodeURIComponent('epic games:x')}`)).status, 404);
});

test('agrega los metadatos de IGDB sin exponer identificadores internos de imágenes', async () => {
  const library = await (await fetch(`${base}/api/library`)).json();
  const roto = library.games.find((game) => game.key === 'gog galaxy:roto');
  assert.deepEqual(roto.meta, {
    igdbId: 7,
    title: 'Roto',
    summary: 'Resumen',
    genres: ['Rol'],
    fetchedAt: '2026-10-23T22:34:58.000Z',
    languages: [{ name: 'Spanish', support: 'Subtitles' }]
  });
  assert.equal(roto.meta.source, undefined);
  assert.deepEqual(roto.artwork, { cover: 'portrait', hero: false, wordmark: false, background: null });
  assert.equal(library.games.find((game) => game.key === 'epic games:x').meta, null);
});

test('la integración informa que no está configurada y no expone secretos', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/integrations/igdb`)).json(), { configured: false, clientId: '' });
  const refresh = await fetch(`${base}/api/metadata/refresh`, { method: 'POST' });
  assert.equal(refresh.status, 400);
  const invalid = await fetch(`${base}/api/integrations/igdb`, {
    method: 'PUT',
    ...json({ clientId: 'abc; rm', clientSecret: 'x' })
  });
  assert.equal(invalid.status, 500);
  assert.match((await invalid.json()).error, /letras y números/);
});

test('guarda el tema y lo conserva al restaurar un respaldo', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/settings`)).json(), { theme: 'dark', minimizeOnLaunch: true });
  const invalid = await fetch(`${base}/api/settings`, { method: 'PUT', ...json({ theme: 'rosa' }) });
  assert.equal(invalid.status, 400);
  const saved = await fetch(`${base}/api/settings`, { method: 'PUT', ...json({ theme: 'light' }) });
  assert.deepEqual(await saved.json(), { theme: 'light', minimizeOnLaunch: true });
  const minimize = await fetch(`${base}/api/settings`, { method: 'PUT', ...json({ minimizeOnLaunch: false }) });
  assert.deepEqual(await minimize.json(), { theme: 'light', minimizeOnLaunch: false });
  assert.equal(
    (await fetch(`${base}/api/settings`, { method: 'PUT', ...json({ minimizeOnLaunch: 'sí' }) })).status,
    400
  );
  await fetch(`${base}/api/preferences/import`, { method: 'POST', ...json({ games: {} }) });
  assert.deepEqual(await (await fetch(`${base}/api/settings`)).json(), { theme: 'light', minimizeOnLaunch: false });
});

test('Arcade sin MAME configurado no indexa ni rompe la biblioteca', async () => {
  const info = await (await fetch(`${base}/api/integrations/mame`)).json();
  assert.equal(info.configured, false);
  assert.equal((await fetch(`${base}/api/mame/scan`, { method: 'POST' })).status, 400);
  const invalid = await fetch(`${base}/api/integrations/mame`, { method: 'PUT', ...json({ exe: 'C:\\juego.exe' }) });
  assert.equal(invalid.status, 500);
  assert.match((await invalid.json()).error, /mame.exe/);
  assert.equal((await fetch(`${base}/api/launch/arcade%3Apacman`, { method: 'POST' })).status, 404);
});

test('Steam sin cuenta no expone secretos ni permite instalar un juego ajeno', async () => {
  const settings = await (await fetch(`${base}/api/integrations/steam`)).json();
  assert.equal(settings.configured, false);
  assert.equal(settings.apiKey, undefined);
  assert.equal((await fetch(`${base}/api/steam/sync`, { method: 'POST' })).status, 400);
  const result = await fetch(`${base}/api/install/steam%3A10`, { method: 'POST' });
  assert.equal(result.status, 400);
});

test('la interfaz usa una política de contenido estricta', async () => {
  const response = await fetch(`${base}/`);
  const policy = response.headers.get('content-security-policy');
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /script-src 'self'(;|$)/);
  assert.match(policy, /connect-src 'self'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('los cambios simultáneos de preferencias no se pisan y el archivo queda versionado', async () => {
  const keys = Array.from({ length: 12 }, (_, i) => 'steam:9' + i);
  await Promise.all(
    keys.map((key, i) =>
      fetch(`${base}/api/preferences`, { method: 'PUT', ...json({ key, favorite: true, rating: (i % 5) + 1 }) })
    )
  );
  const saved = await preferencesFile();
  for (const key of keys) assert.equal(saved.games[key].favorite, true);
  assert.equal(saved.schemaVersion, 1);
  assert.deepEqual(
    (await fs.readdir(dataDir)).filter((name) => name.endsWith('.tmp')),
    []
  );
});

test('la biblioteca se reutiliza mientras nada cambie y se actualiza al cambiar un archivo', async () => {
  const first = await (await fetch(`${base}/api/library`)).text();
  assert.equal(await (await fetch(`${base}/api/library`)).text(), first);
  await fetch(`${base}/api/preferences`, { method: 'PUT', ...json({ key: 'steam:10', notes: 'cambio' }) });
  const after = await (await fetch(`${base}/api/library`)).json();
  assert.equal(after.games.find((game) => game.key === 'steam:10').notes, 'cambio');
});

test('registra errores de la interfaz y exporta un diagnóstico sin secretos', async () => {
  const logged = await fetch(`${base}/api/log`, {
    method: 'POST',
    ...json({ level: 'error', message: 'Falla de prueba', detail: 'pila' })
  });
  assert.equal(logged.status, 204);
  const report = await (await fetch(`${base}/api/diagnostics`)).json();
  assert.ok(report.app.version);
  assert.equal(report.library.total >= 3, true);
  assert.ok(report.files.some((file) => file.name === 'preferences.json' && file.schema === 1));
  assert.ok(report.log.some((line) => /\[error\] interfaz: Falla de prueba \| pila/.test(line)));
  const text = JSON.stringify(report);
  // Ninguna clave ni secreto guardado (los mensajes de error pueden nombrarlos, pero nunca incluir su valor).
  assert.equal(/"(apiKey|clientSecret|secret)"\s*:/.test(text), false);
  assert.equal(text.includes('cambio'), false, text.match(/.{80}cambio.{40}/)?.[0]);
});
