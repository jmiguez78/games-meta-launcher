import fs from 'node:fs/promises';
import path from 'node:path';
import { protect, unprotect } from './secrets.mjs';

// Cliente de IGDB (Twitch). Sólo envía identificadores y nombres de juegos; nunca rutas ni datos personales.
const API = 'https://api.igdb.com/v4';
const REQUEST_GAP_MS = 300; // IGDB admite 4 solicitudes por segundo.
const IMAGE_ID = /^[a-z0-9]+$/i;
const detailFields =
  'name,summary,url,first_release_date,aggregated_rating,total_rating,genres.name,cover.image_id,artworks.image_id,screenshots.image_id,involved_companies.developer,involved_companies.company.name';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function readJson(target, fallback) {
  try {
    return JSON.parse(await fs.readFile(target, 'utf8'));
  } catch {
    return fallback;
  }
}
async function writeJson(target, data) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(data, null, 2), 'utf8');
}

export function normalizeTitle(name) {
  return String(name)
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(/\s*-\s*(windows|pc edition)$/i, '')
    .replace(/\s+(pcgp|goty|enhanced edition)$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
export function imageUrl(imageId, size) {
  return typeof imageId === 'string' && IMAGE_ID.test(imageId)
    ? `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`
    : null;
}
export function toMetadata(game) {
  const imageOf = (item) => (typeof item?.image_id === 'string' && IMAGE_ID.test(item.image_id) ? item.image_id : null);
  return {
    igdbId: game.id,
    title: game.name,
    summary: typeof game.summary === 'string' ? game.summary.slice(0, 2000) : '',
    url: typeof game.url === 'string' && game.url.startsWith('https://www.igdb.com/') ? game.url : null,
    year: game.first_release_date ? new Date(game.first_release_date * 1000).getUTCFullYear() : null,
    rating: Math.round(game.aggregated_rating ?? game.total_rating ?? 0) || null,
    genres: (game.genres ?? [])
      .map((genre) => genre.name)
      .filter(Boolean)
      .slice(0, 6),
    developers: (game.involved_companies ?? [])
      .filter((item) => item.developer && item.company?.name)
      .map((item) => item.company.name)
      .slice(0, 3),
    cover: imageOf(game.cover),
    artwork: imageOf(game.artworks?.[0]) ?? imageOf(game.screenshots?.[0])
  };
}

export function createIgdb(dataDir) {
  const credentialsPath = path.join(dataDir, 'integrations.json');
  const metadataPath = path.join(dataDir, 'metadata.json');
  let token = null;
  let lastRequest = 0;
  const status = { running: false, done: 0, total: 0, matched: 0, error: null, finishedAt: null };

  async function credentials() {
    const saved = (await readJson(credentialsPath, {})).igdb;
    if (!saved?.clientId || !saved?.secret) return null;
    return { clientId: saved.clientId, clientSecret: await unprotect(saved.secret) };
  }
  async function requestToken({ clientId, clientSecret }) {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    });
    const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 400 || response.status === 403)
      throw new Error('Twitch rechazó el ID de cliente o el secreto. Revisalos en la consola de desarrolladores.');
    if (!response.ok) throw new Error('No se pudo conectar con Twitch. Probá de nuevo más tarde.');
    const data = await response.json();
    return { clientId, value: data.access_token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 };
  }
  async function query(endpoint, body, retried = false) {
    if (!token || token.expiresAt < Date.now()) {
      const saved = await credentials();
      if (!saved) throw new Error('Conectá IGDB en Configuración para obtener información de los juegos.');
      token = await requestToken(saved);
    }
    const wait = lastRequest + REQUEST_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    const response = await fetch(`${API}/${endpoint}`, {
      method: 'POST',
      headers: { 'Client-ID': token.clientId, Authorization: `Bearer ${token.value}`, Accept: 'application/json' },
      body,
      signal: AbortSignal.timeout(15000)
    });
    if ((response.status === 401 || response.status === 429) && !retried) {
      if (response.status === 401) token = null;
      else await sleep(1000);
      return query(endpoint, body, true);
    }
    if (!response.ok) throw new Error(`IGDB respondió con un error (${response.status}).`);
    return response.json();
  }

  // Steam: coincidencia exacta por App ID. Resto: búsqueda por nombre entre juegos principales.
  async function steamMatches(games) {
    const ids = games.map((game) => game.id).filter((id) => /^\d+$/.test(id));
    const matches = new Map();
    for (let index = 0; index < ids.length; index += 200) {
      const chunk = ids.slice(index, index + 200);
      const rows = await query(
        'external_games',
        `fields game,uid,url,category,external_game_source; where uid = (${chunk.map((id) => `"${id}"`).join(',')}); limit 500;`
      );
      for (const row of rows) {
        const steam = row.category === 1 || row.external_game_source === 1 || /steampowered\.com/.test(row.url ?? '');
        if (steam && row.game && !matches.has(row.uid)) matches.set(row.uid, row.game);
      }
    }
    return matches;
  }
  async function searchByName(name) {
    const title = normalizeTitle(name);
    const search = title.replace(/"/g, '');
    if (!search) return null;
    const rows = await query('games', `search "${search}"; fields id,name,alternative_names.name; limit 10;`);
    const exact = rows.find((row) =>
      [row.name, ...(row.alternative_names ?? []).map((item) => item.name)].some(
        (value) => normalizeTitle(value) === title
      )
    );
    return (exact ?? rows[0])?.id ?? null;
  }

  async function refresh(games) {
    const saved = await readJson(metadataPath, { games: {} });
    const steam = await steamMatches(games.filter((game) => game.platform === 'Steam'));
    const ids = new Map();
    status.total = games.length;
    for (const game of games) {
      const id = (game.platform === 'Steam' ? steam.get(game.id) : null) ?? (await searchByName(game.name));
      if (id) ids.set(game.key, id);
      status.done += 1;
    }
    const unique = [...new Set(ids.values())];
    const details = new Map();
    for (let index = 0; index < unique.length; index += 200) {
      const rows = await query(
        'games',
        `fields ${detailFields}; where id = (${unique.slice(index, index + 200).join(',')}); limit 500;`
      );
      for (const row of rows) details.set(row.id, toMetadata(row));
    }
    const fetchedAt = new Date().toISOString();
    for (const game of games) {
      const detail = details.get(ids.get(game.key));
      saved.games[game.key] = detail ? { ...detail, fetchedAt } : { igdbId: null, fetchedAt };
      if (detail) status.matched += 1;
    }
    await writeJson(metadataPath, { updatedAt: fetchedAt, games: saved.games });
  }

  return {
    status: () => ({ ...status }),
    metadata: async () => (await readJson(metadataPath, { games: {} })).games ?? {},
    async settings() {
      const saved = (await readJson(credentialsPath, {})).igdb;
      return { configured: Boolean(saved?.clientId && saved?.secret), clientId: saved?.clientId ?? '' };
    },
    async connect(clientId, clientSecret) {
      if (!/^[a-z0-9]{10,64}$/i.test(clientId) || !/^[a-z0-9]{10,64}$/i.test(clientSecret))
        throw new Error('El ID de cliente y el secreto sólo contienen letras y números.');
      token = await requestToken({ clientId, clientSecret });
      const all = await readJson(credentialsPath, {});
      await writeJson(credentialsPath, { ...all, igdb: { clientId, secret: await protect(clientSecret) } });
    },
    async disconnect() {
      const all = await readJson(credentialsPath, {});
      delete all.igdb;
      token = null;
      await writeJson(credentialsPath, all);
    },
    start(games) {
      if (status.running) return;
      Object.assign(status, { running: true, done: 0, total: games.length, matched: 0, error: null });
      refresh(games)
        .catch((error) => {
          status.error = error.message;
        })
        .finally(() => {
          status.running = false;
          status.finishedAt = new Date().toISOString();
        });
    }
  };
}
