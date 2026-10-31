import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSessionLog, createSessionTracker, gameRoots, isGameProcess, normalizeRoot } from '../src/sessions.mjs';

test('vigila la carpeta del juego, no una unidad ni una carpeta general', () => {
  assert.equal(normalizeRoot('C:\\'), null);
  assert.equal(normalizeRoot('D:\\Juegos'), null);
  assert.equal(normalizeRoot('D:\\Juegos\\Hades\\'), 'd:\\juegos\\hades\\');
  assert.deepEqual(
    gameRoots({
      location: 'E:\\Epic\\Hades',
      launch: { type: 'file', target: 'F:\\Otros\\Hades II\\Hades2.exe' }
    }),
    ['e:\\epic\\hades\\', 'f:\\otros\\hades ii\\']
  );
  const roots = ['e:\\epic\\hades\\'];
  assert.equal(isGameProcess('E:\\Epic\\Hades\\x64\\Hades.exe', roots), true);
  assert.equal(isGameProcess('E:\\Epic\\Hades II\\Hades2.exe', roots), false);
  assert.equal(isGameProcess('E:\\Epic\\Hades\\UnityCrashHandler64.exe', roots), false);
  assert.equal(isGameProcess('E:\\Epic\\Hades\\EasyAntiCheat\\EasyAntiCheat_EOS_Setup.exe', roots), false);
});

test('mide desde que aparece el proceso hasta que deja de estar dos veces seguidas', async () => {
  let clock = 0;
  let pending = null;
  const timers = { set: (fn) => (pending = fn), clear: () => (pending = null) };
  const running = [];
  const ended = [];
  const tracker = createSessionTracker({
    listProcesses: async () => [...running],
    now: () => clock,
    timers,
    onEnd: (game, session) => ended.push([game.key, session])
  });
  const step = async (ms) => {
    clock += ms;
    const run = pending;
    pending = null;
    await run();
  };
  assert.equal(tracker.track({ key: 'epic games:x', location: 'C:\\Juegos\\Epic\\X' }), true);
  assert.equal(tracker.track({ key: 'steam:1' }), false);
  await step(4000); // el lanzador todavía no abrió el juego
  running.push('C:\\Program Files\\Epic Games\\Launcher\\EpicGamesLauncher.exe');
  await step(4000);
  running.push('C:\\Juegos\\Epic\\X\\Binaries\\X.exe');
  await step(4000); // empieza en 12 s
  await step(15000);
  await step(15000); // última vez visto: 42 s
  running.pop();
  await step(15000);
  assert.deepEqual(ended, []);
  await step(15000);
  assert.deepEqual(ended, [['epic games:x', { start: new Date(12000).toISOString(), seconds: 30 }]]);
  assert.deepEqual(tracker.watching(), []);
  assert.equal(pending, null);
});

test('si el juego nunca aparece, deja de esperarlo', async () => {
  let clock = 0;
  let pending = null;
  const missing = [];
  const tracker = createSessionTracker({
    listProcesses: async () => [],
    now: () => clock,
    timers: { set: (fn) => (pending = fn), clear: () => {} },
    onMissing: (game) => missing.push(game.key)
  });
  tracker.track({ key: 'gog galaxy:y', location: 'C:\\GOG Games\\Y' });
  while (pending) {
    clock += 4000;
    const run = pending;
    pending = null;
    await run();
  }
  assert.deepEqual(missing, ['gog galaxy:y']);
  assert.ok(clock > 4 * 60 * 1000);
});

test('guarda las sesiones de más de 5 segundos', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-sessions-'));
  const log = createSessionLog(dir);
  assert.equal(await log.add({ key: 'a', name: 'A', start: '2026-10-30T10:00:00.000Z', seconds: 3 }), null);
  await log.add({ key: 'a', name: 'A', start: '2026-10-30T10:00:00.000Z', seconds: 600.4, source: 'proceso' });
  assert.deepEqual(await log.list(), [
    { key: 'a', name: 'A', start: '2026-10-30T10:00:00.000Z', seconds: 600, source: 'proceso' }
  ]);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir, 'sessions.json'), 'utf8')).schemaVersion, 1);
  await fs.rm(dir, { recursive: true, force: true });
});
