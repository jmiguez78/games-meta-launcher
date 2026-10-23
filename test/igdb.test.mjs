import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageUrl, normalizeTitle, toMetadata } from '../src/igdb.mjs';

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
  assert.deepEqual(meta, {
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
