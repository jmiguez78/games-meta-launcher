import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../public/shelves.js';

const { heroCandidates, homeShelves, relativeDay, relativeTime, hours } = globalThis.GMLShelves;
const ready = { type: 'uri', target: 'steam://run/1', available: true };
const game = (key, extra = {}) => ({ key, name: key, installed: true, launch: ready, ...extra });

test('la imagen principal prioriza lo último jugado y no repite juegos', () => {
  const games = [
    game('viejo', { steam: { lastPlayedAt: '2026-01-01T00:00:00Z' } }),
    game('reciente', { lastLaunchedAt: '2026-10-20T00:00:00Z' }),
    game('favorito', { favorite: true }),
    game('valorado', { meta: { rating: 90 } }),
    game('sin-instalar', { installed: false, launch: null, steam: { lastPlayedAt: '2026-10-22T00:00:00Z' } })
  ];
  const picks = heroCandidates(games);
  assert.deepEqual(
    picks.map((pick) => [pick.game.key, pick.reason]),
    [
      ['reciente', 'recent'],
      ['viejo', 'recent'],
      ['favorito', 'favorite'],
      ['valorado', 'rated']
    ]
  );
});

test('las filas de Inicio responden a una intención y omiten las vacías salvo Favoritos', () => {
  const games = [
    game('jugado', { steam: { playtimeHours: 12, lastPlayedAt: '2026-10-01T00:00:00Z' } }),
    game('nuevo', { steam: { playtimeHours: 0 } }),
    game('corto', { meta: { rating: 85, timeToBeat: { normally: 4 * 3600 } } }),
    game('largo', { meta: { rating: 70, timeToBeat: { normally: 40 * 3600 } } }),
    game('cuenta', { installed: false, launch: null, ownership: 'owned', meta: { rating: 92 } })
  ];
  const shelves = Object.fromEntries(
    homeShelves(games).map((shelf) => [shelf.id, shelf.games.map((item) => item.key)])
  );
  assert.deepEqual(shelves, {
    continue: ['jugado'],
    favorites: [],
    unplayed: ['nuevo'],
    short: ['corto'],
    rated: ['corto'],
    install: ['cuenta']
  });
  const withoutHero = homeShelves(games, { exclude: ['jugado'] });
  assert.equal(
    withoutHero.some((shelf) => shelf.id === 'continue'),
    false
  );
});

test('las fechas relativas usan palabras simples', () => {
  const now = Date.parse('2026-10-24T12:00:00');
  assert.equal(relativeDay('2026-10-24T08:00:00', now), 'Hoy');
  assert.equal(relativeDay('2026-10-23T23:00:00', now), 'Ayer');
  assert.equal(relativeDay('2026-10-20T10:00:00', now), 'Hace 4 días');
  assert.equal(relativeDay('2026-10-10T10:00:00', now), 'Hace 2 semanas');
  assert.equal(relativeTime('2026-10-24T11:59:40', now), 'recién');
  assert.equal(relativeTime('2026-10-24T09:00:00', now), 'hace 3 h');
  assert.equal(relativeTime('2026-10-22T12:00:00', now), 'hace 2 días');
  assert.equal(hours(0.5), '30 min');
  assert.equal(hours(3.25), '3,3 h');
  assert.equal(hours(37.4), '37 h');
  assert.equal(hours(0), '');
});
