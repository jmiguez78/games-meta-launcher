// Arcade: los juegos de MAME como una tienda más.
// MAME describe cada máquina con -listxml; acá se cruza esa descripción con los .zip de la carpeta de ROMs,
// se verifica cada set por CRC (sin descomprimir), se descartan BIOS, dispositivos, máquinas mecánicas y sets
// incompletos, y se agrupan las versiones regionales bajo un solo juego.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { readZipEntries } from './zip-index.mjs';

const CACHE_SCHEMA = 1;
const SUPPORT_BASE = 'https://raw.githubusercontent.com/AntoPISA/MAME_SupportFiles/main/';
const SUPPORT_FILES = {
  catver: 'catver.ini/catver.ini',
  bestgames: 'bestgames.ini/bestgames.ini',
  series: 'series.ini/series.ini'
};
const SUPPORT_MAX_AGE = 30 * 86400000;
const THUMBNAILS = 'https://raw.githubusercontent.com/libretro-thumbnails/MAME/master/';

// ---------- Funciones puras (con pruebas) ----------

const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export function decodeXml(text) {
  return String(text ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, code) => {
    if (code[0] !== '#') return entities[code.toLowerCase()] ?? match;
    const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(value) ? String.fromCodePoint(value) : match;
  });
}
function attributes(tag) {
  const result = {};
  for (const [, name, value] of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) result[name] = decodeXml(value);
  return result;
}
const childText = (block, name) => {
  const match = block.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return match ? decodeXml(match[1]) : null;
};

