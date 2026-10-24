// Arranque instantáneo: la última biblioteca recibida se guarda en el navegador (IndexedDB) y, al abrir, se pinta
// de inmediato mientras se pide la actual. Si no cambió, no se vuelve a dibujar nada.
// Sin almacenamiento (o con error), todo sigue funcionando como antes: se espera la respuesta del servidor.
const DB = 'gml';
const STORE = 'snapshots';
const KEY = 'library';
const TIMEOUT_MS = 400;

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore(mode, run) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const result = run(transaction.objectStore(STORE));
        transaction.oncomplete = () => {
          db.close();
          resolve(result.result);
        };
        transaction.onerror = transaction.onabort = () => {
          db.close();
          reject(transaction.error);
        };
      })
  );
}

// Texto JSON de la última biblioteca, o null. Nunca tarda más de TIMEOUT_MS: si el disco está lento, se sigue
// sin la copia.
export function readSnapshot() {
  try {
    return Promise.race([
      withStore('readonly', (store) => store.get(KEY)).then((value) => (typeof value === 'string' ? value : null)),
      new Promise((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS))
    ]).catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

export function saveSnapshot(text) {
  try {
    return withStore('readwrite', (store) => store.put(text, KEY)).catch(() => {});
  } catch {
    return Promise.resolve();
  }
}
