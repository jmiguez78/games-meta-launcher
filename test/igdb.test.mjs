import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageUrl, normalizeTitle, toMetadata, safeWebUrl, createIgdb } from '../src/igdb.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('normaliza títulos de launchers para buscarlos en IGDB', () => {
  assert.equal(normalizeTitle('Spiritfarer®: Farewell Edition'), 'spiritfarer farewell edition');
  assert.equal(normalizeTitle('A Plague Tale: Requiem - Windows'), 'a plague tale requiem');
  assert.equal(normalizeTitle('Control PCGP'), 'control');
  assert.equal(normalizeTitle('Cities: Skylines II - PC Edition'), 'cities skylines ii');
});

test('construye URLs de imágenes sólo con identificadores válidos', () => {
  assert.equal(imageUrl('co1abc', 't_cover_big'), 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg');
  assert.equal(imageUrl(undefined, 't_cover_big'), null);
  assert.equal(imageUrl('../x', 't_cover_big'), null);
});

test('resume un juego de IGDB con los datos que muestra la ficha', () => {
  const meta = toMetadata({
    id: 1942,
    name: 'Hades',
    summary: 'Desafiá al dios de los muertos.',
    url: 'https://www.igdb.com/games/hades--1',
    first_release_date: 1600300800,
    aggregated_rating: 92.6,
    genres: [{ name: 'Roguelike' }, { name: 'Action' }],
    involved_companies: [
      { developer: true, company: { name: 'Supergiant Games' } },
      { developer: false, company: { name: 'Distribuidora' } }
    ],
    cover: { image_id: 'co39vc' },
    screenshots: [{ image_id: 'sc1' }]
  });
  const originalFields = [
    'igdbId',
    'title',
    'summary',
    'url',
    'year',
    'rating',
    'genres',
    'developers',
    'cover',
    'artwork'
  ];
  assert.deepEqual(Object.fromEntries(originalFields.map((key) => [key, meta[key]])), {
    igdbId: 1942,
    title: 'Hades',
    summary: 'Desafiá al dios de los muertos.',
    url: 'https://www.igdb.com/games/hades--1',
    year: 2020,
    rating: 93,
    genres: ['Roguelike', 'Action'],
    developers: ['Supergiant Games'],
    cover: 'co39vc',
    artwork: 'sc1'
  });
  assert.equal(toMetadata({ id: 2, name: 'X', url: 'javascript:alert(1)' }).url, null);
});

test('conserva textos completos, idiomas, clasificaciones, compañías y relaciones de IGDB', () => {
  const source = {
    id: 1,
    name: 'Juego',
    summary: 'x'.repeat(4000),
    storyline: 'Historia completa',
    genres: [{ name: 'RPG' }, { name: 'RPG' }, { name: 'Adventure' }],
    themes: [{ name: 'Fantasy' }],
    game_modes: [{ name: 'Co-operative' }],
    platforms: [{ name: 'PC (Microsoft Windows)' }],
    rating: 0,
    rating_count: 2,
    total_rating: 81.45,
    total_rating_count: 12,
    involved_companies: [{ company: { name: 'Estudio' }, developer: true, publisher: true }],
    language_supports: [
      {
        language: { name: 'Spanish', native_name: 'Español', locale: 'es-ES' },
        language_support_type: { name: 'Subtitles' }
      }
    ],
    age_ratings: [
      {
        organization: { name: 'PEGI' },
        rating_category: { rating: '18' },
        rating_content_descriptions: [{ description: 'Violence' }]
      }
    ],
    release_dates: [
      { date: 1600300800, human: 'Sep 17, 2020', platform: { name: 'PC' }, release_region: { region: 'Worldwide' } }
    ],
    multiplayer_modes: [{ id: 1, game: 1, platform: { name: 'PC' }, onlinecoop: true, onlinecoopmax: 4 }],
    dlcs: [{ id: 2, name: 'Expansión', url: 'https://www.igdb.com/games/expansion' }],
    screenshots: [{ image_id: 'sc123' }, { image_id: '../bad' }],
    videos: [{ name: 'Trailer', video_id: 'AbCdEfGh_12' }, { video_id: '../bad' }],
    websites: [{ type: { type: 'Official' }, url: 'https://example.com/game' }, { url: 'javascript:alert(1)' }],
    future_field: 'valor preservado'
  };
  const meta = toMetadata(source);
  assert.equal(meta.summary.length, 4000);
  assert.deepEqual(meta.genres, ['RPG', 'Adventure']);
  assert.equal(meta.storyline, 'Historia completa');
  assert.deepEqual(meta.companies, [{ name: 'Estudio', roles: ['developer', 'publisher'] }]);
  assert.deepEqual(meta.languages, [{ name: 'Spanish', nativeName: 'Español', locale: 'es-ES', support: 'Subtitles' }]);
  assert.equal(meta.ageRatings[0].rating, '18');
  assert.deepEqual(meta.ageRatings[0].descriptions, ['Violence']);
  assert.equal(meta.releases[0].date, '2020-09-17T00:00:00.000Z');
  assert.equal(meta.multiplayer[0].onlinecoopmax, 4);
  assert.equal(meta.multiplayer[0].platform, 'PC');
  assert.equal(meta.multiplayer[0].game, undefined);
  assert.equal(meta.related.dlcs[0].name, 'Expansión');
  assert.deepEqual(meta.screenshots, ['sc123']);
  assert.deepEqual(meta.videos, [{ name: 'Trailer', url: 'https://www.youtube.com/watch?v=AbCdEfGh_12' }]);
  assert.deepEqual(meta.websites, [{ label: 'Official', url: 'https://example.com/game' }]);
  assert.deepEqual(meta.ratings.users, { value: 0, count: 2 });
  assert.deepEqual(meta.ratings.total, { value: 81.5, count: 12 });
  // Desde el esquema 3 no se guarda la respuesta original completa.
  assert.equal(meta.source, undefined);
});

test('tolera campos ausentes y descarta fechas, valoraciones y enlaces inválidos', () => {
  const meta = toMetadata({ id: 3, name: 'Vacío', first_release_date: Infinity, total_rating: 101 });
  assert.equal(meta.year, null);
  assert.equal(meta.firstReleaseDate, null);
  assert.equal(meta.ratings.total.value, null);
  assert.deepEqual(meta.languages, []);
  assert.deepEqual(meta.related.dlcs, []);
  assert.equal(safeWebUrl('https://www.igdb.com.evil.test/game', 'www.igdb.com'), null);
  assert.equal(safeWebUrl('https://user:password@example.com/'), null);
  assert.equal(safeWebUrl('file:///C:/Windows'), null);
  assert.equal(safeWebUrl('http://example.com/'), null);
});

test('actualiza fichas y duración conservando las coincidencias existentes', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-igdb-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(dir, 'integrations.json'),
    JSON.stringify({ igdb: { clientId: 'client', secret: 'encrypted' } })
  );
  await fs.writeFile(path.join(dir, 'metadata.json'), JSON.stringify({ games: { 'epic:x': { igdbId: 42 } } }));
  const calls = [];
  const client = createIgdb(dir, {
    decrypt: async () => 'secret',
    requestGapMs: 0,
    fetchImpl: async (url, options) => {
      calls.push({ url, body: String(options.body) });
      const response = url.includes('oauth2/token')
        ? { access_token: 'token', expires_in: 3600 }
        : url.endsWith('/games')
          ? [{ id: 42, name: 'Juego', summary: 'Ficha nueva', screenshots: [{ image_id: 'sc42' }] }]
          : [{ game_id: 42, normally: 7200, count: 8 }];
      return new Response(JSON.stringify(response), { status: 200 });
    }
  });
  client.start([{ key: 'epic:x', id: 'x', name: 'Título local diferente', platform: 'Epic Games' }]);
  while (client.status().running) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(client.status().error, null);
  assert.equal(client.status().matched, 1);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url.includes('secret'), false);
  assert.match(calls[1].body, /where id = \(42\)/);
  const saved = JSON.parse(await fs.readFile(path.join(dir, 'metadata.json'), 'utf8'));
  assert.equal(saved.schemaVersion, 3);
  assert.equal(saved.games['epic:x'].igdbId, 42);
  assert.equal(saved.games['epic:x'].timeToBeat.normally, 7200);
  assert.equal(saved.games['epic:x'].timeToBeat.count, 8);
  assert.deepEqual(saved.games['epic:x'].screenshots, ['sc42']);
  assert.equal(saved.games['epic:x'].source, undefined);
});

