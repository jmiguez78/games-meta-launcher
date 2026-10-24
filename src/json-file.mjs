// Archivos JSON del perfil: lectura con caché en memoria y escritura atómica.
// - Lectura: el contenido se guarda en memoria junto con la fecha y el tamaño del archivo; mientras no cambien,
//   se devuelve el mismo objeto sin volver a leer ni a interpretar el disco. Otro proceso (la indexación
//   programada) que reescriba el archivo cambia la fecha y la próxima lectura lo toma.
//   El objeto devuelto es compartido: no se modifica; para cambiarlo se usa update().
// - Escritura: primero a un archivo temporal y después un renombre, para que un corte de luz o un cierre a mitad
//   de camino nunca deje un archivo a medio escribir. Las escrituras de un mismo archivo van en fila.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { log } from './log.mjs';

const cache = new Map();
const queues = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stamp = (info) => `${info.mtimeMs}:${info.size}`;

export async function readJsonCached(file, fallback) {
  let info;
  try {
    info = await fs.stat(file);
  } catch {
    cache.delete(file);
    return fallback;
  }
  const entry = cache.get(file);
  if (entry && entry.stamp === stamp(info)) return entry.value;
  try {
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    cache.set(file, { stamp: stamp(info), value });
    return value;
  } catch (error) {
    log('warn', 'json', `No se pudo leer ${path.basename(file)}: ${error.message}`);
    return fallback;
  }
}

// En Windows, un antivirus o el indexador pueden tener el archivo abierto un instante: se reintenta.
async function replace(temporary, file) {
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(temporary, file);
      return;
    } catch (error) {
      if (attempt >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) {
        await fs.rm(temporary, { force: true }).catch(() => {});
        throw error;
      }
      await sleep(40 * (attempt + 1));
    }
  }
}

async function writeNow(file, value, { pretty = true } = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  const handle = await fs.open(temporary, 'w');
  try {
    await handle.writeFile(JSON.stringify(value, null, pretty ? 2 : 0), 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await replace(temporary, file);
  try {
    cache.set(file, { stamp: stamp(await fs.stat(file)), value });
  } catch {
    cache.delete(file);
  }
}

function enqueue(file, task) {
  const previous = queues.get(file) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  queues.set(file, next);
  next
    .finally(() => {
      if (queues.get(file) === next) queues.delete(file);
    })
    .catch(() => {});
  return next;
}

export function writeJsonAtomic(file, value, options) {
  return enqueue(file, () => writeNow(file, value, options));
}

// Lee, aplica el cambio sobre una copia y guarda, en fila con las demás escrituras del archivo: dos cambios
// seguidos (marcar favorito y calificar) nunca se pisan.
export function updateJson(file, change, { fallback = {}, ...options } = {}) {
  return enqueue(file, async () => {
    const current = structuredClone(await readJsonCached(file, fallback));
    const next = (await change(current)) ?? current;
    await writeNow(file, next, options);
    return next;
  });
}

// Archivo con versión de esquema. Si el guardado es de una versión anterior, antes de migrarlo se deja una copia
// (nombre.v1.bak.json) y después se guarda migrado. Una versión posterior (de una app más nueva) no se toca.
export function createVersionedFile(file, { version, migrations = {}, fallback, pretty = true }) {
  let ready = null;
  async function migrate() {
    const saved = await readJsonCached(file, null);
    if (!saved) return;
    const from = Number.isInteger(saved.schemaVersion) ? saved.schemaVersion : 0;
    if (from >= version) return;
    const backup = file.replace(/\.json$/, `.v${from}.bak.json`);
    await fs.copyFile(file, backup).catch(() => {});
    let value = structuredClone(saved);
    for (let step = from; step < version; step++) value = migrations[step + 1] ? migrations[step + 1](value) : value;
    value.schemaVersion = version;
    await writeJsonAtomic(file, value, { pretty });
    log(
      'info',
      'datos',
      `${path.basename(file)} migrado de la versión ${from} a la ${version}; copia en ${path.basename(backup)}`
    );
  }
  const ensure = () =>
    (ready ??= migrate().catch((error) => {
      ready = null;
      log('error', 'datos', `No se pudo migrar ${path.basename(file)}: ${error.message}`);
    }));
  return {
    file,
    async read() {
      await ensure();
      return readJsonCached(file, fallback());
    },
    async update(change) {
      await ensure();
      return updateJson(file, async (value) => ({ ...((await change(value)) ?? value), schemaVersion: version }), {
        fallback: { ...fallback(), schemaVersion: version },
        pretty
      });
    }
  };
}

// Para pruebas.
export function forgetCache() {
  cache.clear();
}
