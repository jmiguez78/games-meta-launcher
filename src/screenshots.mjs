// Tus capturas: las imágenes y los videos (.mp4, .webm) que grabás mientras jugás, leídos de donde los guarda
// cada programa.
// - Steam (F12): userdata/<cuenta>/760/remote/<appid>/screenshots/, con miniaturas en thumbnails/.
// - MAME (F12): <snapshot_directory>/<set>/0000.png.
// - Xbox Game Bar (también el botón de captura del mando): la carpeta «Capturas» de Windows; el nombre del
//   archivo empieza con el del juego. Los .jxr (HDR) se ignoran: Game Bar guarda al lado una copia .png.
// - NVIDIA, Videos y carpetas propias: una subcarpeta por juego con su nombre, o archivos con el nombre del juego.
// Los videos de MAME grabados con Game Bar («MAME_ Kung-Fu Master (World) [kungfum] ….mp4») se asocian por el set.
// Nada se copia ni se modifica: el índice vive en memoria y se rehace como mucho una vez por minuto.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { displayName } from './names.mjs';

export const IMAGE_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};
export const VIDEO_TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};
const extension = (name) => path.extname(name).toLowerCase();
const kindOf = (name) =>
  Object.hasOwn(IMAGE_TYPES, extension(name)) ? 'image' : Object.hasOwn(VIDEO_TYPES, extension(name)) ? 'video' : null;
export const mediaType = (name) => IMAGE_TYPES[extension(name)] ?? VIDEO_TYPES[extension(name)] ?? null;
// Una imagen se lee entera para servirla; un video se sirve por partes, así que no tiene límite de tamaño.
const MAX_BYTES = 60_000_000;
const MAX_DEPTH = 3;

