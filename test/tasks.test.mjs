import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createTaskHub, streamEvents } from '../src/tasks.mjs';

const deferred = () => {
  let resolve;
  const promise = new Promise((ok) => (resolve = ok));
  return { promise, resolve };
};

test('corre las tareas de a una, por prioridad, sin duplicarlas', async () => {
  const hub = createTaskHub({ sampleMs: 5 });
  const order = [];
  const gate = deferred();
  const first = hub.enqueue('igdb', 'IGDB', async () => {
    order.push('igdb');
    await gate.promise;
  });
  hub.enqueue('wiki', 'Wikipedia', async () => order.push('wiki'));
  hub.enqueue('scan', 'Buscar juegos', async () => order.push('scan'));
  assert.equal(
    hub.enqueue('wiki', 'Wikipedia', async () => order.push('otra')),
    hub.enqueue('wiki', 'x', () => {})
  );
  assert.deepEqual(
    hub.snapshot().map((task) => [task.id, task.state]),
    [
      ['igdb', 'running'],
      ['wiki', 'queued'],
      ['scan', 'queued']
    ]
  );
  gate.resolve();
  await first;
  await hub.enqueue('wiki', 'Wikipedia', () => {});
  await hub.enqueue('steam', 'Steam', async () => order.push('steam'));
  // Después de la que estaba corriendo: primero la de mayor prioridad (buscar juegos), después Wikipedia.
  assert.deepEqual(order, ['igdb', 'scan', 'wiki', 'steam']);
  assert.deepEqual(hub.snapshot(), []);
});

test('avisa el avance, el cambio de biblioteca y los errores sin cortar la fila', async () => {
  const hub = createTaskHub({ sampleMs: 5 });
  const events = [];
  hub.subscribe((type, data) => events.push([type, data]));
  const status = { done: 0 };
  const gate = deferred();
  const task = hub.enqueue(
    'arcade',
    'Arcade',
    async () => {
      status.done = 3;
      await new Promise((resolve) => setTimeout(resolve, 30));
      await gate.promise;
    },
    { progress: () => ({ done: status.done }) }
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  gate.resolve();
  await task;
  await assert.rejects(
    hub.enqueue('steam', 'Steam', async () => {
      throw new Error('sin conexión');
    }),
    /sin conexión/
  );
  await hub.enqueue('scan', 'Buscar', async () => {});
  const tasks = events.filter(([type]) => type === 'tasks').map(([, data]) => data);
  assert.ok(tasks.some((list) => list[0]?.id === 'arcade' && list[0].detail?.done === 3));
  assert.deepEqual(
    events.filter(([type]) => type === 'library').map(([, data]) => data.reason),
    ['arcade', 'scan']
  );
  assert.deepEqual(tasks.at(-1), []);
});

test('/api/events envía el estado como eventos del servidor', async () => {
  const hub = createTaskHub();
  const server = http.createServer((req, res) => streamEvents(req, res, hub));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const controller = new AbortController();
  const response = await fetch(`http://127.0.0.1:${server.address().port}/`, { signal: controller.signal });
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const reader = response.body.getReader();
  let text = '';
  hub.emit('session', { key: 'steam:10', seconds: 600 });
  while (!text.includes('event: session')) text += new TextDecoder().decode((await reader.read()).value);
  assert.match(text, /event: tasks\ndata: \[\]/);
  assert.match(text, /event: session\ndata: \{"key":"steam:10","seconds":600\}/);
  controller.abort();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(hub.listeners(), 0);
  server.close();
});

test('las tareas livianas no esperan la fila', async () => {
  const hub = createTaskHub({ sampleMs: 5 });
  const gate = deferred();
  const slow = hub.enqueue('igdb', 'IGDB', () => gate.promise);
  const order = [];
  await hub.enqueue('scan', 'Buscar juegos', async () => order.push('scan'), { lightweight: true });
  assert.deepEqual(order, ['scan']);
  assert.deepEqual(
    hub.snapshot().map((task) => [task.id, task.state]),
    [['igdb', 'running']]
  );
  gate.resolve();
  await slow;
});
