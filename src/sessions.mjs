// Sesiones de juego para todas las tiendas. Al iniciar un juego desde el launcher se vigila su carpeta de
// instalación: cuando aparece un proceso que corre desde ahí empieza la sesión y cuando no queda ninguno, termina.
// Así se mide el tiempo jugado también en Epic, GOG, Xbox, EA y Ubisoft (Steam lo informa además por su cuenta).
// Las sesiones quedan en sessions.json: alimentan «Tu actividad».
import path from 'node:path';
import { execFile } from 'node:child_process';
import { createVersionedFile } from './json-file.mjs';

const WAIT_MS = 4 * 60 * 1000; // lo que puede tardar un lanzador (Epic, Ubisoft, EA) en abrir el juego
const WAIT_POLL_MS = 4000;
const RUN_POLL_MS = 15000;
const MISSES_TO_END = 2; // dos consultas seguidas sin el juego: se cerró (no un reinicio del propio juego)
const MAX_SESSIONS = 5000;
const MAX_SESSION_SECONDS = 24 * 3600;

// Procesos de la carpeta del juego que no son el juego: reportes de errores, instaladores, antitrampas.
const HELPERS =
  /(crash|report|unins|redist|vc_?redist|dxsetup|directx|dotnet|ue4prereq|prereq|easyanticheat|battleye|eac_|cefsharp|webhelper|setup\.exe$)/i;

// Rutas en minúsculas y con barra final, para comparar «está dentro de».
export function normalizeRoot(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const clean = path.win32.normalize(value.trim()).replace(/[\\/]+$/, '');
  // Una unidad entera («C:») o una carpeta de primer nivel («C:\Juegos») es demasiado amplia: abarcaría otros juegos.
  if (clean.split(/[\\/]/).filter(Boolean).length < 3) return null;
  return clean.toLowerCase() + '\\';
}

// Carpetas a vigilar de un juego: su instalación y, si se abre un .exe, la carpeta de ese archivo.
export function gameRoots(game) {
  const roots = [normalizeRoot(game.location)];
  if (game.launch?.type === 'file' && typeof game.launch.target === 'string')
    roots.push(normalizeRoot(path.win32.dirname(game.launch.target)));
  return [...new Set(roots.filter(Boolean))];
}

export function isGameProcess(executable, roots) {
  const file = String(executable ?? '').toLowerCase();
  if (!file || HELPERS.test(path.win32.basename(file))) return false;
  return roots.some((root) => file.startsWith(root));
}

// Rutas de los ejecutables en marcha (Windows). En otros sistemas no hay medición: devuelve null.
export function windowsProcesses() {
  if (process.platform !== 'win32') return Promise.resolve(null);
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Get-CimInstance Win32_Process -Property ExecutablePath | ForEach-Object { $_.ExecutablePath }'
      ],
      { windowsHide: true, timeout: 20000, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout) => resolve(error ? null : stdout.split(/\r?\n/).filter(Boolean))
    );
  });
}

// Vigila los juegos iniciados. onEnd(game, { start, seconds }) al cerrarse; onMissing(game) si nunca apareció.
export function createSessionTracker({
  listProcesses = windowsProcesses,
  now = () => Date.now(),
  timers = { set: setTimeout, clear: clearTimeout },
  onEnd = () => {},
  onMissing = () => {}
} = {}) {
  const watching = new Map();
  let timer = null;
  let ticking = false;

  function schedule() {
    if (timer || !watching.size) return;
    const waiting = [...watching.values()].some((item) => !item.start);
    timer = timers.set(tick, waiting ? WAIT_POLL_MS : RUN_POLL_MS);
    timer?.unref?.();
  }
  async function tick() {
    timer = null;
    if (ticking) return;
    ticking = true;
    try {
      const running = await listProcesses();
      const at = now();
      for (const [key, item] of watching) {
        // Sin lista de procesos (falló la consulta) no se decide nada: se reintenta en la próxima vuelta.
        if (!running) continue;
        const alive = running.some((file) => isGameProcess(file, item.roots));
        if (!item.start) {
          if (alive) Object.assign(item, { start: at, lastSeen: at });
          else if (at - item.launchedAt > WAIT_MS) {
            watching.delete(key);
            onMissing(item.game);
          }
          continue;
        }
        if (alive) Object.assign(item, { lastSeen: at, misses: 0 });
        else if (++item.misses >= MISSES_TO_END) {
          watching.delete(key);
          const seconds = Math.min(MAX_SESSION_SECONDS, Math.round((item.lastSeen - item.start) / 1000));
          onEnd(item.game, { start: new Date(item.start).toISOString(), seconds });
        }
      }
    } finally {
      ticking = false;
      schedule();
    }
  }
  return {
    // true si el juego se puede medir (tiene carpeta de instalación conocida).
    track(game) {
      const roots = gameRoots(game);
      if (!roots.length) return false;
      watching.set(game.key, { game, roots, launchedAt: now(), start: null, lastSeen: null, misses: 0 });
      schedule();
      return true;
    },
    watching: () => [...watching.keys()],
    stop() {
      if (timer) timers.clear(timer);
      timer = null;
      watching.clear();
    }
  };
}

// Registro de sesiones: las más recientes primero en la lectura, guardadas en orden de llegada.
export function createSessionLog(dataDir) {
  const file = createVersionedFile(path.join(dataDir, 'sessions.json'), {
    version: 1,
    fallback: () => ({ sessions: [] }),
    pretty: false
  });
  return {
    async list() {
      return (await file.read()).sessions ?? [];
    },
    async add({ key, name, start, seconds, source }) {
      if (!Number.isFinite(seconds) || seconds < 5) return null;
      const entry = {
        key,
        name: String(name ?? key).slice(0, 200),
        start,
        seconds: Math.min(MAX_SESSION_SECONDS, Math.round(seconds)),
        source
      };
      await file.update((value) => ({ ...value, sessions: [...(value.sessions ?? []), entry].slice(-MAX_SESSIONS) }));
      return entry;
    }
  };
}