// Nombres comparables: sin tildes, marcas ni signos ("Control™ Resonant" → "control resonant").
export function normalizeName(name) {
  return displayName(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Nombre del juego a partir del archivo: se corta en la fecha que agregan Game Bar y NVIDIA
// ("Control Resonant 2026-11-04 21-33-05.png", "Control Resonant Screenshot 2026.11.04 - 21.33.05.12.png").
export function titleFromFile(file) {
  const base = path.basename(file, path.extname(file));
  const cut = base.search(/\s\d{1,4}[-_.]\d{1,2}[-_.]\d{1,4}(?:\D|$)/);
  const title = cut > 0 ? base.slice(0, cut) : base;
  return title.replace(/[\s_-]+(screenshot|captura|snapshot|instantanea)\s*$/i, '').trim();
}

// Índice de nombres para asociar carpetas y archivos con juegos. Los de Arcade quedan afuera: son miles,
// con títulos cortos, y sus capturas ya llegan ordenadas por set desde MAME.
export function nameMatcher(games) {
  const byName = new Map();
  for (const game of games) {
    if (game.platform === 'Arcade') continue;
    const name = normalizeName(game.name);
    if (name.length >= 3 && !byName.has(name)) byName.set(name, game.key);
  }
  const names = [...byName.keys()].sort((a, b) => b.length - a.length);
  return (candidate) => {
    const text = normalizeName(candidate);
    if (!text) return null;
    if (byName.has(text)) return byName.get(text);
    // «Control Resonant Deluxe» → «Control Resonant»: el nombre más largo que sea el comienzo del texto.
    const prefix = names.find((name) => name.length >= 4 && text.startsWith(name + ' '));
    if (prefix) return byName.get(prefix);
    // «Control» (título de la ventana) → «Control Ultimate Edition», sólo si hay un único candidato.
    if (text.length < 4) return null;
    const longer = names.filter((name) => name.startsWith(text + ' '));
    return longer.length === 1 ? byName.get(longer[0]) : null;
  };
}

async function entries(dir) {
  return fs.readdir(dir, { withFileTypes: true }).catch(() => []);
}
// Imágenes y videos de una carpeta (sin subcarpetas). Steam sólo guarda imágenes: con videos = false se ignoran.
async function mediaIn(dir, { videos = true } = {}) {
  const found = [];
  for (const entry of await entries(dir)) {
    const kind = entry.isFile() ? kindOf(entry.name) : null;
    if (!kind || (kind === 'video' && !videos)) continue;
    const file = path.join(dir, entry.name);
    const info = await fs.stat(file).catch(() => null);
    if (!info || info.size <= 0 || (kind === 'image' && info.size > MAX_BYTES)) continue;
    found.push({ file, kind, size: info.size, takenAt: info.mtime.toISOString() });
  }
  return found;
}
// «MAME_ Kung-Fu Master (World) [kungfum] 2020-02-24 15-25-35.mp4» → «kungfum».
export function arcadeSetFromFile(file) {
  const base = path.basename(file, path.extname(file));
  return /^mame(?:[\s_:-]|$)/i.test(base) ? (base.match(/\[([a-z0-9_]+)\]/i)?.[1]?.toLowerCase() ?? null) : null;
}

// Lee una fuente y devuelve [{ key, file, kind, size, thumb?, takenAt }] para los juegos que reconoce.
async function readSource(source, lookup) {
  const found = [];
  const add = (key, items, extra = () => ({})) => {
    if (key) for (const item of items) found.push({ key, ...item, ...extra(item) });
  };
  if (source.kind === 'steam') {
    for (const user of await entries(source.dir)) {
      if (!user.isDirectory()) continue;
      const remote = path.join(source.dir, user.name, '760', 'remote');
      for (const app of await entries(remote)) {
        if (!app.isDirectory() || !/^\d+$/.test(app.name)) continue;
        const key = lookup.steam.get(app.name);
        if (!key) continue;
        const shots = path.join(remote, app.name, 'screenshots');
        const thumbs = new Set(
          (await entries(path.join(shots, 'thumbnails'))).filter((item) => item.isFile()).map((item) => item.name)
        );
        add(key, await mediaIn(shots, { videos: false }), (item) => {
          const name = path.basename(item.file);
          return thumbs.has(name) ? { thumb: path.join(shots, 'thumbnails', name) } : {};
        });
      }
    }
  } else if (source.kind === 'mame') {
    for (const set of await entries(source.dir)) {
      if (!set.isDirectory()) continue;
      const key = lookup.arcade.get(set.name.toLowerCase());
      if (key) add(key, await mediaIn(path.join(source.dir, set.name)));
    }
  } else {
    // Carpetas por nombre (Game Bar, NVIDIA, Videos y las propias), hasta MAX_DEPTH niveles. Una carpeta con el
    // nombre de un juego le da todas sus imágenes y videos; si no, cada archivo se asocia por su nombre. Así funciona
    // tanto «Videos\Herdling\Herdling 23_8_2025.png» como «Videos\Expedition 33\Clair Obscur_ Expedition 33 ….png».
    const skip = new Set((source.skip ?? []).map((name) => name.toLowerCase()));
    const matchFile = (file) => {
      const set = arcadeSetFromFile(file);
      return (set && lookup.arcade.get(set)) || lookup.byName(titleFromFile(file));
    };
    const walk = async (dir, depth, key) => {
      if (key || source.mode !== 'folders' || depth > 0)
        for (const item of await mediaIn(dir)) add(key ?? matchFile(item.file), [item]);
      if (depth >= MAX_DEPTH || source.mode === 'files') return;
      for (const entry of await entries(dir)) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        if (depth === 0 && skip.has(entry.name.toLowerCase())) continue;
        await walk(path.join(dir, entry.name), depth + 1, key ?? lookup.byName(entry.name));
      }
    };
    await walk(source.dir, 0, null);
  }
  return found.map((item) => ({ ...item, source: source.label }));
}

export function buildLookup(games) {
  const steam = new Map();
  const arcade = new Map();
  for (const game of games) {
    if (game.platform === 'Steam' && /^\d+$/.test(game.id)) steam.set(String(game.id), game.key);
    if (game.platform === 'Arcade') {
      for (const id of [game.id, ...(game.arcade?.versions ?? []).map((version) => version.id)])
        if (id && !arcade.has(String(id).toLowerCase())) arcade.set(String(id).toLowerCase(), game.key);
    }
  }
  return { steam, arcade, byName: nameMatcher(games) };
}

const idOf = (file) => crypto.createHash('sha1').update(path.resolve(file).toLowerCase()).digest('hex').slice(0, 20);

// sources(): las carpetas a revisar, [{ kind: 'steam' | 'mame' | 'named', label, dir, mode?, skip? }].
// games(): la biblioteca actual, para asociar cada captura con su juego.
export function createScreenshots({ sources, games, ttl = 60_000, now = Date.now }) {
  let cached = null;
  let building = null;
  async function build() {
    const [list, catalog] = await Promise.all([sources(), games()]);
    const lookup = buildLookup(catalog);
    const names = new Map(catalog.map((game) => [game.key, game.name]));
    const seen = new Set();
    const items = [];
    const folders = [];
    const dirs = new Set();
    for (const source of list) {
      // La misma carpeta puede llegar dos veces (por ejemplo, si las capturas de Game Bar van a «Videos»).
      const dirKey = path.resolve(source.dir).toLowerCase();
      if (dirs.has(dirKey)) continue;
      dirs.add(dirKey);
      const exists = await fs
        .stat(source.dir)
        .then((info) => info.isDirectory())
        .catch(() => false);
      const found = exists ? await readSource(source, lookup) : [];
      let count = 0;
      let videos = 0;
      for (const item of found) {
        const id = idOf(item.file);
        if (seen.has(id)) continue;
        seen.add(id);
        count += 1;
        if (item.kind === 'video') videos += 1;
        items.push({ id, ...item, name: names.get(item.key) ?? '' });
      }
      folders.push({ label: source.label, dir: source.dir, exists, count, videos, custom: Boolean(source.custom) });
    }
    items.sort((a, b) => b.takenAt.localeCompare(a.takenAt) || a.file.localeCompare(b.file));
    const byKey = new Map();
    for (const item of items) {
      if (!byKey.has(item.key)) byKey.set(item.key, []);
      byKey.get(item.key).push(item);
    }
    return { builtAt: now(), items, byKey, byId: new Map(items.map((item) => [item.id, item])), folders };
  }
  async function index({ refresh = false } = {}) {
    if (!refresh && cached && now() - cached.builtAt < ttl) return cached;
    building ??= build().finally(() => {
      building = null;
    });
    cached = await building;
    return cached;
  }
  // Lo que ve la interfaz: sin rutas completas, sólo la carpeta para mostrar y abrir.
  const publicItem = (item) => ({
    id: item.id,
    key: item.key,
    name: item.name,
    source: item.source,
    takenAt: item.takenAt,
    folder: path.dirname(item.file),
    kind: item.kind,
    ...(item.kind === 'video' ? { size: item.size } : {}),
    thumb: Boolean(item.thumb)
  });
  return {
    async forGame(key, options) {
      const current = await index(options);
      const items = current.byKey.get(key) ?? [];
      const videos = items.filter((item) => item.kind === 'video').length;
      return {
        total: items.length,
        images: items.length - videos,
        videos,
        items: items.map(publicItem),
        folders: [...new Set(items.map((item) => path.dirname(item.file)))]
      };
    },
    // kind: 'image' para la fila de Inicio (abrir decenas de videos para sus miniaturas sería pesado).
    async recent(limit = 12, { kind, ...options } = {}) {
      const current = await index(options);
      const items = kind ? current.items.filter((item) => item.kind === kind) : current.items;
      return { total: items.length, items: items.slice(0, limit).map(publicItem) };
    },
    async folders(options) {
      return (await index(options)).folders;
    },
    // Sólo se sirven archivos que están en el índice: el identificador nunca es una ruta.
    async file(id, { thumb = false } = {}) {
      const item = (await index()).byId.get(id);
      if (!item || item.kind === 'video') return null;
      const target = thumb && item.thumb ? item.thumb : item.file;
      const type = mediaType(target);
      try {
        return { bytes: await fs.readFile(target), type, file: item.file };
      } catch {
        cached = null;
        return null;
      }
    },
    // Videos: se sirven por partes (Range); acá sólo se confirma que existen y se da su tamaño.
    async video(id) {
      const item = (await index()).byId.get(id);
      if (!item || item.kind !== 'video') return null;
      const info = await fs.stat(item.file).catch(() => null);
      if (!info) {
        cached = null;
        return null;
      }
      return { file: item.file, size: info.size, type: mediaType(item.file) };
    },
    async path(id) {
      return (await index()).byId.get(id)?.file ?? null;
    },
    forget() {
      cached = null;
    }
  };
}

// Carpeta de capturas de MAME según su mame.ini (snapshot_directory; «snap» si no está).
export function snapshotDirectory(ini, mameDir) {
  const value = String(ini ?? '').match(/^\s*snapshot_directory\s+(.+?)\s*$/im)?.[1] ?? 'snap';
  const first = value.replace(/^"|"$/g, '').split(';')[0].trim() || 'snap';
  return path.resolve(mameDir, first);
}
