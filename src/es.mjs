// Todo en español: géneros, temáticas, modos y perspectivas de IGDB, y categorías de MAME.
// Los archivos de datos guardan los nombres originales (en inglés); la traducción se aplica al armar la
// biblioteca que recibe la interfaz. Un término desconocido se muestra tal cual.

// Géneros de IGDB y el vocabulario de Arcade (arcadeGenres en mame.mjs).
const GENRES = {
  'Point-and-click': 'Point and click',
  Fighting: 'Lucha',
  Shooter: 'Disparos',
  Music: 'Música',
  Platform: 'Plataformas',
  Puzzle: 'Rompecabezas',
  Racing: 'Carreras',
  'Real Time Strategy (RTS)': 'Estrategia en tiempo real',
  'Role-playing (RPG)': 'Rol',
  RPG: 'Rol',
  Simulator: 'Simulación',
  Sport: 'Deportes',
  Strategy: 'Estrategia',
  'Turn-based strategy (TBS)': 'Estrategia por turnos',
  Tactical: 'Táctica',
  "Hack and slash/Beat 'em up": 'Beat em up',
  'Quiz/Trivia': 'Preguntas y respuestas',
  Pinball: 'Pinball',
  Adventure: 'Aventura',
  Indie: 'Independiente',
  Arcade: 'Arcade',
  'Visual Novel': 'Novela visual',
  'Card & Board Game': 'Cartas y tablero',
  MOBA: 'MOBA',
  Roguelike: 'Roguelike',
  Action: 'Acción',
  // Arcade
  Maze: 'Laberinto',
  'Ball & Paddle': 'Paleta y pelota',
  Compilation: 'Recopilación'
};

const THEMES = {
  Action: 'Acción',
  Fantasy: 'Fantasía',
  'Science fiction': 'Ciencia ficción',
  Horror: 'Terror',
  Thriller: 'Suspenso',
  Survival: 'Supervivencia',
  Historical: 'Histórica',
  Stealth: 'Sigilo',
  Comedy: 'Comedia',
  Business: 'Negocios',
  Drama: 'Drama',
  'Non-fiction': 'No ficción',
  Sandbox: 'Mundo abierto creativo',
  Educational: 'Educativa',
  Kids: 'Infantil',
  'Open world': 'Mundo abierto',
  Warfare: 'Bélica',
  Party: 'Juego de fiesta',
  '4X (explore, expand, exploit, and exterminate)': '4X (explorar, expandir, explotar y exterminar)',
  Erotic: 'Erótica',
  Mystery: 'Misterio',
  Romance: 'Romance'
};

const MODES = {
  'Single player': 'Un jugador',
  Multiplayer: 'Multijugador',
  'Co-operative': 'Cooperativo',
  'Split screen': 'Pantalla dividida',
  'Massively Multiplayer Online (MMO)': 'Multijugador masivo en línea (MMO)',
  'Battle Royale': 'Battle royale'
};

const PERSPECTIVES = {
  'First person': 'Primera persona',
  'Third person': 'Tercera persona',
  'Bird view / Isometric': 'Vista aérea o isométrica',
  'Side view': 'Vista lateral',
  Text: 'Texto',
  Auditory: 'Auditiva',
  'Virtual Reality': 'Realidad virtual'
};

