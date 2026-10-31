// Datos de prueba para las pruebas de interfaz: una biblioteca inventada (nombres, tiendas, fichas, Arcade),
// sin imágenes ni datos reales. Se genera en una carpeta temporal antes de levantar el servidor.
import fs from 'node:fs';
import path from 'node:path';

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
  return { games: games.length + arcadeGames.length };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  console.log(writeFixture(process.argv[2] ?? 'test/ui/.data'));
}
