import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  arcadeSetFromFile,
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
    await write(path.join(root, 'Videos', 'Captures', 'Control Resonant 2026-11-05 10-00-00.mkv'));
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

test('carpeta de Game Bar movida a Videos: archivos sueltos, subcarpetas propias y HDR', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-capturas-'));
  try {
    const library = [
      ...games,
      { key: 'xbox:e33', platform: 'Xbox / Microsoft Store', id: 'e33', name: 'Clair Obscur: Expedition 33' },
      { key: 'xbox:herd', platform: 'Xbox / Microsoft Store', id: 'herd', name: 'Herdling' }
    ];
    // Como en E:\Videos: el botón de captura del mando deja los archivos sueltos, con un .jxr (HDR) al lado.
    await write(path.join(root, 'CONTROL Resonant 5_11_2026 07_33_13.png'), 'png', '2026-11-05T10:33:13Z');
    await write(path.join(root, 'CONTROL Resonant 5_11_2026 07_33_13.jxr'), 'hdr');
    await write(path.join(root, 'Games Meta Launcher 26_10_2026 20_46_17.png'));
    // Subcarpetas armadas a mano: con el nombre del juego, o con otro nombre y archivos que sí lo tienen.
    await write(path.join(root, 'Herdling', 'Herdling 23_8_2025 10_16_12.png'));
    await write(path.join(root, 'Expedition 33', 'Clair Obscur_ Expedition 33 18_6_2025 23_39_26.png'));
    await write(path.join(root, 'Viejas', '2024', 'Herdling 29_8_2025 07_17_04.png'));
    await write(path.join(root, 'Ask Jesus', 'ask_jesus - Twitch - Brave 2023-06-24 12-28-22.mp4'));
    const shots = createScreenshots({
      games: async () => library,
      sources: async () => [
        { kind: 'named', label: 'Xbox Game Bar', dir: root, mode: 'both' },
        // La misma carpeta como «Videos»: no se cuenta dos veces.
        { kind: 'named', label: 'Videos', dir: root, mode: 'both', skip: ['Captures'] }
      ]
    });
    assert.equal((await shots.forGame('steam:1234560')).total, 1);
    assert.equal((await shots.forGame('xbox:e33')).total, 1);
    assert.equal((await shots.forGame('xbox:herd')).total, 2);
    assert.equal((await shots.recent(20)).total, 4);
    const folders = await shots.folders();
    assert.deepEqual(
      folders.map((item) => [item.label, item.count]),
      [['Xbox Game Bar', 4]]
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('videos de Game Bar: se suman con su tamaño, sin límite, y los de MAME van por el set', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-capturas-'));
  try {
    assert.equal(arcadeSetFromFile('MAME_ Kung-Fu Master (World) [kungfum] 2020-02-24 15-25-35.mp4'), 'kungfum');
    assert.equal(arcadeSetFromFile('Juego [especial] 2020-02-24 15-25-35.mp4'), null);
    const library = [...games, { key: 'arcade:kungfum', platform: 'Arcade', id: 'kungfum', name: 'Kung-Fu Master' }];
    await write(path.join(root, 'CONTROL Resonant 2026-11-05 10-00-00.mp4'), 'video', '2026-11-05T13:00:00Z');
    await write(path.join(root, 'CONTROL Resonant 5_11_2026 07_33_13.png'), 'png', '2026-11-05T10:33:13Z');
    await write(path.join(root, 'MAME_ Kung-Fu Master (World) [kungfum] 2020-02-24 15-25-35.mp4'), 'mame');
    await write(path.join(root, 'Cubase 5 2023-10-25 23-25-56.mp4'), 'otro');
    const steamShots = path.join(root, 'Steam', '1', '760', 'remote', '1234560', 'screenshots');
    await write(path.join(steamShots, 'clip.mp4'), 'no');
    const shots = createScreenshots({
      games: async () => library,
      sources: async () => [
        { kind: 'steam', label: 'Steam', dir: path.join(root, 'Steam') },
        { kind: 'named', label: 'Xbox Game Bar', dir: root, mode: 'both', skip: ['Steam'] }
      ]
    });
    const control = await shots.forGame('steam:1234560');
    assert.deepEqual([control.total, control.images, control.videos], [2, 1, 1]);
    assert.deepEqual(
      control.items.map((item) => [item.kind, item.size ?? null]),
      [
        ['video', 5],
        ['image', null]
      ]
    );
    assert.equal((await shots.forGame('arcade:kungfum')).videos, 1);
    const video = await shots.video(control.items[0].id);
    assert.equal(video.type, 'video/mp4');
    assert.equal(video.size, 5);
    // Un video no se sirve como imagen ni una imagen como video.
    assert.equal(await shots.file(control.items[0].id), null);
    assert.equal(await shots.video(control.items[1].id), null);
    const folders = await shots.folders();
    assert.deepEqual(
      folders.map((item) => [item.label, item.count, item.videos]),
      [
        ['Steam', 0, 0],
        ['Xbox Game Bar', 3, 2]
      ]
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