// Categorías de MAME (catver.ini): «Grupo / Subgrupo».
const ARCADE_GROUPS = {
  Shooter: 'Disparos',
  Platform: 'Plataformas',
  Fighter: 'Lucha',
  Sports: 'Deportes',
  Driving: 'Manejo',
  Puzzle: 'Rompecabezas',
  Maze: 'Laberinto',
  'Ball & Paddle': 'Paleta y pelota',
  MultiGame: 'Varios juegos',
  Multiplay: 'Varios juegos',
  Climbing: 'Escalada',
  'Music Game': 'Música',
  Arcade: 'Arcade',
  Quiz: 'Preguntas',
  Tabletop: 'De mesa',
  Gambling: 'Apuestas',
  'Slot Machine': 'Tragamonedas',
  'Whac-A-Mole': 'Golpear al topo',
  'Misc.': 'Varios'
};
const ARCADE_SUBGROUPS = {
  'Flying Vertical': 'Vuelo vertical',
  'Flying Horizontal': 'Vuelo horizontal',
  'Flying Diagonal': 'Vuelo diagonal',
  'Flying 1st Person': 'Vuelo en primera persona',
  'Flying (chase view)': 'Vuelo con vista de persecución',
  Flying: 'Vuelo',
  Gallery: 'Galería de tiro',
  Field: 'Campo abierto',
  Gun: 'Con pistola',
  Walking: 'A pie',
  '3rd Person': 'Tercera persona',
  '1st Person': 'Primera persona',
  'Driving Vertical': 'Manejando, vertical',
  'Driving Horizontal': 'Manejando, horizontal',
  'Driving Diagonal': 'Manejando, diagonal',
  'Driving (chase view)': 'Manejando con vista de persecución',
  Driving: 'Manejando',
  'Tank Driving': 'Tanques',
  Command: 'Defensa',
  Versus: 'Uno contra uno',
  'Versus Co-op': 'Uno contra uno y cooperativo',
  Underwater: 'Submarino',
  'Balloon Popping': 'Reventar globos',
  Outline: 'Contornos',
  'Misc. Horizontal': 'Varios, horizontal',
  'Misc. Vertical': 'Varios, vertical',
  'Misc.': 'Varios',
  'Run Jump': 'Correr y saltar',
  'Run, Jump & Scrolling': 'Correr y saltar con desplazamiento',
  'Fighter Scrolling': 'Lucha con desplazamiento',
  'Shooter Scrolling': 'Disparos con desplazamiento',
  Shooter: 'Disparos',
  Fighter: 'Lucha',
  '2D': '2D',
  '2.5D': '2.5D',
  '3D': '3D',
  Vertical: 'Vertical',
  Collect: 'Recolectar',
  'Collect & Put': 'Recolectar y ubicar',
  'Shooter Small': 'Disparos, pequeño',
  'Shooter Large': 'Disparos, grande',
  Surround: 'Rodear',
  Digging: 'Excavar',
  Escape: 'Escape',
  Blocks: 'Bloques',
  'Defeat Enemies': 'Vencer enemigos',
  'Move and Sort': 'Mover y ordenar',
  Cross: 'Cruzar',
  'Change Surface': 'Cambiar superficie',
  Ladders: 'Escaleras',
  Integrate: 'Integrar',
  Paint: 'Pintar',
  Drop: 'Caída de piezas',
  Toss: 'Lanzar',
  Maze: 'Laberinto',
  Match: 'Unir',
  Sliding: 'Deslizar',
  Reconstruction: 'Reconstruir',
  'Solved Game': 'Juego resuelto',
  Breakout: 'Romper ladrillos',
  'Jump and Touch': 'Saltar y tocar',
  Pong: 'Pong',
  Baseball: 'Béisbol',
  Golf: 'Golf',
  Soccer: 'Fútbol',
  Pool: 'Pool',
  Basketball: 'Básquet',
  Bowling: 'Bowling',
  Wrestling: 'Lucha libre',
  Boxing: 'Boxeo',
  Tennis: 'Tenis',
  Football: 'Fútbol americano',
  Skiing: 'Esquí',
  'Track & Field': 'Atletismo',
  Hockey: 'Hockey',
  Volleyball: 'Vóley',
  'Ping Pong': 'Ping pong',
  'Hang Gliding': 'Ala delta',
  'Horse Racing': 'Carreras de caballos',
  'Rugby Football': 'Rugby',
  SkyDiving: 'Paracaidismo',
  Darts: 'Dardos',
  'Arm Wrestling': 'Pulseada',
  'Bull Fighting': 'Corrida de toros',
  Fishing: 'Pesca',
  Handball: 'Handball',
  Multiplay: 'Varios deportes',
  Shuffleboard: 'Tejo',
  Horseshoes: 'Herraduras',
  Swimming: 'Natación',
  Sumo: 'Sumo',
  Race: 'Carrera',
  'Race (chase view)': 'Carrera con vista de persecución',
  'Race 1st Person': 'Carrera en primera persona',
  'Race Track': 'Circuito',
  'Race Bike': 'Carrera de bicicletas',
  Motorbike: 'Motos',
  'Motorbike (Motocross)': 'Motocross',
  Boat: 'Lanchas',
  Plane: 'Aviones',
  'Demolition Derby': 'Choques',
  'FireTruck Guide': 'Guiar el camión de bomberos',
  'Guide and Collect': 'Guiar y recolectar',
  'Mini-Games': 'Minijuegos',
  Compilation: 'Recopilación',
  'Tree - Plant': 'Árboles y plantas',
  Building: 'Edificios',
  'Mountain - Wall': 'Montañas y paredes',
  Instruments: 'Instrumentos',
  Dance: 'Baile',
  Pinball: 'Pinball',
  'Questions in English': 'Preguntas en inglés',
  'Questions in Spanish': 'Preguntas en español',
  Mahjong: 'Mahjong',
  Hanafuda: 'Hanafuda',
  Shanghai: 'Shanghai',
  Cards: 'Cartas',
  Renju: 'Renju',
  Shougi: 'Shogi',
  'Othello - Reversi': 'Othello',
  Go: 'Go',
  'Video Slot': 'Tragamonedas de video',
  Dice: 'Dados',
  Lottery: 'Lotería',
  Roulette: 'Ruleta',
  Hammer: 'Con martillo'
};

const translate = (dictionary) => (list) =>
  Array.isArray(list) ? [...new Set(list.map((item) => dictionary[item] ?? item))] : list;
export const genresEs = translate(GENRES);
export const themesEs = translate(THEMES);
export const modesEs = translate(MODES);
export const perspectivesEs = translate(PERSPECTIVES);

export function arcadeCategoryEs(category) {
  if (typeof category !== 'string' || !category) return category;
  const [group, ...rest] = category.split(' / ');
  const sub = rest.join(' / ');
  const groupEs = ARCADE_GROUPS[group] ?? group;
  return sub ? `${groupEs} / ${ARCADE_SUBGROUPS[sub] ?? sub}` : groupEs;
}

// Copia de la ficha con las listas traducidas (sin tocar el original, que puede estar en la caché).
export function metaEs(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  const out = { ...meta };
  if (meta.genres) out.genres = genresEs(meta.genres);
  if (meta.themes) out.themes = themesEs(meta.themes);
  if (meta.modes) out.modes = modesEs(meta.modes);
  if (meta.perspectives) out.perspectives = perspectivesEs(meta.perspectives);
  return out;
}