// Convierte el bloque <machine>…</machine> de -listxml en lo que el launcher necesita.
export function parseMachine(block) {
  const head = attributes(block.slice(0, block.indexOf('>')));
  const biosSets = [...block.matchAll(/<biosset\s[^>]*>/g)].map((match) => attributes(match[0]));
  const defaultBios = (biosSets.find((item) => item.default === 'yes') ?? biosSets[0])?.name ?? null;
  const roms = [];
  for (const match of block.matchAll(/<rom\s[^>]*>/g)) {
    const rom = attributes(match[0]);
    if (!rom.crc || rom.status === 'nodump' || rom.optional === 'yes') continue;
    // De un BIOS con varias opciones sólo hace falta la opción por defecto.
    if (rom.bios && defaultBios && rom.bios !== defaultBios) continue;
    roms.push(rom.crc.toLowerCase());
  }
  const driver = attributes(block.match(/<driver\s[^>]*>/)?.[0] ?? '');
  const input = attributes(block.match(/<input\s[^>]*>/)?.[0] ?? '');
  const display = attributes(block.match(/<display\s[^>]*>/)?.[0] ?? '');
  const controls = [...new Set([...block.matchAll(/<control\s[^>]*type="([^"]+)"/g)].map((match) => match[1]))];
  return {
    name: head.name,
    description: childText(block, 'description') ?? head.name,
    year: childText(block, 'year'),
    manufacturer: childText(block, 'manufacturer'),
    cloneof: head.cloneof ?? null,
    romof: head.romof ?? null,
    isbios: head.isbios === 'yes',
    isdevice: head.isdevice === 'yes',
    ismechanical: head.ismechanical === 'yes',
    runnable: head.runnable !== 'no',
    status: driver.status ?? null,
    players: input.players ? Number(input.players) : null,
    controls,
    vertical: display.rotate === '90' || display.rotate === '270',
    roms,
    disks: [...block.matchAll(/<disk\s[^>]*>/g)].filter((match) => !/status="nodump"/.test(match[0])).length,
    devices: [...new Set([...block.matchAll(/<device_ref\s+name="([^"]+)"/g)].map((match) => match[1]))]
  };
}

// Lee -listxml en flujo (son cientos de MB) y conserva sólo las máquinas útiles: las pedidas, sus padres,
// sus BIOS y los dispositivos que tienen ROMs.
export async function parseListXml(chunks, wanted) {
  const machines = new Map();
  let version = null;
  let buffer = '';
  for await (const chunk of chunks) {
    buffer += chunk;
    if (!version) version = buffer.match(/<mame\s+build="([^"]+)"/)?.[1] ?? null;
    let start = buffer.indexOf('<machine ');
    while (start >= 0) {
      const end = buffer.indexOf('</machine>', start);
      if (end < 0) break;
      const block = buffer.slice(start, end);
      const name = block.match(/^<machine\s+name="([^"]+)"/)?.[1];
      if (
        name &&
        (wanted.has(name) || /isbios="yes"|isdevice="yes"/.test(block.slice(0, 300)) || /<rom\s/.test(block))
      ) {
        const machine = parseMachine(block);
        if (wanted.has(name) || machine.isbios || (machine.isdevice && machine.roms.length))
          machines.set(name, machine);
        else machines.set(name, { name, romof: machine.romof, roms: machine.roms, devices: [], parentOnly: true });
      }
      buffer = buffer.slice(end + 10);
      start = buffer.indexOf('<machine ');
    }
    if (start < 0 && buffer.length > 1_000_000) buffer = buffer.slice(-1000);
  }
  return { version, machines };
}

// Deja sólo lo que hace falta para verificar los sets presentes: ellos, sus padres y BIOS, y sus dispositivos.
export function pruneMachines(machines, wanted) {
  const keep = new Map();
  const add = (name) => {
    if (!name || keep.has(name) || !machines.has(name)) return;
    const machine = machines.get(name);
    keep.set(name, machine);
    add(machine.romof);
    for (const device of machine.devices ?? []) add(device);
  };
  for (const name of wanted) add(name);
  return keep;
}

// Un set arranca si cada ROM requerida está, por CRC, en su .zip o en el de su padre o BIOS,
// y si los dispositivos que usa también tienen sus ROMs.
export function verifyMachine(name, machines, zips) {
  const machine = machines.get(name);
  if (!machine) return 'unknown';
  const pool = new Set();
  const seen = new Set();
  for (let current = name; current && !seen.has(current); current = machines.get(current)?.romof) {
    seen.add(current);
    for (const crc of zips.get(current) ?? []) pool.add(crc);
  }
  if (machine.roms.some((crc) => !pool.has(crc))) return 'missing';
  for (const device of machine.devices ?? []) {
    const roms = machines.get(device)?.roms ?? [];
    const own = zips.get(device) ?? new Set();
    if (roms.some((crc) => !pool.has(crc) && !own.has(crc))) return 'device';
  }
  if (machine.disks) return 'disk';
  return 'good';
}

// Archivos .ini de carpetas (bestgames, series, catver): secciones con nombres de sets.
export function parseFolderIni(text) {
  const sections = new Map();
  let current = null;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith(';')) continue;
    const header = line.match(/^\[(.+)\]$/);
    if (header) {
      current = header[1];
      if (!sections.has(current)) sections.set(current, []);
    } else if (current) sections.get(current).push(line);
  }
  return sections;
}
export function parseCatver(text) {
  const categories = new Map();
  for (const line of parseFolderIni(text).get('Category') ?? []) {
    const at = line.indexOf('=');
    if (at > 0) categories.set(line.slice(0, at).trim(), line.slice(at + 1).trim());
  }
  return categories;
}
// bestgames.ini: secciones «90 to 100 (Best Games)»; se guarda el límite inferior como puntaje.
export function parseBestGames(text) {
  const scores = new Map();
  for (const [section, names] of parseFolderIni(text)) {
    const low = section.match(/^(\d+)\s+to\s+\d+/)?.[1];
    if (low != null) for (const name of names) scores.set(name, Number(low));
  }
  return scores;
}
export function parseSeries(text) {
  const series = new Map();
  for (const [section, names] of parseFolderIni(text)) {
    if (section === 'FOLDER_SETTINGS' || section === 'ROOT_FOLDER') continue;
    const title = section.replace(/\s*\*.*$/, '').trim();
    for (const name of names) series.set(name, title);
  }
  return series;
}

