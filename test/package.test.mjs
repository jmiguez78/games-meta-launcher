import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releasesToPrune, versionOf } from '../tools/package.mjs';

test('el empaquetado conserva sólo los dos ejecutables más recientes', () => {
  const files = [
    'Games Meta Launcher 0.9.0.exe',
    'Games Meta Launcher 0.18.0.exe',
    'Games Meta Launcher 0.14.2.exe',
    'Games Meta Launcher 0.10.0.exe',
    'notas.txt'
  ];
  assert.deepEqual(releasesToPrune(files), ['Games Meta Launcher 0.9.0.exe', 'Games Meta Launcher 0.10.0.exe']);
  assert.deepEqual(releasesToPrune(files.slice(1, 3)), []);
  assert.deepEqual(versionOf('Games Meta Launcher 0.18.0.exe'), [0, 18, 0]);
  assert.equal(versionOf('notas.txt'), null);
  // Con el nombre nuevo (0.36.0) conviven las versiones de antes: se ordenan por versión, no por nombre.
  assert.deepEqual(versionOf('Viciodromo-0.36.0.exe'), [0, 36, 0]);
  assert.deepEqual(
    releasesToPrune(['Games Meta Launcher 0.35.0.exe', 'Viciodromo-0.36.0.exe', 'Games Meta Launcher 0.34.0.exe']),
    ['Games Meta Launcher 0.34.0.exe']
  );
});
