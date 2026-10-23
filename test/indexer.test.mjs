import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseSteamManifest, steamArtwork, vdfValue, xboxArtwork } from '../src/indexer.mjs';

test('lee un manifiesto de Steam', () => {
  const manifest = `"AppState"
{
	"appid"		"620"
	"Universe"		"1"
	"name"		"Portal 2"
	"installdir"		"Portal 2"
}`;
  assert.deepEqual(parseSteamManifest(manifest), { id: '620', name: 'Portal 2', installDir: 'Portal 2' });
});

test('vdfValue ignora mayúsculas en la clave y devuelve vacío si falta', () => {
  assert.equal(vdfValue('"InstallDir"  "Hades"', 'installdir'), 'Hades');
  assert.equal(vdfValue('"name" "Hades"', 'appid'), '');
});

test('encuentra imágenes de Steam en la carpeta del juego y en subcarpetas con hash', async () => {
  const cache = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-steam-'));
  await fs.mkdir(path.join(cache, '620', 'a1b2'), { recursive: true });
  await fs.writeFile(path.join(cache, '620', 'header.jpg'), '');
  await fs.writeFile(path.join(cache, '620', 'a1b2', 'library_capsule.jpg'), '');
  await fs.writeFile(path.join(cache, '620', 'a1b2', 'library_hero.jpg'), '');
  const art = await steamArtwork('620', cache);
  assert.equal(art.portrait, path.join(cache, '620', 'a1b2', 'library_capsule.jpg'));
  assert.equal(art.landscape, path.join(cache, '620', 'header.jpg'));
  assert.equal(art.hero, path.join(cache, '620', 'a1b2', 'library_hero.jpg'));
  assert.equal(await steamArtwork('999', cache), null);
  await fs.rm(cache, { recursive: true, force: true });
});

test('usa el logo más grande disponible de un juego de Xbox', async () => {
  const location = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-xbox-'));
  await fs.mkdir(path.join(location, 'Content', 'Resources'), { recursive: true });
  await fs.writeFile(path.join(location, 'Content', 'Resources', 'Logo.png'), '');
  const config =
    '<ShellVisuals Square480x480Logo="Resources\\Falta.png" Square150x150Logo="Resources\\Logo.png" BackgroundColor="#000040" />';
  assert.deepEqual(await xboxArtwork(location, config), {
    logo: path.join(location, 'Content', 'Resources', 'Logo.png'),
    background: '#000040'
  });
  await fs.rm(location, { recursive: true, force: true });
});
