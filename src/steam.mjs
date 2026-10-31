import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { protect, unprotect } from './secrets.mjs';
import { badGateway, badRequest, conflict } from './http.mjs';
import { readJsonCached, writeJsonAtomic } from './json-file.mjs';

const DAY = 86400000;
const gameId = (value) => /^\d{1,10}$/.test(String(value)) && Number(value) > 0;
const accountId = (value) => /^765\d{14}$/.test(String(value));
const now = () => new Date().toISOString();
const read = readJsonCached;
const write = (file, value) => writeJsonAtomic(file, value);
const NO_ACCOUNT = Object.freeze({ games: Object.freeze([]), updatedAt: null });
function decodeResult(response) {
  if (response.error || response.result?.isError)
    throw new Error('Steam no pudo completar la consulta. Revisá tu conexión y la privacidad del perfil.');
  if (response.result?.structuredContent) return response.result.structuredContent;
  try {
    return JSON.parse(response.result.content.find((item) => item.type === 'text').text);
  } catch {
    throw new Error('Steam devolvió una respuesta no válida.');
  }
}

// El MCP se ejecuta con el runtime incluido en Electron; no requiere Node ni Codex instalados.
function createTransport() {
  let child, identity, startup;
  let sequence = 0;
  const pending = new Map();
  const stop = () => {
    const previous = child;
    child = null;
    startup = null;
    identity = null;
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error('La conexión con Steam se cerró.'));
    }
    pending.clear();
    previous?.kill();
  };
  function request(method, params) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Steam tardó demasiado en responder.'));
      }, 60000);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n', (error) => {
        if (error) {
          clearTimeout(timer);
          pending.delete(id);
          reject(new Error('No se pudo consultar Steam.'));
        }
      });
    });
  }
  return {
    stop,
    async call(name, args, credentials) {
      const key = crypto.createHash('sha256').update(JSON.stringify(credentials)).digest('hex');
      if (!child || identity !== key) {
        stop();
        identity = key;
        const env = {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          STEAM_COUNTRY: 'AR',
          STEAM_LANGUAGE: 'spanish',
          LOG_LEVEL: 'error'
        };
        delete env.STEAM_API_KEY;
        delete env.STEAM_ID;
        if (credentials) {
          env.STEAM_API_KEY = credentials.apiKey;
          env.STEAM_ID = credentials.steamId;
        }
        child = spawn(process.execPath, [fileURLToPath(import.meta.resolve('steam-games-mcp'))], {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true
        });
        const current = child;
        let buffer = '';
        current.stderr.on('data', () => {}); // Nunca reenviar diagnósticos que pudieran contener credenciales.
        current.stdin.on('error', () => {});
        current.on('error', () => {
          if (child === current) stop();
        });
        current.on('exit', () => {
          if (child === current) stop();
        });
        current.stdout.on('data', (bytes) => {
          buffer += bytes;
          if (buffer.length > 16000000) {
            stop();
            return;
          }
          let newline;
          while ((newline = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newline);
            buffer = buffer.slice(newline + 1);
            try {
              const response = JSON.parse(line);
              const item = pending.get(response.id);
              if (item) {
                clearTimeout(item.timer);
                pending.delete(response.id);
                item.resolve(response);
              }
            } catch {
              /* sólo se procesan mensajes JSON-RPC completos */
            }
          }
        });
        startup = request('initialize', {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'games-meta-launcher', version: '1.0.0' }
        })
          .then((response) => {
            if (response.error) throw new Error('No se pudo iniciar la integración de Steam.');
            current.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
          })
          .catch((error) => {
            stop();
            throw error;
          });
      }
      await startup;
      return decodeResult(await request('tools/call', { name, arguments: args }));
    }
  };
}

export function mergeSteamLibrary(localGames, account) {
  const remote = new Map((account?.games || []).map((game) => [String(game.appid), game]));
  const result = localGames.map((game) => {
    if (game.platform !== 'Steam') return { ...game, installed: true, ownership: 'unknown' };
    const steam = remote.get(String(game.id));
    remote.delete(String(game.id));
    return { ...game, installed: true, ownership: steam ? 'owned' : 'unknown', steam: steam || null };
  });
  for (const game of remote.values()) {
    result.push({
      key: `steam:${game.appid}`,
      id: String(game.appid),
      name: game.name,
      platform: 'Steam',
      installed: false,
      ownership: 'owned',
      status: 'not-installed',
      location: '',
      drive: '',
      launch: null,
      evidence: 'En la biblioteca de tu cuenta de Steam, sin instalación detectada en esta PC.',
      steam: game
    });
  }
  return result;
}

