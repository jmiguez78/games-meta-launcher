import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSteam, mergeSteamLibrary } from '../src/steam.mjs';

const steamId = '76561198000000001';
const apiKey = 'a'.repeat(32);
const response = (value, status = 200) => new Response(JSON.stringify(value), { status });
async function fixture(t, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-steam-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const client = createSteam(directory, {
    encrypt: async (text) => text,
    decrypt: async (text) => text,
    rpc: async () => ({ found: true }),
    ...options
  });
  await client.connect(apiKey, steamId);
  t.after(() => client.close());
  return { client, directory };
}

test('fusiona cuenta e instalaciones por App ID sin perder juegos de otras cuentas o tiendas', () => {
  const local = [
    { key: 'steam:10', id: '10', platform: 'Steam', name: 'Local', location: 'C:/Steam' },
    { key: 'steam:20', id: '20', platform: 'Steam', name: 'Otra cuenta' },
    { key: 'epic:10', id: '10', platform: 'Epic Games', name: 'Mismo número, otra tienda' }
  ];
  const merged = mergeSteamLibrary(local, {
    games: [
      { appid: 10, name: 'Local', playtimeHours: 8 },
      { appid: 30, name: 'Remoto', playtimeHours: 0 }
    ]
  });
  assert.equal(merged.length, 4);
  assert.equal(merged.find((g) => g.key === 'steam:10').steam.playtimeHours, 8);
  assert.equal(merged.find((g) => g.key === 'steam:20').ownership, 'unknown');
  assert.equal(merged.find((g) => g.key === 'epic:10').ownership, 'unknown');
  const remote = merged.find((g) => g.key === 'steam:30');
  assert.equal(remote.installed, false);
  assert.equal(remote.status, 'not-installed');
  assert.equal(remote.launch, null);
  assert.equal(remote.location, '');
  assert.equal(local[0].ownership, undefined);
});

test('sincroniza más de 300 juegos y rechaza respuestas incompletas sin borrar la caché', async (t) => {
  let rows = Array.from({ length: 400 }, (_, i) => ({ appid: i + 1, name: 'Juego ' + i, playtime_forever: i * 60 }));
  const { client, directory } = await fixture(t, {
    fetchImpl: async () => response({ response: { game_count: 400, games: rows } })
  });
  const account = await client.sync();
  assert.equal(account.games.length, 400);
  assert.equal(account.games[0].playtimeHours, 0);
  assert.equal(account.games[2].playtimeHours, 2);
  const previous = await fs.readFile(path.join(directory, 'steam-account.json'), 'utf8');
  rows = rows.slice(0, 30);
  await assert.rejects(client.sync(), /incompleta/);
  assert.equal(await fs.readFile(path.join(directory, 'steam-account.json'), 'utf8'), previous);
  const settings = await client.settings();
  assert.equal(settings.total, 400);
  assert.equal(JSON.stringify(settings).includes(apiKey), false);
  assert.equal(settings.running, false);
});

test('una biblioteca privada o una caída de red no se convierten en biblioteca vacía', async (t) => {
  let mode = 'ok';
  const { client } = await fixture(t, {
    fetchImpl: async () => {
      if (mode === 'network') throw new Error('internal URL with credentials');
      return response({ response: mode === 'ok' ? { game_count: 1, games: [{ appid: 10, name: 'Juego' }] } : {} });
    }
  });
  await client.sync();
  mode = 'private';
  await assert.rejects(client.sync(), /privacidad/);
  assert.equal((await client.account()).games.length, 1);
  mode = 'network';
  await assert.rejects(client.sync(), /conectar/);
  assert.equal((await client.settings()).error.includes('credentials'), false);
});

