import fs from 'node:fs/promises';
import path from 'node:path';
import { protect, unprotect } from './secrets.mjs';
import { badGateway, badRequest, conflict } from './http.mjs';
import { createVersionedFile, readJsonCached, writeJsonAtomic } from './json-file.mjs';

// Cliente de IGDB (Twitch). Sólo envía identificadores y nombres de juegos; nunca rutas ni datos personales.
const API = 'https://api.igdb.com/v4';
const REQUEST_GAP_MS = 300; // IGDB admite 4 solicitudes por segundo.
const IMAGE_ID = /^[a-z0-9]+$/i;
export const detailFields = [
  '*',
  'genres.name',
  'themes.name',
  'keywords.name',
  'game_modes.name',
  'player_perspectives.name',
  'platforms.name',
  'game_engines.name',
  'collections.name',
  'franchises.name',
  'game_type.type',
  'game_status.status',
  'cover.image_id',
  'artworks.image_id',
  'screenshots.image_id',
  'videos.name',
  'videos.video_id',
  'alternative_names.name',
  'alternative_names.comment',
  'involved_companies.developer',
  'involved_companies.publisher',
  'involved_companies.porting',
  'involved_companies.supporting',
  'involved_companies.company.name',
  'language_supports.language.name',
  'language_supports.language.native_name',
  'language_supports.language.locale',
  'language_supports.language_support_type.name',
  'age_ratings.organization.name',
  'age_ratings.rating_category.rating',
  'age_ratings.rating_content_descriptions.description',
  'age_ratings.synopsis',
  'release_dates.human',
  'release_dates.date',
  'release_dates.platform.name',
  'release_dates.release_region.region',
  'release_dates.status.name',
  'websites.url',
  'websites.type.type',
  'multiplayer_modes.*',
  'multiplayer_modes.platform.name',
  ...[
    'parent_game',
    'version_parent',
    'dlcs',
    'expansions',
    'standalone_expansions',
    'remakes',
    'remasters',
    'ports',
    'expanded_games',
    'bundles',
    'similar_games'
  ].flatMap((field) => [`${field}.name`, `${field}.url`])
].join(',');

export function safeWebUrl(value, hostname) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!hostname || url.hostname === hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}
const names = (rows = []) => [
  ...new Set(rows.map((row) => row?.name).filter((name) => typeof name === 'string' && name))
];
const dateOf = (value) =>
  Number.isFinite(value) && value > 0 && Number.isFinite(new Date(value * 1000).getTime())
    ? new Date(value * 1000).toISOString()
    : null;
