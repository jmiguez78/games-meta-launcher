import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PORTABLE_FOLDER, chooseDataDir, copyToPortable } from '../src/portable.mjs';

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