test('una falla de IGDB mantiene intacta la información previamente descargada', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-igdb-fail-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const previous = JSON.stringify({ games: { 'epic:x': { igdbId: 42, summary: 'Ficha anterior' } } });
  await fs.writeFile(
    path.join(dir, 'integrations.json'),
    JSON.stringify({ igdb: { clientId: 'client', secret: 'encrypted' } })
  );
  await fs.writeFile(path.join(dir, 'metadata.json'), previous);
  const client = createIgdb(dir, {
    decrypt: async () => 'secret',
    requestGapMs: 0,
    fetchImpl: async (url) =>
      new Response(JSON.stringify(url.includes('oauth2/token') ? { access_token: 'token', expires_in: 3600 } : {}), {
        status: url.includes('oauth2/token') ? 200 : 503
      })
  });
  client.start([{ key: 'epic:x', id: 'x', name: 'Juego', platform: 'Epic Games' }]);
  while (client.status().running) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.match(client.status().error, /503/);
  // Las fichas siguen intactas; el archivo sólo se migró de versión, con copia del original.
  const saved = JSON.parse(await fs.readFile(path.join(dir, 'metadata.json'), 'utf8'));
  assert.deepEqual(saved.games, JSON.parse(previous).games);
  assert.equal(saved.schemaVersion, 3);
  assert.equal(await fs.readFile(path.join(dir, 'metadata.v0.bak.json'), 'utf8'), previous);
});

