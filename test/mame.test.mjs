import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { Readable } from 'node:stream';
import {
  arcadeGenres,
  arcadeTitle,
  buildArcade,
  decodeXml,
  isAdultOrCasino,
  isNotAGame,
  parseBestGames,
  parseCatver,
  parseListXml,
  parseSeries,
  pruneMachines,
  regionRank,
  romPaths,
  thumbnailName,
  verifyMachine
} from '../src/mame.mjs';
import { readZipEntries } from '../src/zip-index.mjs';

// Un .zip mínimo sin compresión, armado a mano: alcanza para leer su directorio central.
function storedZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text);
    const nameBytes = Buffer.from(name);
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
const crcOf = (text) => zlib.crc32(Buffer.from(text)).toString(16).padStart(8, '0');

test('lee nombre, tamaño y CRC de cada archivo de un .zip sin descomprimirlo', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-zip-'));
  const file = path.join(dir, 'pacman.zip');
  await fs.writeFile(file, storedZip({ 'pacman.6e': 'uno', 'sub/pacman.6f': 'dos' }));
  assert.deepEqual(await readZipEntries(file), [
    { name: 'pacman.6e', size: 3, crc: crcOf('uno') },
    { name: 'pacman.6f', size: 3, crc: crcOf('dos') }
  ]);
  await fs.writeFile(path.join(dir, 'roto.zip'), 'no soy un zip');
  await assert.rejects(readZipEntries(path.join(dir, 'roto.zip')), /zip válido/);
  await fs.rm(dir, { recursive: true, force: true });
});

