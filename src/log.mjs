// Registro de diagnóstico: un archivo de texto en logs/ del perfil, que rota al pasar 1 MB (se conservan tres).
// Sirve para documentar errores intermitentes; «Exportar diagnóstico» en Configuración lo incluye.
// Nunca se registran claves ni secretos: sólo eventos y mensajes de error.
import fs from 'node:fs';
import path from 'node:path';

const MAX_BYTES = 1_000_000;
const KEEP = 3;
const LEVELS = ['debug', 'info', 'warn', 'error'];
let dir = null;
let size = null;
let pending = Promise.resolve();

function logDir() {
  if (dir) return dir;
  const base = process.env.GML_DATA_DIR ? path.resolve(process.env.GML_DATA_DIR) : null;
  return base ? path.join(base, 'logs') : null;
}
export function configureLog(dataDir) {
  dir = path.join(dataDir, 'logs');
  size = null;
}
export const logFile = () => (logDir() ? path.join(logDir(), 'gml.log') : null);

function rotate(file) {
  for (let index = KEEP - 1; index >= 1; index--) {
    const from = index === 1 ? file : file.replace(/\.log$/, `.${index - 1}.log`);
    const to = file.replace(/\.log$/, `.${index}.log`);
    try {
      fs.renameSync(from, to);
    } catch {
      /* todavía no existe */
    }
  }
  size = 0;
}

// Una línea: fecha, nivel, área y mensaje. Los saltos de línea del mensaje se aplanan.
export function log(level, area, message, detail) {
  const file = logFile();
  if (!file || !LEVELS.includes(level)) return;
  const text =
    `${new Date().toISOString()} [${level}] ${area}: ${String(message).replace(/\s*\n\s*/g, ' ⏎ ')}` +
    (detail
      ? ` | ${String(detail)
          .replace(/\s*\n\s*/g, ' ⏎ ')
          .slice(0, 2000)}`
      : '') +
    '\n';
  pending = pending
    .then(() => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (size === null) {
        try {
          size = fs.statSync(file).size;
        } catch {
          size = 0;
        }
      }
      if (size + text.length > MAX_BYTES) rotate(file);
      fs.appendFileSync(file, text, 'utf8');
      size += Buffer.byteLength(text);
    })
    .catch(() => {});
}

// Últimas líneas del registro (de los archivos rotados si hace falta), para exportar.
export async function recentLog(maxLines = 2000) {
  await pending;
  const file = logFile();
  if (!file) return [];
  const lines = [];
  for (let index = 0; index < KEEP && lines.length < maxLines; index++) {
    const name = index === 0 ? file : file.replace(/\.log$/, `.${index}.log`);
    try {
      const chunk = fs.readFileSync(name, 'utf8').split('\n').filter(Boolean);
      lines.unshift(...chunk.slice(-(maxLines - lines.length)));
    } catch {
      /* sin archivo */
    }
  }
  return lines;
}

export const flushLog = () => pending;
