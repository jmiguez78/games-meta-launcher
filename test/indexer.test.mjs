import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSteamManifest, vdfValue } from '../src/indexer.mjs';

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
