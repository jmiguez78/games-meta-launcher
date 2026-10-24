import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assetUrls, createSteamAssets } from '../src/steam-assets.mjs';

const assets = {
  asset_url_format: 'steam/apps/678950/${FILENAME}?t=1',
  library_capsule: 'abc123/library_600x900.jpg',
  library_capsule_2x: 'abc123/library_600x900_2x.jpg',
  library_hero: 'def456/library_hero.jpg',
  header: 'header.jpg'
};

test('arma las rutas vigentes de la tienda y prefiere la versión 2x', () => {
  assert.deepEqual(assetUrls(assets), {
    cover: 'https://shared.steamstatic.com/store_item_assets/steam/apps/678950/abc123/library_600x900_2x.jpg?t=1',
    hero: 'https://shared.steamstatic.com/store_item_assets/steam/apps/678950/def456/library_hero.jpg?t=1',
    header: 'https://shared.steamstatic.com/store_item_assets/steam/apps/678950/header.jpg?t=1'
  });
  assert.equal(assetUrls({ library_capsule: 'x.jpg' }), null);
  assert.equal(assetUrls(undefined), null);
});

test('agrupa los pedidos simultáneos en una consulta y la recuerda en disco', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-assets-'));
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(JSON.parse(decodeURIComponent(url.split('input_json=')[1])).ids.map((item) => item.appid));
    return {
      ok: true,
      json: async () => ({ response: { store_items: [{ appid: 678950, assets }] } })
    };
  };
  const first = createSteamAssets(dir, { fetchImpl });
  const [found, missing] = await Promise.all([first.urls('678950'), first.urls('515220')]);
  // Una sola consulta con los dos juegos (el orden no importa).
  assert.deepEqual(
    calls.map((ids) => [...ids].sort()),
    [[515220, 678950]]
  );
  assert.match(found.cover, /abc123\/library_600x900_2x\.jpg/);
  assert.equal(missing, null);

  // Una instancia nueva (otra sesión de la app) usa lo guardado sin consultar.
  const second = createSteamAssets(dir, { fetchImpl });
  assert.equal((await second.urls('678950')).cover, found.cover);
  assert.equal(await second.urls('515220'), null);
  assert.equal(calls.length, 1);
  await fs.rm(dir, { recursive: true, force: true });
});

test('sin conexión no recuerda la falta y vuelve a consultar', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-assets-'));
  let calls = 0;
  const offline = createSteamAssets(dir, {
    fetchImpl: async () => {
      calls++;
      throw new Error('sin red');
    }
  });
  assert.equal(await offline.urls('10'), null);
  assert.equal(await offline.urls('10'), null);
  assert.equal(calls, 2);
  assert.equal(await offline.urls('no-es-un-id'), null);
  await fs.rm(dir, { recursive: true, force: true });
});