test('Arcade: usa el identificador de Wikidata y, si no hay, sólo acepta el mismo título en Arcade', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-igdb-arcade-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(dir, 'integrations.json'),
    JSON.stringify({ igdb: { clientId: 'client', secret: 'encrypted' } })
  );
  const bodies = [];
  const client = createIgdb(dir, {
    decrypt: async () => 'secret',
    requestGapMs: 0,
    fetchImpl: async (url, options) => {
      const body = String(options.body ?? '');
      bodies.push(body);
      let response = [];
      if (url.includes('oauth2/token')) response = { access_token: 'token', expires_in: 3600 };
      else if (body.includes('where slug = "bubble-bobble"')) response = [{ id: 7 }];
      else if (body.startsWith('search "contra"'))
        response = [
          { id: 90, name: 'Contra', first_release_date: Date.UTC(1988, 1, 9) / 1000 },
          { id: 91, name: 'Contra', first_release_date: Date.UTC(1987, 1, 20) / 1000 }
        ];
      else if (body.startsWith('search "racing beat"')) response = [{ id: 5, name: 'Racing Lagoon' }];
      else if (url.endsWith('/games'))
        response = [
          { id: 7, name: 'Bubble Bobble' },
          { id: 90, name: 'Contra' }
        ];
      return new Response(JSON.stringify(response), { status: 200 });
    }
  });
  const arcade = (key, name, year, extra = {}) => ({
    key: 'arcade:' + key,
    id: key,
    name,
    platform: 'Arcade',
    arcade: { year },
    ...extra
  });
  client.start([
    arcade('bublbobl', 'Bubble Bobble', '1986', { igdbSlug: 'bubble-bobble' }),
    arcade('contra', 'Contra', '1987'),
    arcade('racingb', 'Racing Beat', '1991')
  ]);
  while (client.status().running) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(client.status().error, null);
  const saved = JSON.parse(await fs.readFile(path.join(dir, 'metadata.json'), 'utf8'));
  assert.equal(saved.games['arcade:bublbobl'].igdbId, 7);
  assert.equal(saved.games['arcade:contra'].igdbId, 90);
  assert.equal(saved.games['arcade:racingb'].igdbId, null);
  assert.ok(bodies.some((body) => /where platforms = \(52\)/.test(body)));
});
