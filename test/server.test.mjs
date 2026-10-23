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
      art: { portrait: path.join(dataDir, 'portada-local.jpg') }
    },
    {
      key: 'epic games:x',
      id: 'x',
      name: 'Tiny Lands',
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
  assert.deepEqual(steam.artwork, { cover: 'portrait', hero: true, background: null });
  assert.deepEqual(epic.artwork, { cover: null, hero: false, background: null });
});

test('sirve la imagen local y responde 404 cuando no hay ninguna fuente', async () => {
  const local = await fetch(`${base}/api/art/cover/steam%3A10`);
  assert.equal(local.status, 200);
  assert.equal(local.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual([...new Uint8Array(await local.arrayBuffer())], [0xff, 0xd8, 0xff, 0xd9]);
  assert.equal((await fetch(`${base}/api/art/cover/${encodeURIComponent('epic games:x')}`)).status, 404);
  assert.equal((await fetch(`${base}/api/art/otro/steam%3A10`)).status, 404);
});
