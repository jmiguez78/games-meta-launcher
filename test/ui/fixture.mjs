// Datos de prueba para las pruebas de interfaz: una biblioteca inventada (nombres, tiendas, fichas, Arcade),
// sin imágenes ni datos reales. Se genera en una carpeta temporal antes de levantar el servidor.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PLATFORMS = [
  ['Steam', 'steam'],
  ['Epic Games', 'epic games'],
  ['GOG Galaxy', 'gog galaxy'],
  ['Xbox / Microsoft Store', 'xbox'],
  ['EA app', 'ea app'],
  ['Ubisoft Connect', 'ubisoft']
];
const WORDS = [
  'Ámbar',
  'Brújula',
  'Cometa',
  'Delta',
  'Eclipse',
  'Faro',
  'Glaciar',
  'Horizonte',
  'Isla',
  'Jade',
  'Kilómetro',
  'Laberinto',
  'Marea',
  'Nebulosa',
  'Órbita',
  'Pampa',
  'Quimera',
  'Ráfaga',
  'Sendero',
  'Tormenta',
  'Umbral',
  'Vértigo',
  'Yunque',
  'Zafiro'
];
const SUFFIX = ['', ' II', ': Origen', ' Remasterizado'];
const GENRES = [
  ['Role-playing (RPG)', 'Adventure'],
  ['Shooter'],
  ['Platform', 'Indie'],
  ['Strategy', 'Real Time Strategy (RTS)'],
  ['Racing', 'Simulator'],
  ['Puzzle']
];
const DAY = 86400000;
const NOW = Date.parse('2026-10-24T18:00:00-03:00');

// PNG de un solo color (para las capturas propias de prueba), sin depender de archivos binarios en el repositorio.
function crc32(bytes) {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
function solidPng(width, height, [r, g, b]) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())]);
  const pixels = zlib.deflateSync(Buffer.concat(Array.from({ length: height }, () => row)));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', pixels),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
// Capturas propias: tres de Steam (por appid) y una de Xbox Game Bar (por nombre de archivo).
function writeCaptures(dir, games) {
  const steamGame = games.find((game) => game.key === 'steam:900000');
  const shots = path.join(dir, 'Steam', 'userdata', '1', '760', 'remote', '900000', 'screenshots');
  const captures = path.join(dir, 'Videos', 'Captures');
  fs.mkdirSync(shots, { recursive: true });
  fs.mkdirSync(captures, { recursive: true });
  const colors = [
    [70, 110, 160],
    [150, 90, 60],
    [60, 130, 90],
    [120, 80, 140]
  ];
  const files = [
    ...[0, 1, 2].map((index) => path.join(shots, `2026102${index}180000_1.png`)),
    path.join(captures, `${steamGame.name} 2026-10-23 21-30-00.png`)
  ];
  files.forEach((file, index) => {
    fs.writeFileSync(file, solidPng(64, 36, colors[index]));
    const when = new Date(NOW - (4 - index) * DAY);
    fs.utimesSync(file, when, when);
  });
}