export function createSteam(dataDir, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const encrypt = options.encrypt || protect;
  const decrypt = options.decrypt || unprotect;
  const credentialFile = path.join(dataDir, 'steam-credentials.json');
  const accountFile = path.join(dataDir, 'steam-account.json');
  const transport = options.rpc ? null : createTransport();
  const inflight = new Map();
  let syncPromise;
  let credentialsPromise;
  const status = { running: false, error: null, finishedAt: null };
  async function credentials() {
    if (!credentialsPromise)
      credentialsPromise = (async () => {
        const saved = await read(credentialFile, null);
        if (!saved?.secret) return null;
        try {
          return JSON.parse(await decrypt(saved.secret));
        } catch {
          throw new Error('No se pudo abrir la clave de Steam guardada. Volvé a conectar la cuenta.');
        }
      })().catch((error) => {
        credentialsPromise = null;
        throw error;
      });
    return credentialsPromise;
  }
  async function rawCall(tool, args, supplied) {
    const saved = supplied === undefined ? await credentials() : supplied;
    return options.rpc ? options.rpc(tool, args, saved) : transport.call(tool, args, saved);
  }
  // Las claves se cifran para el usuario de Windows que las guardó: en otra PC (o con el portable en otra
  // cuenta) no se pueden abrir. La biblioteca sigue funcionando sin la cuenta y Configuración pide reconectar.
  async function readableCredentials() {
    try {
      return { saved: await credentials(), unreadable: false };
    } catch {
      return { saved: null, unreadable: true };
    }
  }
  async function account() {
    const { saved } = await readableCredentials();
    const cached = await read(accountFile, null);
    return saved && cached?.steamId === saved.steamId ? cached : NO_ACCOUNT;
  }
  async function cachedCall(tool, args = {}, { ttl = DAY, force = false } = {}) {
    const saved = await credentials();
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify([saved?.steamId || 'public', 'AR', 'spanish', tool, args]))
      .digest('hex');
    if (inflight.has(hash)) return inflight.get(hash);
    const file = path.join(dataDir, 'steam-cache', hash + '.json');
    const old = await read(file, null);
    if (!force && old && Date.now() - Date.parse(old.updatedAt) < ttl) return { ...old, stale: false };
    const operation = (async () => {
      try {
        const data = await rawCall(tool, args, saved);
        const result = { data, updatedAt: now() };
        // Privacidad o permisos pueden cambiar: un resultado explícitamente inaccesible reemplaza la caché.
        await write(file, result);
        return { ...result, stale: false };
      } catch (error) {
        if (old) return { ...old, stale: true, error: error.message };
        throw error;
      } finally {
        inflight.delete(hash);
      }
    })();
    inflight.set(hash, operation);
    return operation;
  }
  async function sync() {
    if (syncPromise) return syncPromise;
    status.running = true;
    status.error = null;
    syncPromise = (async () => {
      const saved = await credentials();
      if (!saved) throw conflict('Conectá tu cuenta de Steam en Configuración.');
      const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
      url.search = new URLSearchParams({
        key: saved.apiKey,
        steamid: saved.steamId,
        include_appinfo: '1',
        include_played_free_games: '1',
        format: 'json'
      });
      let response;
      try {
        response = await fetchImpl(url, { signal: AbortSignal.timeout(25000), redirect: 'error' });
      } catch {
        throw badGateway('No se pudo conectar con Steam. Se conserva la biblioteca anterior.');
      }
      if (!response.ok) throw badGateway('Steam rechazó la consulta de biblioteca. Revisá la clave y tu conexión.');
      const payload = (await response.json()).response;
      if (!Number.isInteger(payload?.game_count) || payload.game_count < 0)
        throw new Error('La biblioteca no está disponible. Revisá la privacidad de tus juegos en Steam.');
      const rows = payload.games || [];
      if (
        rows.length !== payload.game_count ||
        new Set(rows.map((row) => row.appid)).size !== rows.length ||
        rows.some((row) => !gameId(row.appid))
      )
        throw new Error('Steam devolvió una biblioteca incompleta. Se conserva la sincronización anterior.');
      const games = rows
        .filter((row) => row.appid !== 228980)
        .map((row) => ({
          appid: row.appid,
          name: String(row.name || `Steam ${row.appid}`),
          playtimeHours: Number.isFinite(row.playtime_forever) ? row.playtime_forever / 60 : null,
          recentHours: Number.isFinite(row.playtime_2weeks) ? row.playtime_2weeks / 60 : 0,
          lastPlayedAt: row.rtime_last_played > 0 ? new Date(row.rtime_last_played * 1000).toISOString() : null
        }));
      const updatedAt = now();
      await write(accountFile, {
        steamId: saved.steamId,
        reportedCount: payload.game_count,
        complete: true,
        updatedAt,
        games
      });
      status.finishedAt = updatedAt;
      return account();
    })()
      .catch((error) => {
        status.error = error.message;
        throw error;
      })
      .finally(() => {
        status.running = false;
        syncPromise = null;
      });
    return syncPromise;
  }
  async function withPrices(result, field, force) {
    const rows = result.data?.[field];
    if (!Array.isArray(rows)) return result;
    const ids = rows.filter((row) => row.price != null).map((row) => row.appid);
    if (!ids.length) return result;
    const prices = new Map();
    let stale = result.stale;
    for (let index = 0; index < ids.length; index += 250) {
      try {
        const batch = await cachedCall(
          'get_prices',
          { appids: ids.slice(index, index + 250) },
          { ttl: 3600000, force }
        );
        stale ||= batch.stale;
        for (const price of batch.data?.prices || []) prices.set(price.appid, price);
      } catch {
        stale = true;
      }
    }
    return {
      ...result,
      stale,
      data: {
        ...result.data,
        [field]: rows.map((row) => ({
          ...row,
          price: prices.get(row.appid) || (row.price?.currency ? row.price : null)
        }))
      }
    };
  }
  return {
    account,
    sync,
    close: () => transport?.stop(),
    async settings() {
      const { saved, unreadable } = await readableCredentials();
      const snapshot = await account();
      let localConnectionAvailable = false;
      try {
        await fs.access(path.join(os.homedir(), '.codex', 'mcp-servers', 'steam', 'credentials.dpapi'));
        localConnectionAvailable = true;
      } catch {}
      return {
        configured: Boolean(saved),
        ...(unreadable ? { needsReconnect: true } : {}),
        steamId: saved?.steamId || '',
        localConnectionAvailable,
        updatedAt: snapshot.updatedAt,
        total: snapshot.games.length,
        stale: !snapshot.updatedAt || Date.now() - Date.parse(snapshot.updatedAt) > 6 * 3600000,
        ...status
      };
    },
    async connect(apiKey, steamId) {
      if (!/^[a-f0-9]{32}$/i.test(apiKey) || !accountId(steamId))
        throw badRequest('Indicá una clave de 32 caracteres hexadecimales y un SteamID64 válido.');
      const saved = { apiKey, steamId };
      const check = await rawCall('get_player_summary', { steamid: steamId }, saved);
      if (check.found === false) throw badRequest('Steam no pudo validar la cuenta. Revisá la clave y el SteamID64.');
      await write(credentialFile, { secret: await encrypt(JSON.stringify(saved)) });
      credentialsPromise = Promise.resolve(saved);
      return this.settings();
    },
    async importLocal() {
      const file = path.join(os.homedir(), '.codex', 'mcp-servers', 'steam', 'credentials.dpapi');
      let saved;
      try {
        saved = JSON.parse(await decrypt(await fs.readFile(file, 'utf8')));
      } catch {
        throw conflict('No se encontró una conexión de Steam guardada para este usuario.');
      }
      return this.connect(saved.apiKey, saved.steamId);
    },
    async disconnect() {
      await fs.rm(credentialFile, { force: true });
      credentialsPromise = null;
      transport?.stop();
    },
    async details(appid, force = false) {
      if (!gameId(appid)) throw badRequest('App ID de Steam inválido.');
      const fields = [
        ['store', 'get_game'],
        ['compatibility', 'get_items'],
        ['reviews', 'get_game_reviews'],
        ['reviewHistory', 'get_review_histogram'],
        ['news', 'get_game_news']
      ];
      const result = {};
      await Promise.all(
        fields.map(async ([key, tool]) => {
          try {
            result[key] = await cachedCall(
              tool,
              tool === 'get_items' ? { appids: [Number(appid)] } : { appid: Number(appid) },
              { ttl: 3600000, force }
            );
          } catch (error) {
            if (tool === 'get_game_reviews') {
              const saved = await credentials();
              const hash = crypto.createHash('sha256').update(`${saved?.steamId}:${appid}`).digest('hex');
              const file = path.join(dataDir, 'steam-cache', 'reviews-' + hash + '.json');
              const old = await read(file, null);
              try {
                const response = await fetchImpl(
                  `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&filter=recent&num_per_page=5`,
                  { signal: AbortSignal.timeout(15000), redirect: 'error' }
                );
                if (!response.ok) throw new Error();
                const data = await response.json();
                if (data.success !== 1) throw new Error();
                const snapshot = { data, updatedAt: now() };
                await write(file, snapshot);
                result[key] = { ...snapshot, stale: false };
                return;
              } catch {}
              if (old) {
                result[key] = { ...old, stale: true, error: 'Steam no respondió. Se muestran reseñas guardadas.' };
                return;
              }
            }
            result[key] = { error: error.message, data: null };
          }
        })
      );
      return result;
    },
    async achievements(appid, force = false) {
      if (!gameId(appid)) throw badRequest('App ID de Steam inválido.');
      const saved = await credentials();
      if (!saved) throw conflict('Conectá Steam para consultar tus logros.');
      // Consulta directa para obtener la lista completa, sin los recortes de la herramienta MCP.
      const hash = crypto.createHash('sha256').update(`${saved.steamId}:${appid}`).digest('hex');
      const file = path.join(dataDir, 'steam-cache', 'achievements-' + hash + '.json');
      const old = await read(file, null);
      if (!force && old && Date.now() - Date.parse(old.updatedAt) < 3600000) return { ...old, stale: false };
      const request = async (route, params) => {
        const url = new URL('https://api.steampowered.com/' + route);
        url.search = new URLSearchParams({ key: saved.apiKey, appid: String(appid), ...params });
        const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000), redirect: 'error' });
        if (!response.ok && !([400, 403].includes(response.status) && route.includes('GetPlayerAchievements')))
          throw new Error('No se pudieron consultar los logros de Steam.');
        return response.json();
      };
      try {
        const schema = await request('ISteamUserStats/GetSchemaForGame/v2/', { l: 'spanish' });
        if (!schema.game) throw new Error('No se pudo obtener la definición de los logros.');
        const definitions = schema.game?.availableGameStats?.achievements || [];
        const [player, global] = definitions.length
          ? await Promise.all([
              request('ISteamUserStats/GetPlayerAchievements/v1/', { steamid: saved.steamId, l: 'spanish' }),
              request('ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/', { gameid: String(appid) }).catch(
                () => ({})
              )
            ])
          : [{}, {}];
        const personal = new Map((player.playerstats?.achievements || []).map((row) => [row.apiname, row]));
        const rarity = new Map(
          (global.achievementpercentages?.achievements || []).map((row) => [row.name, row.percent])
        );
        const accessible = player.playerstats?.success === true;
        const games = definitions.map((row) => {
          const progress = personal.get(row.name);
          return {
            id: row.name,
            name: row.displayName || row.name,
            description: row.hidden && !progress?.achieved ? 'Logro oculto' : row.description || '',
            unlocked: accessible ? progress?.achieved === 1 : null,
            unlockedAt: progress?.unlocktime > 0 ? new Date(progress.unlocktime * 1000).toISOString() : null,
            rarity: rarity.get(row.name) ?? null
          };
        });
        const result = {
          updatedAt: now(),
          data: {
            accessible,
            total: games.length,
            unlocked: accessible ? games.filter((game) => game.unlocked).length : null,
            achievements: games
          }
        };
        await write(file, result);
        return { ...result, stale: false };
      } catch {
        if (old) return { ...old, stale: true, error: 'Steam no respondió. Se muestran los últimos logros guardados.' };
        throw new Error('No se pudieron consultar los logros. Revisá la conexión y la privacidad del perfil.');
      }
    },
    async collection(kind, { force = false, otherSteamId, appid } = {}) {
      const tools = {
        wishlist: ['get_wishlist', { include_details: true }],
        followed: ['get_followed_games', {}],
        recommendations: ['get_recommended_games', { limit: 12 }],
        friends: ['get_friend_list', {}],
        compare: ['compare_players', { other_steamid: otherSteamId }],
        owners: ['find_friends_who_own', { appids: [Number(appid)] }]
      };
      if (!tools[kind]) throw badRequest('Consulta de Steam no válida.');
      if (kind === 'compare' && !accountId(otherSteamId)) throw badRequest('Indicá un SteamID64 válido para comparar.');
      if (kind === 'owners' && !gameId(appid)) throw badRequest('App ID de Steam inválido.');
      if (!(await credentials())) throw conflict('Conectá Steam en Configuración.');
      const [tool, args] = tools[kind];
      const result = await cachedCall(tool, args, { force, ttl: kind === 'friends' ? 300000 : 3600000 });
      if (kind === 'followed' && result.data?.found !== false && Array.isArray(result.data?.games)) {
        const rows = result.data.games;
        const enriched = [];
        for (let index = 0; index < rows.length; index += 50) {
          try {
            const cards = await cachedCall(
              'get_items',
              { appids: rows.slice(index, index + 50).map((row) => row.appid) },
              { ttl: 3600000, force }
            );
            enriched.push(...(cards.data?.items || []));
          } catch {}
        }
        const cards = new Map(enriched.map((item) => [item.appid, item]));
        return withPrices(
          { ...result, data: { ...result.data, games: rows.map((row) => ({ ...row, ...cards.get(row.appid) })) } },
          'games',
          force
        );
      }
      if (kind === 'wishlist') return withPrices(result, 'items', force);
      if (kind === 'recommendations') return withPrices(result, 'recommendations', force);
      return result;
    }
  };
}