const score = (value) => (Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value * 10) / 10 : null);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const readJson = readJsonCached;
const writeJson = (target, data) => writeJsonAtomic(target, data);

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
    summary: typeof game.summary === 'string' ? game.summary : '',
    url: safeWebUrl(game.url, 'www.igdb.com'),
    year: dateOf(game.first_release_date) ? new Date(game.first_release_date * 1000).getUTCFullYear() : null,
    rating:
      score(game.aggregated_rating ?? game.total_rating) == null
        ? null
        : Math.round(game.aggregated_rating ?? game.total_rating),
    genres: names(game.genres),
    developers: names((game.involved_companies ?? []).filter((item) => item.developer).map((item) => item.company)),
    cover: imageOf(game.cover),
    artwork: imageOf(game.artworks?.[0]) ?? imageOf(game.screenshots?.[0]),
    storyline: typeof game.storyline === 'string' ? game.storyline : '',
    firstReleaseDate: dateOf(game.first_release_date),
    sourceUpdatedAt: dateOf(game.updated_at),
    type: game.game_type?.type ?? null,
    status: game.game_status?.status ?? null,
    versionTitle: game.version_title ?? null,
    themes: names(game.themes),
    keywords: names(game.keywords),
    modes: names(game.game_modes),
    perspectives: names(game.player_perspectives),
    platforms: names(game.platforms),
    engines: names(game.game_engines),
    collections: names(game.collections),
    franchises: names(game.franchises),
    companies: (game.involved_companies ?? [])
      .filter((item) => item.company?.name)
      .map((item) => ({
        name: item.company.name,
        roles: ['developer', 'publisher', 'porting', 'supporting'].filter((role) => item[role])
      })),
    ratings: {
      critics: { value: score(game.aggregated_rating), count: game.aggregated_rating_count ?? 0 },
      users: { value: score(game.rating), count: game.rating_count ?? 0 },
      total: { value: score(game.total_rating), count: game.total_rating_count ?? 0 }
    },
    alternativeNames: (game.alternative_names ?? [])
      .filter((item) => item.name)
      .map((item) => ({ name: item.name, comment: item.comment ?? '' })),
    languages: (game.language_supports ?? [])
      .filter((item) => item.language?.name)
      .map((item) => ({
        name: item.language.name,
        nativeName: item.language.native_name ?? '',
        locale: item.language.locale ?? '',
        support: item.language_support_type?.name ?? ''
      })),
    ageRatings: (game.age_ratings ?? [])
      .filter((item) => item.organization?.name && item.rating_category?.rating)
      .map((item) => ({
        organization: item.organization.name,
        rating: item.rating_category.rating,
        descriptions: (item.rating_content_descriptions ?? []).map((row) => row.description).filter(Boolean),
        synopsis: item.synopsis ?? ''
      })),
    releases: (game.release_dates ?? []).map((item) => ({
      date: dateOf(item.date),
      label: item.human ?? '',
      platform: item.platform?.name ?? '',
      region: item.release_region?.region ?? '',
      status: item.status?.name ?? ''
    })),
    websites: (game.websites ?? [])
      .map((item) => ({ label: item.type?.type ?? 'Sitio web', url: safeWebUrl(item.url) }))
      .filter((item) => item.url),
    screenshots: (game.screenshots ?? []).map(imageOf).filter(Boolean),
    artworks: (game.artworks ?? []).map(imageOf).filter(Boolean),
    videos: (game.videos ?? [])
      .filter((item) => /^[a-zA-Z0-9_-]{11}$/.test(item.video_id))
      .map((item) => ({
        name: item.name || 'Video',
        url: `https://www.youtube.com/watch?v=${item.video_id}`
      })),
    multiplayer: (game.multiplayer_modes ?? []).map(({ id, game: ignored, checksum, platform, ...mode }) => ({
      ...mode,
      platform: platform?.name ?? ''
    })),
    related: Object.fromEntries(
      [
        'parent_game',
        'version_parent',
        'dlcs',
        'expansions',
        'standalone_expansions',
        'remakes',
        'remasters',
        'ports',
        'expanded_games',
        'bundles',
        'similar_games'
      ].map((field) => [
        field,
        (Array.isArray(game[field]) ? game[field] : [game[field]])
          .filter((item) => item?.name)
          .map((item) => ({
            id: item.id,
            name: item.name,
            url: safeWebUrl(item.url, 'www.igdb.com')
          }))
      ])
    )
  };
}

const EMPTY = Object.freeze({});
const pick = (all, games) =>
  Object.fromEntries(games.filter((game) => all[game.key]).map((game) => [game.key, all[game.key]]));
