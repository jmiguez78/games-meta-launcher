import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVersionedFile, readJsonCached, updateJson, writeJsonAtomic } from '../src/json-file.mjs';
import { configureLog, log, recentLog, flushLog } from '../src/log.mjs';

async function tempDir(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-json-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

test('la lectura reutiliza el objeto mientras el archivo no cambie y ve los cambios de otro proceso', async (t) => {
  const file = path.join(await tempDir(t), 'datos.json');
  await fs.writeFile(file, JSON.stringify({ a: 1 }));
  const first = await readJsonCached(file, null);
  assert.equal(await readJsonCached(file, null), first);
  await new Promise((resolve) => setTimeout(resolve, 20));
  await fs.writeFile(file, JSON.stringify({ a: 2, b: true }));
  assert.deepEqual(await readJsonCached(file, null), { a: 2, b: true });
  assert.equal(await readJsonCached(path.join(path.dirname(file), 'no-existe.json'), 'vacío'), 'vacío');
});

test('un archivo dañado devuelve el valor por defecto sin romper', async (t) => {
  const file = path.join(await tempDir(t), 'roto.json');
  await fs.writeFile(file, '{"a": 1, ');
  assert.deepEqual(await readJsonCached(file, { ok: false }), { ok: false });
});

test('la escritura es atómica: no deja temporales y el contenido queda completo', async (t) => {
  const dir = await tempDir(t);
  const file = path.join(dir, 'sub', 'datos.json');
  await writeJsonAtomic(file, { lista: Array.from({ length: 1000 }, (_, i) => i) });
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).lista.length, 1000);
  assert.deepEqual(await fs.readdir(path.dirname(file)), ['datos.json']);
});

test('los cambios simultáneos sobre el mismo archivo se aplican todos, en orden', async (t) => {
  const file = path.join(await tempDir(t), 'prefs.json');
  await Promise.all(
    Array.from({ length: 25 }, (_, i) =>
      updateJson(file, (value) => {
        value.games ??= {};
        value.games['juego' + i] = { favorite: true };
      })
    )
  );
  const saved = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(Object.keys(saved.games).length, 25);
});

test('un cambio que falla no altera lo guardado ni la lectura compartida', async (t) => {
  const file = path.join(await tempDir(t), 'prefs.json');
  await writeJsonAtomic(file, { games: { a: 1 } });
  await assert.rejects(
    updateJson(file, (value) => {
      value.games.b = 2;
      throw new Error('falló');
    })
  );
  assert.deepEqual(await readJsonCached(file, null), { games: { a: 1 } });
});

test('migra un archivo de una versión anterior dejando una copia y respeta una versión más nueva', async (t) => {
  const dir = await tempDir(t);
  const file = path.join(dir, 'prefs.json');
  const original = JSON.stringify({ games: { x: { favorite: true } } });
  await fs.writeFile(file, original);
  const store = createVersionedFile(file, {
    version: 2,
    fallback: () => ({ games: {} }),
    migrations: { 1: (v) => ({ ...v, settings: {} }), 2: (v) => ({ ...v, migrated: true }) }
  });
  const value = await store.read();
  assert.equal(value.schemaVersion, 2);
  assert.equal(value.migrated, true);
  assert.deepEqual(value.settings, {});
  assert.equal(await fs.readFile(path.join(dir, 'prefs.v0.bak.json'), 'utf8'), original);
  await store.update((v) => {
    v.games.y = { favorite: false };
  });
  const saved = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.deepEqual(Object.keys(saved.games), ['x', 'y']);
  assert.equal(saved.schemaVersion, 2);

  const newer = path.join(dir, 'nuevo.json');
  await fs.writeFile(newer, JSON.stringify({ schemaVersion: 9, games: {} }));
  const future = createVersionedFile(newer, { version: 2, fallback: () => ({}) });
  assert.equal((await future.read()).schemaVersion, 9);
  await assert.rejects(fs.stat(path.join(dir, 'nuevo.v9.bak.json')));
});

test('el registro escribe líneas con fecha y nivel, rota al crecer y devuelve las últimas', async (t) => {
  const dir = await tempDir(t);
  configureLog(dir);
  log('info', 'prueba', 'primera línea');
  log('error', 'prueba', 'con\nsalto', 'detalle');
  await flushLog();
  const lines = await recentLog(10);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^\d{4}-\d\d-\d\dT.* \[info\] prueba: primera línea$/);
  assert.match(lines[1], /\[error\] prueba: con ⏎ salto \| detalle$/);
  for (let i = 0; i < 2300; i++) log('info', 'relleno', 'x'.repeat(900));
  await flushLog();
  const files = (await fs.readdir(path.join(dir, 'logs'))).sort();
  assert.deepEqual(files, ['gml.1.log', 'gml.2.log', 'gml.log']);
  for (const name of files) assert.ok((await fs.stat(path.join(dir, 'logs', name))).size <= 1_000_000);
});
