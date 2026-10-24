import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { releaseNotes } from '../tools/release-notes.mjs';

test('toma la sección de la versión del CHANGELOG, sin la siguiente', () => {
  const text = '# Cambios\n\n## 0.2.0\n\n- Nuevo.\n\n## 0.1.0\n\n- Viejo.\n';
  assert.equal(releaseNotes(text, '0.2.0'), '- Nuevo.');
  assert.equal(releaseNotes(text, '0.1.0'), '- Viejo.');
  assert.equal(releaseNotes(text, '9.9.9'), null);
});

test('la versión de package.json tiene su sección en CHANGELOG.md', () => {
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(releaseNotes(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'), version));
});