const listxml = `<?xml version="1.0"?>
<mame build="0.268 (mame0268)" debug="no" mameconfig="10">
	<machine name="neogeo" isbios="yes">
		<description>Neo-Geo MV-6F</description>
		<biosset name="euro" description="Europe MVS" default="yes"/>
		<biosset name="us" description="US MVS"/>
		<rom name="sp-s2.sp1" bios="euro" size="131072" crc="aaaa0001"/>
		<rom name="sp-u2" bios="us" size="131072" crc="aaaa0002"/>
		<rom name="sfix.sfix" size="131072" crc="aaaa0003"/>
	</machine>
	<machine name="mslug" romof="neogeo">
		<description>Metal Slug - Super Vehicle-001</description>
		<year>1996</year>
		<manufacturer>Nazca</manufacturer>
		<biosset name="euro" description="Europe MVS" default="yes"/>
		<rom name="sp-s2.sp1" merge="sp-s2.sp1" bios="euro" size="131072" crc="aaaa0001"/>
		<rom name="sp-u2" merge="sp-u2" bios="us" size="131072" crc="aaaa0002"/>
		<rom name="201-p1.p1" size="2097152" crc="bbbb0001"/>
		<input players="2" buttons="3"><control type="joy" ways="8"/></input>
		<display rotate="0"/>
		<driver status="good"/>
	</machine>
	<machine name="puckman">
		<description>Puck Man (Japan set 1)</description>
		<year>1980</year>
		<manufacturer>Namco</manufacturer>
		<rom name="pm1.6e" size="4096" crc="cccc0001"/>
		<device_ref name="namco"/>
		<display rotate="90"/>
		<driver status="good"/>
	</machine>
	<machine name="pacman" cloneof="puckman" romof="puckman">
		<description>Pac-Man (Midway)</description>
		<year>1980</year>
		<manufacturer>Namco (Midway license)</manufacturer>
		<rom name="pacman.6e" size="4096" crc="cccc0002"/>
		<rom name="pm1.6e" merge="pm1.6e" size="4096" crc="cccc0001"/>
		<rom name="pacman.nv" size="16" status="nodump"/>
		<device_ref name="namco"/>
		<display rotate="90"/>
		<driver status="good"/>
	</machine>
	<machine name="namco" isdevice="yes" runnable="no"><description>Namco sound</description></machine>
	<machine name="cpsdev" isdevice="yes" runnable="no">
		<description>Q-Sound</description>
		<rom name="dl-1425.bin" size="8192" crc="dddd0001"/>
	</machine>
	<machine name="sfa">
		<description>Street Fighter Alpha &amp; Zero (Euro 950727)</description>
		<rom name="sfa.03" size="524288" crc="eeee0001"/>
		<device_ref name="cpsdev"/>
		<driver status="imperfect"/>
	</machine>
	<machine name="other"><description>No está en la carpeta</description><rom name="x" size="1" crc="ffff0001"/></machine>
</mame>`;
const chunks = (text, size = 97) => Readable.from(text.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')));

test('lee -listxml en flujo y conserva sólo lo necesario para la carpeta', async () => {
  const wanted = new Set(['mslug', 'pacman', 'sfa', 'neogeo']);
  const { version, machines } = await parseListXml(chunks(listxml), wanted);
  assert.equal(version, '0.268 (mame0268)');
  const mslug = machines.get('mslug');
  assert.deepEqual(
    { title: mslug.description, year: mslug.year, players: mslug.players, controls: mslug.controls, roms: mslug.roms },
    {
      title: 'Metal Slug - Super Vehicle-001',
      year: '1996',
      players: 2,
      controls: ['joy'],
      roms: ['aaaa0001', 'bbbb0001']
    }
  );
  assert.deepEqual(machines.get('pacman').roms, ['cccc0002', 'cccc0001']);
  assert.equal(machines.get('pacman').vertical, true);
  assert.equal(machines.get('sfa').description, 'Street Fighter Alpha & Zero (Euro 950727)');
  const pruned = pruneMachines(machines, wanted);
  assert.deepEqual([...pruned.keys()].sort(), ['cpsdev', 'mslug', 'namco', 'neogeo', 'pacman', 'puckman', 'sfa']);
});

test('verifica cada set por CRC, incluido padre, BIOS y dispositivos', async () => {
  const { machines } = await parseListXml(chunks(listxml), new Set(['mslug', 'pacman', 'sfa']));
  const zips = new Map([
    ['neogeo', new Set(['aaaa0001', 'aaaa0003'])],
    ['mslug', new Set(['bbbb0001'])],
    ['pacman', new Set(['cccc0002', 'cccc0001'])],
    ['sfa', new Set(['eeee0001'])]
  ]);
  assert.equal(verifyMachine('mslug', machines, zips), 'good');
  assert.equal(verifyMachine('pacman', machines, zips), 'good');
  assert.equal(verifyMachine('sfa', machines, zips), 'device');
  zips.set('cpsdev', new Set(['dddd0001']));
  assert.equal(verifyMachine('sfa', machines, zips), 'good');
  zips.set('mslug', new Set());
  assert.equal(verifyMachine('mslug', machines, zips), 'missing');
  assert.equal(verifyMachine('nada', machines, zips), 'unknown');
});

test('arma un juego por grupo, con nombre limpio, versión internacional adelante y datos de MAME', async () => {
  const { machines } = await parseListXml(chunks(listxml), new Set(['pacman', 'puckman', 'mslug']));
  const verified = new Map([
    ['pacman', 'good'],
    ['puckman', 'good'],
    ['mslug', 'good'],
    ['neogeo', 'good'],
    ['sfa', 'missing']
  ]);
  const catver = parseCatver(
    '[Category]\npuckman=Maze / Collect\npacman=Maze / Collect\nmslug=Platform / Shooter Scrolling\n'
  );
  const bestgames = parseBestGames('[ROOT_FOLDER]\n\n[90 to 100 (Best Games)]\npuckman\n');
  const series = parseSeries('[FOLDER_SETTINGS]\nx\n[Pac-Man]\npuckman\npacman\n');
  const { games, stats } = buildArcade({ machines, verified, catver, bestgames, series });
  assert.deepEqual(
    games.map((game) => game.name),
    ['Metal Slug - Super Vehicle-001', 'Pac-Man']
  );
  const pac = games.find((game) => game.name === 'Pac-Man');
  assert.equal(pac.key, 'arcade:pacman');
  assert.deepEqual(pac.launch, { type: 'mame', target: 'pacman', available: true });
  assert.deepEqual(pac.arcade.versions, [
    { id: 'puckman', description: 'Puck Man (Japan set 1)', label: 'Puck Man (Japan set 1)', emulation: 'good' }
  ]);
  assert.equal(pac.arcade.score, 90);
  assert.equal(pac.arcade.series, 'Pac-Man');
  assert.equal(pac.arcade.vertical, true);
  assert.deepEqual(pac.meta, { title: 'Pac-Man', year: 1980, genres: ['Maze'], developers: ['Namco'] });
  assert.equal(pac.adult, false);
  assert.deepEqual(
    { good: stats.good, missing: stats.missing, hidden: stats.hidden, games: stats.games },
    { good: 3, missing: 1, hidden: 1, games: 2 }
  );
});

test('clasifica géneros, contenido adulto y categorías que no son juegos', () => {
  assert.deepEqual(arcadeGenres('Fighter / Versus'), ['Fighting']);
  assert.deepEqual(arcadeGenres('Fighter / 2.5D'), ["Hack and slash/Beat 'em up"]);
  assert.deepEqual(arcadeGenres('Shooter / Flying Vertical * Mature *'), ['Shooter']);
  assert.deepEqual(arcadeGenres(''), []);
  assert.equal(isAdultOrCasino('Tabletop / Mahjong * Mature *'), true);
  assert.equal(isAdultOrCasino('Gambling / Cards'), true);
  assert.equal(isAdultOrCasino('Shooter / Gallery'), false);
  assert.equal(isNotAGame('Quiz / Questions in Japanese'), true);
  assert.equal(isNotAGame('Quiz / Questions in English'), false);
  assert.equal(isNotAGame('Utilities / Test'), true);
});

test('nombres, versiones y rutas', () => {
  assert.equal(arcadeTitle('Bubble Bobble (Japan, Ver 0.1)'), 'Bubble Bobble');
  assert.equal(arcadeTitle('Gun.Smoke (World, 1985-11-15)'), 'Gun.Smoke');
  assert.equal(decodeXml('Rock &amp; Roll &#233;'), 'Rock & Roll é');
  assert.equal(thumbnailName('Bubble Bobble II (Ver 2.5O 1994/10/05)'), 'Bubble Bobble II (Ver 2.5O 1994_10_05)');
  assert.ok(
    regionRank({ name: 'pacman', description: 'Pac-Man (Midway)' }, 'puckman') <
      regionRank({ name: 'puckman', description: 'Puck Man (Japan set 1)' }, 'puckman')
  );
  const dir = path.resolve('/mame');
  assert.deepEqual(romPaths('rompath                   roms;K:\\Juegos\\MAME64\\roms\n', dir).length, 2);
  assert.deepEqual(romPaths('', dir), [path.join(dir, 'roms')]);
});

test('indexa la carpeta de MAME de punta a punta, recuerda los zips y lanza el set con su tiempo', async () => {
  const { createArcade } = await import('../src/mame.mjs');
  const { EventEmitter } = await import('node:events');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-mame-'));
  const mameDir = path.join(root, 'MAME64');
  await fs.mkdir(path.join(mameDir, 'roms'), { recursive: true });
  const exe = path.join(mameDir, 'mame.exe');
  await fs.writeFile(exe, '');
  await fs.writeFile(path.join(mameDir, 'mame.ini'), 'rompath                   roms\n');
  const rom = (crc) => Buffer.from(crc, 'hex');
  // ROMs cuyo CRC coincide con el de listxml: se arma el zip y se lee el CRC real para el XML.
  await fs.writeFile(path.join(mameDir, 'roms', 'pacman.zip'), storedZip({ 'pacman.6e': 'pac', 'pm1.6e': 'puck' }));
  const xml = listxml.replace('cccc0002', crcOf('pac')).replaceAll('cccc0001', crcOf('puck'));
  const calls = [];
  const spawnImpl = (command, args) => {
    calls.push(args);
    const child = new EventEmitter();
    if (args[0] === '-version') child.stdout = Readable.from(['0.268 (mame0268)\n']);
    else if (args[0] === '-listxml') child.stdout = Readable.from(xml.match(/[\s\S]{1,500}/g));
    else setImmediate(() => child.emit('spawn'));
    return child;
  };
  const fetchImpl = async (url) => ({
    ok: true,
    text: async () => (url.includes('catver') ? '[Category]\npacman=Maze / Collect\n' : '')
  });
  const dataDir = path.join(root, 'data');
  const arcade = createArcade(dataDir, { spawnImpl, fetchImpl });
  await arcade.configure({ exe });
  const catalog = await arcade.refresh();
  assert.equal(catalog.version, '0.268');
  assert.deepEqual(
    (await arcade.games()).map((game) => [game.key, game.name, game.meta.genres]),
    [['arcade:pacman', 'Pac-Man', ['Maze']]]
  );
  // Segunda indexación: el .zip no cambió y la carpeta tampoco, así que no se vuelve a pedir -listxml.
  await arcade.refresh();
  assert.equal(calls.filter((args) => args[0] === '-listxml').length, 1);
  const info = await arcade.info();
  assert.equal(info.stats.games, 1);
  // Lanzar: sólo sets conocidos; el tiempo llega al cerrarse MAME.
  await assert.rejects(arcade.launch('mslug'), /no está en tu biblioteca/);
  await assert.rejects(arcade.launch('pac;rm'), /no válido/);
  let seconds = null;
  const spawnLaunch = [];
  const launcher = createArcade(dataDir, {
    fetchImpl,
    spawnImpl: (command, args, options) => {
      spawnLaunch.push([path.basename(command), args, options.cwd]);
      const child = new EventEmitter();
      setImmediate(() => {
        child.emit('spawn');
        child.emit('exit', 0);
      });
      return child;
    }
  });
  await launcher.launch('pacman', (value) => (seconds = value));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(spawnLaunch, [['mame.exe', ['pacman'], mameDir]]);
  assert.equal(seconds, 0);
  await assert.rejects(arcade.configure({ exe: 'C:\\otro\\programa.exe' }), /mame.exe/);
  await fs.rm(root, { recursive: true, force: true });
});