export function writeFixture(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const games = [];
  const metadata = {};
  const prefs = {};
  for (let index = 0; index < 48; index++) {
    const [platform, prefix] = PLATFORMS[index % PLATFORMS.length];
    const id = platform === 'Steam' ? String(900000 + index) : `prueba${index}`;
    const key = `${prefix}:${id}`;
    const name = WORDS[index % WORDS.length] + SUFFIX[Math.floor(index / WORDS.length) % SUFFIX.length];
    games.push({
      key,
      id,
      name,
      platform,
      drive: 'C:',
      location: `C:\\Juegos\\${name}`,
      launch: { type: 'uri', target: `prueba://jugar/${id}`, available: index % 11 !== 5 },
      status: index % 11 === 5 ? 'attention' : 'installed',
      evidence: 'Datos de prueba'
    });
    if (index % 3 !== 2)
      metadata[key] = {
        igdbId: 1000 + index,
        title: name,
        summary: `${name} es un juego inventado para las pruebas de la interfaz. Tiene una descripción de dos oraciones.`,
        genres: GENRES[index % GENRES.length],
        themes: index % 2 ? ['Science fiction'] : ['Fantasy', 'Open world'],
        modes: ['Single player'],
        perspectives: ['Third person'],
        year: 2010 + (index % 15),
        rating: 60 + ((index * 7) % 39),
        developers: ['Estudio de Prueba'],
        timeToBeat: {
          hastily: 3600 * (2 + (index % 9)),
          normally: 3600 * (5 + (index % 30)),
          completely: null,
          count: 4
        },
        fetchedAt: '2026-10-20T12:00:00.000Z'
      };
    const saved = {};
    if (index % 7 === 0) saved.favorite = true;
    if (index % 5 === 0) {
      saved.lastLaunchedAt = new Date(NOW - (index + 1) * DAY).toISOString();
      saved.playSeconds = 3600 * (index + 2);
    }
    if (Object.keys(saved).length) prefs[key] = saved;
  }
  const arcadeGames = [
    ['nave', 'Nave Estelar', 'Shooter / Flying Vertical', 1982, 92],
    ['laber', 'Laberinto Hambriento', 'Maze / Collect', 1980, 95],
    ['golpe', 'Golpe Final', 'Fighter / Versus', 1993, 88],
    ['salto', 'Salto Saltarín', 'Platform / Run Jump', 1986, 90],
    ['piedra', 'Ladrillos', 'Ball & Paddle / Breakout', 1986, 85],
    ['autos', 'Pista Turbo', 'Driving / Race', 1988, 81]
  ].map(([id, name, category, year, score]) => ({
    key: `arcade:${id}`,
    id,
    name,
    platform: 'Arcade',
    installed: true,
    status: 'installed',
    launch: { type: 'mame', target: id, available: true },
    evidence: 'Set verificado con MAME',
    adult: false,
    arcade: {
      description: name,
      year: String(year),
      manufacturer: 'Fabricante de Prueba',
      players: 2,
      controls: ['joy'],
      vertical: category.includes('Vertical'),
      emulation: 'good',
      category,
      series: null,
      score,
      art: [name],
      versions: []
    },
    meta: {
      title: name,
      year,
      genres: [category.split(' / ')[0] === 'Fighter' ? 'Fighting' : 'Shooter'],
      developers: ['Fabricante de Prueba']
    }
  }));
  prefs['arcade:laber'] = { favorite: true, lastLaunchedAt: new Date(NOW - DAY).toISOString(), playSeconds: 5400 };

  const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
  write('library.json', { schema: 2, generatedAt: new Date(NOW - DAY).toISOString(), games });
  write('metadata.json', { schemaVersion: 3, games: metadata });
  // «Primeros pasos» descartado: las capturas de Inicio no la incluyen (tiene su propia prueba).
  write('preferences.json', { schemaVersion: 1, settings: { onboardingDismissed: true }, games: prefs });
  write('arcade.json', { exe: 'C:\\MAME\\mame.exe', showAdult: false });
  // Sesiones medidas por el launcher en las últimas semanas, para «Tu actividad».
  const sessions = [];
  for (let index = 0; index < 26; index++) {
    const game = index % 4 === 0 ? 'arcade:laber' : games[(index * 7) % games.length];
    const key = typeof game === 'string' ? game : game.key;
    sessions.push({
      key,
      name: typeof game === 'string' ? 'Laberinto Hambriento' : game.name,
      start: new Date(NOW - (index * 2.6 + 0.3) * DAY - 3600000 * (index % 5)).toISOString(),
      seconds: 900 + ((index * 1373) % 7200),
      source: index % 4 === 0 ? 'mame' : 'proceso'
    });
  }
  write('sessions.json', { schemaVersion: 1, sessions: sessions.reverse() });
  write('arcade-catalog.json', {
    schema: 1,
    version: '0.289',
    games: arcadeGames,
    stats: { visible: arcadeGames.length }
  });
  writeCaptures(dir, games);
  return { games: games.length + arcadeGames.length };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  console.log(writeFixture(process.argv[2] ?? 'test/ui/.data'));
}