test('la caché de consultas se conserva sin red y no se comparte entre cuentas', async (t) => {
  let online = true;
  let calls = 0;
  const { client } = await fixture(t, {
    rpc: async (tool, args, credentials) => {
      if (tool === 'get_player_summary') return { found: true };
      calls++;
      if (!online) throw new Error('Sin conexión');
      return { items: [{ appid: 10, name: credentials.steamId }] };
    }
  });
  const first = await client.collection('wishlist');
  assert.equal(first.stale, false);
  await client.collection('wishlist');
  assert.equal(calls, 1);
  online = false;
  const fallback = await client.collection('wishlist', { force: true });
  assert.equal(fallback.stale, true);
  assert.equal(fallback.data.items[0].name, steamId);
  await client.connect(apiKey, '76561198000000002');
  await assert.rejects(client.collection('wishlist'), /conexión/);
  assert.equal((await client.account()).games.length, 0);
  await client.disconnect();
  assert.equal((await client.settings()).configured, false);
});

test('logros completos sin recortar la lista y sin confundir privacidad con cero progreso', async (t) => {
  let privateProgress = false;
  const definitions = Array.from({ length: 260 }, (_, i) => ({
    name: 'A' + i,
    displayName: 'Logro ' + i,
    description: 'Texto',
    hidden: i === 2 ? 1 : 0
  }));
  const { client } = await fixture(t, {
    fetchImpl: async (url) => {
      if (url.pathname.includes('GetPlayerAchievements'))
        return response(
          {
            playerstats: privateProgress
              ? { success: false }
              : { success: true, achievements: [{ apiname: 'A0', achieved: 1, unlocktime: 1600300800 }] }
          },
          privateProgress ? 403 : 200
        );
      if (url.pathname.includes('GetSchemaForGame'))
        return response({ game: { availableGameStats: { achievements: definitions } } });
      return response({ achievementpercentages: { achievements: [{ name: 'A0', percent: 0.5 }] } });
    }
  });
  const first = await client.achievements(10);
  assert.equal(first.data.total, 260);
  assert.equal(first.data.unlocked, 1);
  assert.equal(first.data.achievements[0].rarity, 0.5);
  assert.equal(first.data.achievements[2].description, 'Logro oculto');
  privateProgress = true;
  const second = await client.achievements(10, true);
  assert.equal(second.data.accessible, false);
  assert.equal(second.data.unlocked, null);
  assert.equal(second.data.achievements[0].unlocked, null);
});

test('valida las consultas sociales antes de acceder a Steam', async (t) => {
  const { client } = await fixture(t);
  await assert.rejects(client.collection('compare', { otherSteamId: '../secret' }), /SteamID64/);
  await assert.rejects(client.collection('owners', { appid: '10&key=secret' }), /App ID/);
  await assert.rejects(client.details('../secret'), /App ID/);
});

test('un juego sin logros no consulta progreso ni se interpreta como error', async (t) => {
  let requests = 0;
  const { client } = await fixture(t, {
    fetchImpl: async () => {
      requests++;
      return response({ game: {} });
    }
  });
  const result = await client.achievements(10);
  assert.equal(result.data.total, 0);
  assert.equal(requests, 1);
});

test('los precios muestran la moneda recibida y nunca se infiere a partir del símbolo', async (t) => {
  let online = true;
  const { client } = await fixture(t, {
    rpc: async (tool) => {
      if (tool === 'get_player_summary') return { found: true };
      if (tool === 'get_prices') {
        if (!online) throw new Error('Sin red');
        return { prices: [{ appid: 10, currency: 'USD', final: '$4.99', discount_percent: 50 }] };
      }
      return { items: [{ appid: 10, name: 'Juego', price: '$4.99' }] };
    }
  });
  const result = await client.collection('wishlist');
  assert.equal(result.data.items[0].price.currency, 'USD');
  online = false;
  assert.equal((await client.collection('wishlist', { force: true })).stale, true);
});

test('las reseñas de respaldo se conservan sin conexión', async (t) => {
  let online = true;
  const { client } = await fixture(t, {
    rpc: async (tool) => {
      if (tool === 'get_game_reviews') throw new Error('Sin reseñas');
      return {};
    },
    fetchImpl: async () => {
      if (!online) throw new Error('Sin red');
      return response({ success: 1, reviews: [{ review: 'Texto' }] });
    }
  });
  assert.equal((await client.details(10)).reviews.data.reviews[0].review, 'Texto');
  online = false;
  const result = await client.details(10, true);
  assert.equal(result.reviews.stale, true);
  assert.equal(result.reviews.data.reviews[0].review, 'Texto');
});