// «Bubble Bobble (Japan, Ver 0.1)» → «Bubble Bobble». La versión queda en la lista de versiones.
export function arcadeTitle(description) {
  const title = String(description)
    .replace(/\s*\(.*$/, '')
    .replace(/\s*\/.*$/, '')
    .trim();
  return title || String(description);
}
export function versionLabel(description) {
  return String(description).match(/\((.*)\)\s*$/)?.[1] ?? '';
}

// Géneros con el mismo vocabulario que IGDB, para que el filtro Género no se duplique.
export function arcadeGenres(category) {
  const [top = '', sub = ''] = String(category ?? '')
    .replace(/\s*\*\s*Mature\s*\*/i, '')
    .split(' / ')
    .map((part) => part.trim());
  if (top === 'Shooter') return ['Shooter'];
  if (top === 'Platform') return /Fighter/.test(sub) ? ['Platform', "Hack and slash/Beat 'em up"] : ['Platform'];
  if (top === 'Fighter') return /Versus|3D|Field/.test(sub) ? ['Fighting'] : ["Hack and slash/Beat 'em up"];
  if (top === 'Sports') return ['Sport'];
  if (top === 'Driving') return ['Racing'];
  if (top === 'Puzzle') return ['Puzzle'];
  if (top === 'Maze') return /Shooter/.test(sub) ? ['Maze', 'Shooter'] : ['Maze'];
  if (top === 'Ball & Paddle') return ['Ball & Paddle'];
  if (top === 'MultiGame' || top === 'Multiplay') return ['Compilation'];
  if (top === 'Climbing') return ['Platform'];
  if (top === 'Music Game') return ['Music'];
  if (top === 'Arcade' && /Pinball/.test(sub)) return ['Pinball'];
  if (top === 'Quiz') return ['Quiz/Trivia'];
  if (top === 'Tabletop' || top === 'Gambling' || top === 'Slot Machine') return ['Card & Board Game'];
  return [];
}
// Contenido que no se muestra salvo que se active en Configuración: adulto, casino, mahjong y similares.
export function isAdultOrCasino(category) {
  const value = String(category ?? '');
  return /\*\s*Mature\s*\*/i.test(value) || /^(Tabletop|Gambling|Slot Machine)\b/.test(value);
}
// Categorías que no son juegos para jugar con mando: utilidades, consolas, preguntas en idiomas lejanos.
export function isNotAGame(category) {
  const value = String(category ?? '');
  if (/^(Utilities|Misc\.|Game Console|System)\b/.test(value)) return true;
  if (/^Quiz\b/.test(value)) return !/English|Spanish/.test(value);
  return false;
}

// Nombres de archivo de libretro-thumbnails: la descripción de MAME con &*/:`<>?\|" reemplazados por _.
export function thumbnailName(description) {
  return String(description).replace(/[&*/:`<>?\\|"]/g, '_');
}

// Orden de preferencia de una versión para representar al juego.
export function regionRank(machine, group) {
  const text = String(machine.description);
  if (/bootleg|hack|prototype|location test|unprotected/i.test(text)) return 9;
  const original = machine.name === group ? 0 : 1;
  if (/\(World|\(US|\(USA|\(Midway|\(Atari|, US|, World/i.test(text)) return 1 + original;
  if (/Japan/i.test(text)) return 6 + original;
  if (/\((Europe|Euro|UK|Asia|Korea|Taiwan|Hong Kong|Brazil|Spain|Italy|Germany|France)/i.test(text))
    return 4 + original;
  return 3 + original;
}

// Arma el catálogo: un juego por grupo de versiones, con la copia original adelante.
export function buildArcade({ machines, verified, catver = new Map(), bestgames = new Map(), series = new Map() }) {
  const groups = new Map();
  const stats = { sets: 0, good: 0, missing: 0, device: 0, disk: 0, unknown: 0, hidden: 0, preliminary: 0 };
  for (const [name, result] of verified) {
    stats.sets += 1;
    if (result !== 'good') {
      stats[result] = (stats[result] ?? 0) + 1;
      continue;
    }
    const machine = machines.get(name);
    if (!machine || machine.isbios || machine.isdevice || machine.ismechanical || !machine.runnable) {
      stats.hidden += 1;
      continue;
    }
    stats.good += 1;
    const category = catver.get(name) ?? catver.get(machine.cloneof) ?? '';
    if (isNotAGame(category)) {
      stats.hidden += 1;
      continue;
    }
    if (machine.status === 'preliminary') {
      stats.preliminary += 1;
      continue;
    }
    const group = machine.cloneof ?? name;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ machine, category });
  }
  const games = [];
  for (const [group, members] of groups) {
    // Adelante va la versión con la que el juego se conoce: el original si es mundial o de EE. UU.;
    // si el original es japonés o un prototipo, la mejor versión internacional.
    members.sort(
      (a, b) =>
        regionRank(a.machine, group) - regionRank(b.machine, group) ||
        (a.machine.status === 'good' ? 0 : 1) - (b.machine.status === 'good' ? 0 : 1) ||
        a.machine.name.localeCompare(b.machine.name)
    );
    const { machine, category } = members[0];
    const parent = machines.get(group);
    const title = arcadeTitle(machine.description);
    const score = bestgames.get(group) ?? bestgames.get(machine.name) ?? null;
    games.push({
      key: `arcade:${machine.name}`,
      id: machine.name,
      name: title,
      platform: 'Arcade',
      installed: true,
      status: 'installed',
      launch: { type: 'mame', target: machine.name, available: true },
      evidence: 'Set verificado con MAME',
      adult: isAdultOrCasino(category),
      arcade: {
        description: machine.description,
        year: machine.year,
        manufacturer: machine.manufacturer,
        players: machine.players,
        controls: machine.controls,
        vertical: machine.vertical,
        emulation: machine.status,
        category: category.replace(/\s*\*\s*Mature\s*\*/i, '') || null,
        series: series.get(group) ?? series.get(machine.name) ?? null,
        score,
        art: [
          ...new Set([machine.description, parent?.description, ...members.map((item) => item.machine.description)])
        ]
          .filter(Boolean)
          .concat(title),
        // Si la versión tiene otro título (un clon como Hangly-Man), se muestra completo; si no, sólo su variante.
        versions: members.slice(1).map((item) => ({
          id: item.machine.name,
          description: item.machine.description,
          label:
            arcadeTitle(item.machine.description) === title
              ? versionLabel(item.machine.description) || item.machine.name
              : item.machine.description,
          emulation: item.machine.status
        }))
      },
      meta: {
        title,
        year: /^\d{4}$/.test(machine.year ?? '') ? Number(machine.year) : null,
        genres: arcadeGenres(category),
        developers: machine.manufacturer ? [machine.manufacturer.replace(/\s*\(.*\)\s*$/, '')] : []
      }
    });
  }
  // Juegos distintos con el mismo título (el Tetris de Atari y el de Sega) se distinguen por fabricante y año.
  const counts = new Map();
  for (const game of games) counts.set(game.name, (counts.get(game.name) ?? 0) + 1);
  const maker = (game) =>
    (game.meta.developers[0] ?? '')
      .split(/\s*[/,(]\s*/)[0]
      .replace(/\s+(Corporation|Corp\.?|Co\.?|Inc\.?|Ltd\.?|Industries|Electronics|Enterprises|Games)\b.*$/i, '')
      .trim();
  for (const game of games) {
    if (counts.get(game.name) < 2) continue;
    game.name = `${game.name} (${[maker(game), game.arcade.year].filter(Boolean).join(', ')})`;
  }
  const again = new Map();
  for (const game of games) again.set(game.name, (again.get(game.name) ?? 0) + 1);
  for (const game of games) if (again.get(game.name) > 1) game.name = game.arcade.description;
  games.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  stats.games = games.length;
  return { games, stats };
}

// rompath de mame.ini: rutas separadas por «;», relativas a la carpeta de MAME.
export function romPaths(ini, mameDir) {
  const line = String(ini)
    .match(/^\s*rompath\s+(.+)$/m)?.[1]
    ?.trim()
    .replace(/^"|"$/g, '');
  const parts = (line || 'roms')
    .split(';')
    .map((item) => item.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
  return [...new Set(parts.map((item) => path.resolve(mameDir, item)))];
}

// ---------- Integración ----------

export function createArcade(dataDir, { fetchImpl = globalThis.fetch, spawnImpl = spawn } = {}) {
  const settingsPath = path.join(dataDir, 'arcade.json');
  const catalogPath = path.join(dataDir, 'arcade-catalog.json');
  const zipCachePath = path.join(dataDir, 'arcade-zips.json');
  const supportDir = path.join(dataDir, 'mame-support');
  const status = { running: false, phase: null, done: 0, total: 0, error: null, finishedAt: null };
  let catalog = null;

  async function readJson(file, fallback) {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      return fallback;
    }
  }
  async function writeJson(file, value) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(value));
    await fs.rename(temporary, file);
  }
  async function settings() {
    const saved = await readJson(settingsPath, {});
    return { exe: typeof saved.exe === 'string' ? saved.exe : '', showAdult: saved.showAdult === true };
  }
  async function saveSettings(patch) {
    await writeJson(settingsPath, { ...(await readJson(settingsPath, {})), ...patch });
  }
  async function loadCatalog() {
    if (!catalog) catalog = await readJson(catalogPath, null);
    return catalog?.schema === CACHE_SCHEMA ? catalog : null;
  }

  function run(exe, args) {
    return spawnImpl(exe, args, { cwd: path.dirname(exe), windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  }
  async function mameVersion(exe) {
    const child = run(exe, ['-version']);
    let output = '';
    for await (const chunk of child.stdout) output += chunk;
    return output.trim().split(/\s/)[0] || null;
  }
  async function support(name) {
    const file = path.join(supportDir, `${name}.ini`);
    try {
      const stat = await fs.stat(file);
      if (Date.now() - stat.mtimeMs < SUPPORT_MAX_AGE) return await fs.readFile(file, 'utf8');
    } catch {
      /* todavía no se descargó */
    }
    try {
      const response = await fetchImpl(SUPPORT_BASE + SUPPORT_FILES[name], { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(String(response.status));
      const text = await response.text();
      await fs.mkdir(supportDir, { recursive: true });
      await fs.writeFile(file, text);
      return text;
    } catch {
      // Sin conexión se usa la copia anterior, aunque sea vieja; sin copia, el juego queda sin género ni ranking.
      return fs.readFile(file, 'utf8').catch(() => '');
    }
  }

  async function index() {
    const { exe } = await settings();
    if (!exe) throw new Error('Indicá dónde está mame.exe.');
    await fs.access(exe).catch(() => {
      throw new Error('No se encontró mame.exe en esa ruta.');
    });
    const mameDir = path.dirname(exe);
    status.phase = 'version';
    const version = await mameVersion(exe);
    if (!version) throw new Error('mame.exe no respondió. Verificá que sea el ejecutable de MAME.');
    const ini = await fs.readFile(path.join(mameDir, 'mame.ini'), 'utf8').catch(() => '');
    // Índice de los .zip; sólo se vuelven a leer los que cambiaron de tamaño o fecha.
    status.phase = 'zips';
    const previous = (await readJson(zipCachePath, {})).zips ?? {};
    const zipIndex = {};
    const files = [];
    for (const folder of romPaths(ini, mameDir)) {
      const entries = await fs.readdir(folder).catch(() => []);
      for (const entry of entries) if (/\.zip$/i.test(entry)) files.push(path.join(folder, entry));
    }
    Object.assign(status, { done: 0, total: files.length });
    for (const file of files) {
      const name = path.basename(file, path.extname(file)).toLowerCase();
      try {
        const stat = await fs.stat(file);
        const signature = `${stat.size}:${Math.round(stat.mtimeMs)}`;
        const cached = previous[name];
        zipIndex[name] =
          cached?.signature === signature
            ? cached
            : { signature, crcs: (await readZipEntries(file)).map((entry) => entry.crc) };
      } catch {
        /* un .zip dañado no frena la indexación: ese set queda como incompleto */
      }
      status.done += 1;
    }
    await writeJson(zipCachePath, { zips: zipIndex });
    // Descripción de las máquinas: -listxml, guardado por versión de MAME y conjunto de archivos.
    status.phase = 'listxml';
    const wanted = new Set(Object.keys(zipIndex));
    const fingerprint = crypto
      .createHash('sha256')
      .update([...wanted].sort().join(','))
      .digest('hex')
      .slice(0, 16);
    const listPath = path.join(dataDir, `mame-${version}.json`);
    let listed = await readJson(listPath, null);
    if (listed?.fingerprint !== fingerprint) {
      const child = run(exe, ['-listxml']);
      child.stdout.setEncoding('utf8');
      const parsed = await parseListXml(child.stdout, wanted);
      listed = { fingerprint, version, machines: Object.fromEntries(pruneMachines(parsed.machines, wanted)) };
      await writeJson(listPath, listed);
    }
    const machines = new Map(Object.entries(listed.machines));
    status.phase = 'verify';
    const zips = new Map(Object.entries(zipIndex).map(([name, item]) => [name, new Set(item.crcs)]));
    const verified = new Map([...wanted].map((name) => [name, verifyMachine(name, machines, zips)]));
    status.phase = 'details';
    const [catver, bestgames, series] = await Promise.all([support('catver'), support('bestgames'), support('series')]);
    const built = buildArcade({
      machines,
      verified,
      catver: parseCatver(catver),
      bestgames: parseBestGames(bestgames),
      series: parseSeries(series)
    });
    catalog = { schema: CACHE_SCHEMA, version, mameDir, indexedAt: new Date().toISOString(), ...built };
    await writeJson(catalogPath, catalog);
    return catalog;
  }

  return {
    status: () => ({ ...status }),
    settings,
    // Para la búsqueda nocturna: indexa y espera el resultado.
    refresh: index,
    async info() {
      const saved = await settings();
      const current = await loadCatalog();
      return {
        ...saved,
        configured: Boolean(saved.exe),
        visible: current ? current.games.filter((game) => saved.showAdult || !game.adult).length : 0,
        adult: current ? current.games.filter((game) => game.adult).length : 0,
        version: current?.version ?? null,
        indexedAt: current?.indexedAt ?? null,
        stats: current?.stats ?? null,
        status: { ...status }
      };
    },
    async configure(update) {
      const patch = {};
      if ('exe' in update) {
        const exe = String(update.exe ?? '')
          .trim()
          .replace(/^"|"$/g, '');
        if (exe && !/mame[^\\/]*\.exe$/i.test(exe)) throw new Error('Indicá la ruta completa de mame.exe.');
        patch.exe = exe;
      }
      if ('showAdult' in update) {
        if (typeof update.showAdult !== 'boolean') throw new Error('Valor no válido.');
        patch.showAdult = update.showAdult;
      }
      await saveSettings(patch);
      if (patch.exe === '') {
        catalog = null;
        await fs.rm(catalogPath, { force: true });
      }
    },
    // Juegos listos para la biblioteca; el contenido adulto y de casino sólo si se activó.
    async games() {
      const current = await loadCatalog();
      if (!current) return [];
      const { showAdult } = await settings();
      return current.games.filter((game) => showAdult || !game.adult);
    },
    start() {
      if (status.running) return;
      Object.assign(status, { running: true, phase: 'start', done: 0, total: 0, error: null });
      index()
        .catch((error) => {
          status.error = error.message;
        })
        .finally(() => {
          status.running = false;
          status.phase = null;
          status.finishedAt = new Date().toISOString();
        });
    },
    // Imágenes: primero las carpetas de arte de MAME (si las hay), después libretro-thumbnails.
    async localArt(game, kind) {
      const current = await loadCatalog();
      const dir = current?.mameDir;
      if (!dir) return [];
      const folders =
        { cover: ['flyers', 'titles'], hero: ['snap', 'titles'], wordmark: ['logo', 'marquees'] }[kind] ?? [];
      return folders.map((folder) => path.join(dir, folder, `${game.id}.png`));
    },
    onlineSources(game, kind) {
      const folders =
        { cover: ['Named_Boxarts', 'Named_Titles'], hero: ['Named_Snaps', 'Named_Titles'], wordmark: ['Named_Logos'] }[
          kind
        ] ?? [];
      const names = game.arcade?.art ?? [game.name];
      return folders.flatMap((folder) =>
        names.map((name) => `${THUMBNAILS}${folder}/${encodeURIComponent(thumbnailName(name))}.png`)
      );
    },
    // Abre MAME con el set pedido desde su carpeta (así usa su mame.ini) y avisa al cerrarse.
    async launch(id, onExit) {
      const current = await loadCatalog();
      const { exe } = await settings();
      if (!exe || !current) throw new Error('Configurá MAME en Configuración.');
      if (!/^[a-z0-9_]+$/i.test(id)) throw new Error('Set de MAME no válido.');
      const known = current.games.some((game) => game.id === id || game.arcade.versions.some((item) => item.id === id));
      if (!known) throw new Error('Ese set no está en tu biblioteca de Arcade.');
      const started = Date.now();
      const child = spawnImpl(exe, [id], { cwd: path.dirname(exe), stdio: 'ignore', windowsHide: false });
      child.once('exit', () => onExit?.(Math.round((Date.now() - started) / 1000)));
      await new Promise((resolve, reject) => {
        child.once('spawn', resolve);
        child.once('error', reject);
      }).catch((error) => {
        throw new Error(`No se pudo iniciar MAME: ${error.message}`);
      });
    }
  };
}