export function createIgdb(dataDir, { fetchImpl = fetch, decrypt = unprotect, requestGapMs = REQUEST_GAP_MS } = {}) {
  const credentialsPath = path.join(dataDir, 'integrations.json');
  const metadataPath = path.join(dataDir, 'metadata.json');
  // Versión 3: sin la respuesta original de IGDB en cada ficha (ocupaba la mayor parte del archivo y no se usaba).
  // Se guarda compacto: no está pensado para leerse a mano.
  const metadataFile = createVersionedFile(metadataPath, {
    version: 3,
    pretty: false,
    fallback: () => ({ games: {} }),
    migrations: {
      3: (saved) => ({
        ...saved,
        games: Object.fromEntries(
          Object.entries(saved.games ?? {}).map(([key, value]) => {
            const { source, ...rest } = value ?? {};
            return [key, rest];
          })
        )
      })
    }
  });
  let token = null;
  let lastRequest = 0;
  const status = { running: false, done: 0, total: 0, matched: 0, error: null, finishedAt: null };

  async function credentials() {
    const saved = (await readJson(credentialsPath, {})).igdb;
    if (!saved?.clientId || !saved?.secret) return null;
    return { clientId: saved.clientId, clientSecret: await decrypt(saved.secret) };
  }
  async function requestToken({ clientId, clientSecret }) {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    });
    const response = await fetchImpl('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: params,
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 400 || response.status === 403)
      throw badRequest('Twitch rechazó el ID de cliente o el secreto. Revisalos en la consola de desarrolladores.');
    if (!response.ok) throw badGateway('No se pudo conectar con Twitch. Probá de nuevo más tarde.');
    const data = await response.json();
    return { clientId, value: data.access_token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 };
  }
  async function query(endpoint, body, retried = false) {
    if (!token || token.expiresAt < Date.now()) {
      const saved = await credentials();
      if (!saved) throw conflict('Conectá IGDB en Configuración para obtener información de los juegos.');
      token = await requestToken(saved);
    }
    const wait = lastRequest + requestGapMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    const response = await fetchImpl(`${API}/${endpoint}`, {
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

  // Arcade: primero el identificador de IGDB que da Wikidata; si no hay, una búsqueda limitada a la plataforma
  // Arcade (52) que sólo acepta el mismo título y, si se conoce, un año a menos de dos de distancia.
  async function arcadeId(game) {
    if (/^[a-z0-9-]+$/.test(game.igdbSlug ?? '')) {
      const rows = await query('games', `fields id; where slug = "${game.igdbSlug}"; limit 1;`);
      if (rows[0]?.id) return rows[0].id;
    }
    const title = normalizeTitle(game.name.replace(/\s*\([^)]*\)$/, ''));
    if (!title) return null;
    const rows = await query(
      'games',
      `search "${title.replace(/"/g, '')}"; fields id,name,first_release_date,alternative_names.name; where platforms = (52); limit 10;`
    );
    const year = Number(game.arcade?.year) || null;
    const match = rows.find((row) => {
      const names = [row.name, ...(row.alternative_names ?? []).map((item) => item.name)].map(normalizeTitle);
      const released = row.first_release_date ? new Date(row.first_release_date * 1000).getUTCFullYear() : null;
      return names.includes(title) && (!year || !released || Math.abs(released - year) <= 2);
    });
    return match?.id ?? null;
  }

  async function refresh(games) {
    const saved = structuredClone(await metadataFile.read());
    saved.games ??= {};
    const steam = await steamMatches(games.filter((game) => game.platform === 'Steam'));
    const ids = new Map();
    status.total = games.length;
    for (const game of games) {
      const previousId = saved.games[game.key]?.igdbId;
      const id =
        (game.platform === 'Steam' ? steam.get(game.id) : null) ??
        (Number.isSafeInteger(previousId) && previousId > 0
          ? previousId
          : game.platform === 'Arcade'
            ? await arcadeId(game)
            : await searchByName(game.name));
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
    for (let index = 0; index < unique.length; index += 200) {
      const rows = await query(
        'game_time_to_beats',
        `fields game_id,hastily,normally,completely,count; where game_id = (${unique.slice(index, index + 200).join(',')}); limit 500;`
      );
      for (const row of rows) {
        const detail = details.get(row.game_id);
        if (detail)
          detail.timeToBeat = {
            hastily: row.hastily ?? null,
            normally: row.normally ?? null,
            completely: row.completely ?? null,
            count: row.count ?? 0
          };
      }
    }
    const fetchedAt = new Date().toISOString();
    for (const game of games) {
      const detail = details.get(ids.get(game.key));
      saved.games[game.key] = detail ? { ...detail, fetchedAt } : { igdbId: null, fetchedAt };
      if (detail) status.matched += 1;
    }
    await metadataFile.update((current) => ({
      ...current,
      updatedAt: fetchedAt,
      games: { ...current.games, ...pick(saved.games, games) }
    }));
  }

  return {
    status: () => ({ ...status }),
    metadata: async () => (await metadataFile.read()).games ?? EMPTY,
    async settings() {
      const saved = (await readJson(credentialsPath, {})).igdb;
      return { configured: Boolean(saved?.clientId && saved?.secret), clientId: saved?.clientId ?? '' };
    },
    async connect(clientId, clientSecret) {
      if (!/^[a-z0-9]{10,64}$/i.test(clientId) || !/^[a-z0-9]{10,64}$/i.test(clientSecret))
        throw badRequest('El ID de cliente y el secreto sólo contienen letras y números.');
      token = await requestToken({ clientId, clientSecret });
      const all = await readJson(credentialsPath, {});
      await writeJson(credentialsPath, { ...all, igdb: { clientId, secret: await protect(clientSecret) } });
    },
    async disconnect() {
      const all = structuredClone(await readJson(credentialsPath, {}));
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
