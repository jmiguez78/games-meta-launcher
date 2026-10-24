import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../public/catalog.js';

const { filterGames, facetCounts, sortGames, collapseDuplicates, titleKey } = globalThis.GMLCatalog;
const ready = { type: 'uri', target: 'x', available: true };
const games = [
  {
    key: 'a',
    name: 'Assetto Corsa',
    platform: 'Steam',
    launch: ready,
    steam: { playtimeHours: 120 },
    meta: { genres: ['Racing', 'Simulator'], rating: 82, timeToBeat: { normally: 40 * 3600 } }
  },
  {
    key: 'b',
    name: 'Celeste',
    platform: 'Steam',
    installed: false,
    steam: { playtimeHours: 0 },
    meta: { genres: ['Platform'], rating: 94, timeToBeat: { normally: 8 * 3600 } }
  },
  {
    key: 'c',
    name: 'Anno 1800',
    platform: 'Ubisoft Connect',
    launch: ready,
    tags: ['estrategia'],
    meta: { genres: ['Strategy'], rating: 77 }
  },
  {
    key: 'd',
    name: 'Hades',
    platform: 'Xbox / Microsoft Store',
    launch: ready,
    lastLaunchedAt: '2026-10-20T00:00:00Z'
  },
  {
    key: 'e',
    name: 'Hades™',
    platform: 'Steam',
    installed: false,
    steam: { playtimeHours: 30, lastPlayedAt: '2026-01-01T00:00:00Z' }
  }
];
const keys = (list) => list.map((game) => game.key);

test('la búsqueda ignora tildes y combina palabras', () => {
  assert.deepEqual(keys(filterGames(games, { query: 'corsa simu' })), ['a']);
  assert.deepEqual(keys(filterGames(games, { query: 'ESTRATEGIA' })), ['c']);
  assert.deepEqual(keys(filterGames(games, { scope: 'installed' })), ['a', 'c', 'd']);
});

test('las facetas suman opciones dentro de un grupo y combinan grupos', () => {
  assert.deepEqual(keys(filterGames(games, { filters: { genre: ['Racing', 'Platform'] } })), ['a', 'b']);
  assert.deepEqual(keys(filterGames(games, { filters: { genre: ['Racing', 'Platform'], length: ['short'] } })), ['b']);
  assert.deepEqual(keys(filterGames(games, { filters: { rating: ['90'] } })), ['b']);
  assert.deepEqual(keys(filterGames(games, { filters: { played: ['never'] } })), ['b', 'c']);
  assert.deepEqual(keys(filterGames(games, { filters: { played: ['lots'] } })), ['a', 'e']);
});

test('los conteos de cada faceta ignoran su propia selección', () => {
  const counts = facetCounts(games, { filters: { store: ['Steam'] } });
  assert.deepEqual(
    counts.store.options.map(({ value, count }) => [value, count]),
    [
      ['Steam', 3],
      ['Ubisoft Connect', 1],
      ['Xbox / Microsoft Store', 1]
    ]
  );
  assert.equal(counts.rating.options.find((option) => option.value === '80').count, 2);
});

test('el orden deja los datos desconocidos al final', () => {
  assert.deepEqual(keys(sortGames(games, 'hours')), ['a', 'e', 'b', 'c', 'd']);
  assert.deepEqual(keys(sortGames(games, 'rating')), ['b', 'a', 'c', 'd', 'e']);
  assert.deepEqual(keys(sortGames(games, 'length')), ['b', 'a', 'c', 'd', 'e']);
  assert.deepEqual(keys(sortGames(games, 'recent')), ['d', 'e', 'c', 'a', 'b']);
  assert.deepEqual(keys(sortGames(games, 'name', 'desc')), ['e', 'd', 'b', 'a', 'c']);
});

test('un juego en dos tiendas se muestra una vez, con la copia jugable adelante', () => {
  assert.equal(titleKey('Hades™'), titleKey('HADES'));
  const collapsed = collapseDuplicates(games);
  assert.deepEqual(
    collapsed.map(({ game, alsoOn }) => [game.key, keys(alsoOn)]),
    [
      ['a', []],
      ['b', []],
      ['c', []],
      ['d', ['e']]
    ]
  );
});
