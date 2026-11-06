import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createScreenshots,
  nameMatcher,
  normalizeName,
  snapshotDirectory,
  titleFromFile
} from '../src/screenshots.mjs';

const games = [
  { key: 'steam:1234560', platform: 'Steam', id: '1234560', name: 'Control Resonant' },
  { key: 'steam:870780', platform: 'Steam', id: '870780', name: 'Control Ultimate Edition' },
  { key: 'epic games:abc', platform: 'Epic Games', id: 'abc', name: 'Alan Wake 2™' },
  { key: 'gog:hl', platform: 'GOG Galaxy', id: 'hl', name: 'Hollow Knight' },
  {
    key: 'arcade:sf2',
    platform: 'Arcade',
    id: 'sf2',
    name: 'Street Fighter II',
    arcade: { versions: [{ id: 'sf2ua' }] }
  }
];

async function write(file, text = 'imagen', date = '2026-11-04T21:00:00Z') {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text);
  await fs.utimes(file, new Date(date), new Date(date));
}

test('titleFromFile corta en la fecha que agregan Game Bar y NVIDIA', () => {
  assert.equal(titleFromFile('Control Resonant 2026-11-04 21-33-05.png'), 'Control Resonant');
  assert.equal(titleFromFile('Alan Wake 2 11_4_2026 9_33_05 PM.png'), 'Alan Wake 2');
  assert.equal(titleFromFile('Hollow Knight Screenshot 2026.11.04 - 21.33.05.12.png'), 'Hollow Knight');
  assert.equal(titleFromFile('Hollow Knight.png'), 'Hollow Knight');
});

test('nameMatcher reconoce nombres exactos, más largos y abreviados sin confundir juegos', () => {
  const match = nameMatcher(games);
  assert.equal(normalizeName('Alan Wake 2™'), 'alan wake 2');
  assert.equal(match('CONTROL RESONANT'), 'steam:1234560');
  assert.equal(match('Alan Wake 2'), 'epic games:abc');
  assert.equal(match('Hollow Knight Voidheart Edition'), 'gog:hl');
  // «Control» puede ser cualquiera de los dos: no se adivina.
  assert.equal(match('Control'), null);
  assert.equal(match('Hollow'), 'gog:hl');
  // Arcade no se asocia por nombre (sus capturas llegan por set).
  assert.equal(match('Street Fighter II'), null);
  assert.equal(match('Un juego que no está'), null);
});

test('snapshotDirectory respeta mame.ini y usa «snap» por defecto', () => {
  const dir = path.resolve('/mame');
  assert.equal(snapshotDirectory('', dir), path.join(dir, 'snap'));
  assert.equal(snapshotDirectory('snapshot_directory    capturas;otra\n', dir), path.join(dir, 'capturas'));
});

test('createScreenshots junta Steam, MAME, Game Bar y carpetas por nombre, de la más nueva a la más vieja', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-capturas-'));
  try {
    const steamShots = path.join(root, 'Steam', 'userdata', '42', '760', 'remote', '1234560', 'screenshots');
    await write(path.join(steamShots, '20261104210000_1.jpg'), 'steam', '2026-11-04T21:00:00Z');
    await write(path.join(steamShots, 'thumbnails', '20261104210000_1.jpg'), 'mini');
    await write(path.join(root, 'Steam', 'userdata', '42', '760', 'remote', '999', 'screenshots', 'x.jpg'));
    await write(
      path.join(root, 'Videos', 'Captures', 'Control Resonant 2026-11-05 10-00-00.png'),
      'gb',
      '2026-11-05T10:00:00Z'
    );
    await write(path.join(root, 'Videos', 'Captures', 'Escritorio 2026-11-05 10-00-00.png'));
    await write(path.join(root, 'Videos', 'Captures', 'Control Resonant 2026-11-05 10-00-00.mp4'));
    await write(path.join(root, 'Videos', 'Alan Wake 2', 'foto.png'), 'nv', '2026-11-03T10:00:00Z');
    await write(path.join(root, 'Videos', 'Vacaciones', 'playa.jpg'));
    await write(path.join(root, 'mame', 'snap', 'sf2ua', '0000.png'), 'mame', '2026-11-01T10:00:00Z');
    await write(path.join(root, 'mame', 'snap', 'sf2.png'), 'arte');
    const shots = createScreenshots({
      games: async () => games,
      sources: async () => [
        { kind: 'steam', label: 'Steam', dir: path.join(root, 'Steam', 'userdata') },
        { kind: 'named', label: 'Xbox Game Bar', dir: path.join(root, 'Videos', 'Captures'), mode: 'files' },
        { kind: 'named', label: 'Videos', dir: path.join(root, 'Videos'), mode: 'folders', skip: ['Captures'] },
        { kind: 'mame', label: 'MAME', dir: path.join(root, 'mame', 'snap') },
        { kind: 'named', label: 'No existe', dir: path.join(root, 'nada'), mode: 'both' }
      ]
    });
    const control = await shots.forGame('steam:1234560');
    assert.equal(control.total, 2);
    assert.deepEqual(
      control.items.map((item) => item.source),
      ['Xbox Game Bar', 'Steam']
    );
    assert.equal(control.items[1].thumb, true);
    assert.equal(control.folders.length, 2);
    assert.equal((await shots.forGame('epic games:abc')).total, 1);
    assert.equal((await shots.forGame('arcade:sf2')).items[0].source, 'MAME');
    const recent = await shots.recent(10);
    assert.equal(recent.total, 4);
    assert.equal(recent.items[0].name, 'Control Resonant');
    // Los archivos se piden por identificador, nunca por ruta; la miniatura de Steam se usa si existe.
    const steamItem = control.items[1];
    assert.equal(String((await shots.file(steamItem.id, { thumb: true })).bytes), 'mini');
    assert.equal(String((await shots.file(steamItem.id)).bytes), 'steam');
    assert.equal((await shots.file(steamItem.id)).type, 'image/jpeg');
    assert.equal(await shots.file('0'.repeat(20)), null);
    const folders = await shots.folders();
    assert.deepEqual(
      folders.map((item) => [item.label, item.exists, item.count]),
      [
        ['Steam', true, 1],
        ['Xbox Game Bar', true, 1],
        ['Videos', true, 1],
        ['MAME', true, 1],
        ['No existe', false, 0]
      ]
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('createScreenshots reutiliza el índice y lo rehace al pedirlo', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-capturas-'));
  try {
    let reads = 0;
    const shots = createScreenshots({
      games: async () => games,
      sources: async () => {
        reads += 1;
        return [{ kind: 'named', label: 'Propia', dir: root, mode: 'both' }];
      }
    });
    assert.equal((await shots.forGame('gog:hl')).total, 0);
    await write(path.join(root, 'Hollow Knight 2026-11-05 10-00-00.png'));
    assert.equal((await shots.forGame('gog:hl')).total, 0);
    assert.equal((await shots.forGame('gog:hl', { refresh: true })).total, 1);
    assert.equal(reads, 2);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
