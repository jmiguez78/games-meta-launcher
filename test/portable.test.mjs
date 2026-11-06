import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  LEGACY_PORTABLE_FOLDER,
  PORTABLE_FOLDER,
  chooseDataDir,
  copyToPortable,
  migrateLegacyData
} from '../src/portable.mjs';

test('elige junto al .exe sin pisar una instalación anterior', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-portable-'));
  const exeDir = path.join(root, 'pendrive');
  const appData = path.join(root, 'AppData');
  await fs.mkdir(exeDir);
  await fs.mkdir(appData);
  // Sin .exe portable (desarrollo): AppData.
  assert.deepEqual(chooseDataDir({ exeDir: undefined, defaultDir: appData }), { dir: appData, portable: false });
  // Esta PC ya tenía datos: se siguen usando.
  await fs.writeFile(path.join(appData, 'preferences.json'), '{}');
  assert.deepEqual(chooseDataDir({ exeDir, defaultDir: appData }), { dir: appData, portable: false });
  // Se copian junto al .exe (sin las cachés de Chromium) y desde ahí se usan.
  await fs.mkdir(path.join(appData, 'GPUCache'));
  await fs.mkdir(path.join(appData, 'art-cache'));
  await fs.writeFile(path.join(appData, 'art-cache', 'a.jpg'), 'x');
  const target = path.join(exeDir, PORTABLE_FOLDER);
  await copyToPortable(appData, target);
  assert.deepEqual((await fs.readdir(target)).sort(), ['art-cache', 'preferences.json']);
  await assert.rejects(copyToPortable(appData, target), /Ya hay datos/);
  assert.deepEqual(chooseDataDir({ exeDir, defaultDir: appData }), { dir: target, portable: true });
  // Otra PC sin datos: se crea junto al .exe.
  const other = path.join(root, 'otra');
  await fs.mkdir(other);
  const fresh = path.join(root, 'nuevo');
  await fs.mkdir(fresh);
  assert.deepEqual(chooseDataDir({ exeDir: fresh, defaultDir: other }), {
    dir: path.join(fresh, PORTABLE_FOLDER),
    portable: true
  });
  await fs.rm(root, { recursive: true, force: true });
});

test('cambio de nombre: los datos de «Games Meta Launcher» pasan a «Viciódromo»', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-renombre-'));
  try {
    // AppData: se copian los datos y lo que recuerda la interfaz, sin las cachés pesadas; la vieja queda.
    const legacy = path.join(root, 'AppData', 'Games Meta Launcher');
    const current = path.join(root, 'AppData', 'Viciódromo');
    await fs.mkdir(path.join(legacy, 'GPUCache'), { recursive: true });
    await fs.mkdir(path.join(legacy, 'Local Storage'), { recursive: true });
    await fs.mkdir(path.join(legacy, 'covers'), { recursive: true });
    await fs.writeFile(path.join(legacy, 'preferences.json'), '{"games":{"steam:10":{"favorite":true}}}');
    await fs.writeFile(path.join(legacy, 'covers', 'a.png'), 'x');
    assert.deepEqual(migrateLegacyData({ defaultDir: current, legacyDirs: [path.join(root, 'no'), legacy] }), {
      from: legacy
    });
    assert.deepEqual((await fs.readdir(current)).sort(), ['Local Storage', 'covers', 'preferences.json']);
    assert.match(await fs.readFile(path.join(current, 'preferences.json'), 'utf8'), /favorite/);
    assert.ok((await fs.readdir(legacy)).includes('preferences.json'));
    // Con datos en la nueva, no se vuelve a copiar.
    await fs.writeFile(path.join(legacy, 'preferences.json'), '{}');
    assert.equal(migrateLegacyData({ defaultDir: current, legacyDirs: [legacy] }), null);
    assert.match(await fs.readFile(path.join(current, 'preferences.json'), 'utf8'), /favorite/);
    // Portable: la carpeta vieja junto al .exe se renombra.
    const exeDir = path.join(root, 'pendrive');
    await fs.mkdir(path.join(exeDir, LEGACY_PORTABLE_FOLDER), { recursive: true });
    await fs.writeFile(path.join(exeDir, LEGACY_PORTABLE_FOLDER, 'preferences.json'), '{}');
    const chosen = chooseDataDir({ exeDir, defaultDir: current });
    assert.equal(chosen.dir, path.join(exeDir, PORTABLE_FOLDER));
    assert.ok(chosen.portable);
    assert.deepEqual(await fs.readdir(exeDir), [PORTABLE_FOLDER]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
