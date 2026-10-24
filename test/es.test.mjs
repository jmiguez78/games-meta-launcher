import test from 'node:test';
import assert from 'node:assert/strict';
import { arcadeCategoryEs, metaEs } from '../src/es.mjs';

test('traduce géneros, temáticas, modos y perspectivas sin tocar la ficha original', () => {
  const meta = {
    genres: ['Role-playing (RPG)', 'Adventure', 'Shooter', 'Desconocido'],
    themes: ['Science fiction', 'Open world'],
    modes: ['Single player', 'Co-operative'],
    perspectives: ['Third person'],
    rating: 90
  };
  const es = metaEs(meta);
  assert.deepEqual(es.genres, ['Rol', 'Aventura', 'Disparos', 'Desconocido']);
  assert.deepEqual(es.themes, ['Ciencia ficción', 'Mundo abierto']);
  assert.deepEqual(es.modes, ['Un jugador', 'Cooperativo']);
  assert.deepEqual(es.perspectives, ['Tercera persona']);
  assert.equal(es.rating, 90);
  assert.equal(meta.genres[0], 'Role-playing (RPG)');
  assert.equal(metaEs(null), null);
});

test('géneros repetidos tras traducir se muestran una sola vez', () => {
  assert.deepEqual(metaEs({ genres: ['RPG', 'Role-playing (RPG)'] }).genres, ['Rol']);
});

test('traduce las categorías de MAME por grupo y subgrupo', () => {
  assert.equal(arcadeCategoryEs('Shooter / Flying Vertical'), 'Disparos / Vuelo vertical');
  assert.equal(arcadeCategoryEs('Sports / Track & Field'), 'Deportes / Atletismo');
  assert.equal(arcadeCategoryEs('Maze / Algo Nuevo'), 'Laberinto / Algo Nuevo');
  assert.equal(arcadeCategoryEs('Ball & Paddle'), 'Paleta y pelota');
  assert.equal(arcadeCategoryEs(null), null);
});
