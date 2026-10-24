// Direcciones actuales del arte de la tienda de Steam.
// Desde 2024, Steam publica el arte renovado en rutas con un código (…/<hash>/library_600x900.jpg) y la ruta
// clásica (…/steam/apps/<id>/library_600x900.jpg) responde 404. El servicio público GetItems informa la ruta
// vigente de cada imagen. Se consulta en lotes y el resultado se guarda en disco.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ENDPOINT = 'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/';
const ASSET_BASE = 'https://shared.steamstatic.com/store_item_assets/';
const DAY = 86400000;
// Las rutas cambian sólo cuando el estudio renueva el arte; un juego sin datos se vuelve a consultar en una semana.
const FRESH_MS = 30 * DAY;
const MISSING_MS = 7 * DAY;
const BATCH = 50;
const WAIT_MS = 40;
// Para cada tipo de imagen, los archivos de la tienda en orden de preferencia.
const fields = {
  cover: ['library_capsule_2x', 'library_capsule'],
  hero: ['library_hero_2x', 'library_hero'],
  wordmark: ['library_logo_2x', 'library_logo'],
  header: ['header']
};

// Convierte la respuesta de GetItems en direcciones completas por tipo de imagen.
export function assetUrls(assets) {
  const format = assets?.asset_url_format;
  if (typeof format !== 'string' || !format.includes('${FILENAME}')) return null;
  const urls = {};
  for (const [kind, names] of Object.entries(fields)) {
    const file = names.map((name) => assets[name]).find((value) => typeof value === 'string' && value);
    if (file) urls[kind] = ASSET_BASE + format.replace('${FILENAME}', file);
  }
  return Object.keys(urls).length ? urls : null;
}

export function createSteamAssets(dataDir, { fetchImpl = globalThis.fetch } = {}) {
  const file = path.join(dataDir, 'steam-assets.json');
  let cache;
  let queue = new Map();
  let timer = null;

  // Una sola lectura del archivo aunque lleguen muchos pedidos juntos (y en el orden en que llegaron).
  let loading = null;
  function load() {
    loading ??= fs
      .readFile(file, 'utf8')
      .then((text) => JSON.parse(text)?.apps ?? {})
      .catch(() => ({}))
      .then((apps) => (cache = apps));
    return loading;
  }
  async function save() {
    await fs.mkdir(dataDir, { recursive: true });
    const temporary = file + '.' + crypto.randomUUID() + '.tmp';
    await fs.writeFile(temporary, JSON.stringify({ apps: cache }));
    await fs.rename(temporary, file);
  }
  async function fetchBatch(ids) {
    const input = {
      ids: ids.map((appid) => ({ appid: Number(appid) })),
      context: { language: 'spanish', country_code: 'AR' },
      data_request: { include_assets: true }
    };
    const response = await fetchImpl(`${ENDPOINT}?input_json=${encodeURIComponent(JSON.stringify(input))}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`GetItems ${response.status}`);
    const items = (await response.json())?.response?.store_items ?? [];
    const found = new Map(items.map((item) => [String(item.appid ?? item.id), assetUrls(item.assets)]));
    const at = Date.now();
    for (const id of ids) cache[id] = { urls: found.get(id) ?? null, at };
    await save().catch(() => {});
  }
  function flush() {
    timer = null;
    const batch = queue;
    queue = new Map();
    const ids = [...batch.keys()];
    for (let start = 0; start < ids.length; start += BATCH) {
      const slice = ids.slice(start, start + BATCH);
      fetchBatch(slice)
        .catch(() => {
          /* sin conexión: no se recuerda nada y se reintenta en el próximo pedido */
        })
        .finally(() => slice.forEach((id) => batch.get(id).forEach((resolve) => resolve(cache[id]?.urls ?? null))));
    }
  }

  // Devuelve { cover, hero, wordmark, header } con las direcciones vigentes, o null si Steam no las informa.
  // Los pedidos que llegan juntos (una grilla de portadas) se agrupan en una sola consulta.
  async function urls(appid) {
    const id = String(appid);
    if (!/^\d{1,10}$/.test(id)) return null;
    const apps = await load();
    const entry = apps[id];
    if (entry && Date.now() - entry.at < (entry.urls ? FRESH_MS : MISSING_MS)) return entry.urls;
    return new Promise((resolve) => {
      if (!queue.has(id)) queue.set(id, []);
      queue.get(id).push(resolve);
      if (queue.size >= BATCH) {
        clearTimeout(timer);
        flush();
      } else if (!timer) timer = setTimeout(flush, WAIT_MS);
    }).then((result) => result ?? entry?.urls ?? null);
  }
  return { urls };
}
