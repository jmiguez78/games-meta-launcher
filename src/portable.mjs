// Portable de verdad (B8): con el .exe portable, los datos pueden vivir en una carpeta junto al ejecutable y
// viajar con él (un pendrive, otra PC). Reglas, para no sorprender a nadie:
// - si la carpeta junto al .exe existe, se usa;
// - si no, y esta PC ya tiene datos en AppData (una instalación anterior), se siguen usando esos; Configuración
//   ofrece copiarlos junto al .exe;
// - en una PC sin datos, se crea la carpeta junto al .exe si se puede escribir ahí (si no, AppData).
// Las cachés del navegador interno (Chromium) quedan siempre en AppData: son de cada PC y pesan mucho.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

export const PORTABLE_FOLDER = 'Games Meta Launcher - datos';
const APP_FILES = ['library.json', 'preferences.json'];
// Lo que Chromium guarda en la carpeta de datos: no se copia.
const CHROMIUM =
  /^(Cache|Code Cache|GPUCache|DawnGraphiteCache|DawnWebGPUCache|Network|Local Storage|IndexedDB|Session Storage|blob_storage|Shared Dictionary|SharedStorage(-wal)?|DIPS(-wal)?|WebStorage|Preferences|Local State|lockfile|Crashpad|Service Worker|shared_proto_db|VideoDecodeStats|Trust Tokens|databases|Cookies(-journal)?|TransportSecurity|Network Persistent State|SingletonLock|SingletonCookie|SingletonSocket)$/;

export const portableFolder = (exeDir) => (exeDir ? path.join(exeDir, PORTABLE_FOLDER) : null);
const hasAppData = (dir) => APP_FILES.some((file) => fs.existsSync(path.join(dir, file)));

// La carpeta de datos a usar. exeDir: PORTABLE_EXECUTABLE_DIR (sólo existe en el .exe portable).
export function chooseDataDir({ exeDir, defaultDir }) {
  const portable = portableFolder(exeDir);
  if (!portable) return { dir: defaultDir, portable: false };
  if (fs.existsSync(portable)) return { dir: portable, portable: true };
  if (hasAppData(defaultDir)) return { dir: defaultDir, portable: false };
  try {
    fs.mkdirSync(portable, { recursive: true });
    fs.accessSync(portable, fs.constants.W_OK);
    return { dir: portable, portable: true };
  } catch {
    return { dir: defaultDir, portable: false };
  }
}

// Copia los datos del launcher (no las cachés de Chromium) a la carpeta junto al .exe. No pisa una carpeta que
// ya tenga datos; la copia en AppData queda como respaldo.
export async function copyToPortable(from, to) {
  if (hasAppData(to)) throw new Error('Ya hay datos junto al ejecutable.');
  await fsp.mkdir(to, { recursive: true });
  for (const entry of await fsp.readdir(from)) {
    if (CHROMIUM.test(entry)) continue;
    await fsp.cp(path.join(from, entry), path.join(to, entry), { recursive: true, errorOnExist: false });
  }
}
