import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpdates, isNewer } from '../src/updates.mjs';

test('compara versiones numéricamente', () => {
  assert.equal(isNewer('0.30.0', '0.29.0'), true);
  assert.equal(isNewer('0.10.0', '0.9.9'), true);
  assert.equal(isNewer('v1.0.0', '0.99.0'), true);
  assert.equal(isNewer('0.29.0', '0.29.0'), false);
  assert.equal(isNewer('0.28.9', '0.29.0'), false);
  assert.equal(isNewer('basura', '0.29.0'), false);
});

test('avisa una versión nueva, la recuerda un día y no consulta sin repositorio', async () => {
  let calls = 0;
  let clock = 1_000_000;
  const fetchImpl = async (url) => {
    calls++;
    assert.match(url, /api\.github\.com\/repos\/yo\/launcher\/releases\/latest$/);
    return new Response(
      JSON.stringify({
        tag_name: 'v0.31.0',
        name: 'Mejoras',
        html_url: 'https://github.com/yo/launcher/releases/tag/v0.31.0',
        body: 'Notas'
      }),
      { status: 200 }
    );
  };
  const updates = createUpdates({ current: '0.29.0', repository: 'yo/launcher', fetchImpl, now: () => clock });
  const first = await updates.check();
  assert.equal(first.newer, true);
  assert.equal(first.latest, '0.31.0');
  assert.equal(first.url, 'https://github.com/yo/launcher/releases/tag/v0.31.0');
  await updates.check();
  assert.equal(calls, 1);
  clock += 25 * 60 * 60 * 1000;
  await updates.check();
  assert.equal(calls, 2);

  const off = createUpdates({ current: '0.29.0', repository: null, fetchImpl });
  assert.deepEqual(await off.check(), { enabled: false, current: '0.29.0' });
});

test('sin publicaciones, sin conexión o con un enlace raro no rompe ni avisa', async () => {
  const missing = createUpdates({
    current: '1.0.0',
    repository: 'yo/x',
    fetchImpl: async () => new Response('{}', { status: 404 })
  });
  assert.equal((await missing.check()).available, false);
  const offline = createUpdates({
    current: '1.0.0',
    repository: 'yo/x',
    fetchImpl: async () => {
      throw new Error('sin red');
    }
  });
  const result = await offline.check();
  assert.equal(result.available, false);
  assert.equal(result.error, 'sin red');
  const weird = createUpdates({
    current: '1.0.0',
    repository: 'yo/x',
    fetchImpl: async () =>
      new Response(JSON.stringify({ tag_name: '2.0.0', html_url: 'https://evil.example/' }), { status: 200 })
  });
  assert.equal((await weird.check()).url, null);
});
