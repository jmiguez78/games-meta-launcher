// Tareas en segundo plano en una sola fila: indexar los MAME, Wikipedia e IGDB corren de a una, por prioridad,
// así no compiten por disco y red; pedir dos veces la misma no la duplica. Las tareas livianas (buscar juegos,
// sincronizar Steam) no esperan la fila: corren en paralelo, pero también se ven y tampoco se duplican.
// La interfaz no sondea: se suscribe a /api/events y recibe el estado de la fila cuando cambia, un aviso cuando
// los datos de la biblioteca cambiaron y cada sesión de juego medida.
const SAMPLE_MS = 500;

export const PRIORITY = { scan: 0, steam: 1, arcade: 2, 'arcade-legacy': 3, wiki: 4, igdb: 5 };

export function createTaskHub({ log = () => {}, sampleMs = SAMPLE_MS } = {}) {
  const queue = []; // { id, label, run, progress, resolve, reject, promise, queuedAt }
  let current = null;
  const light = new Map(); // tareas livianas en curso, por id
  const listeners = new Set();
  let lastSnapshot = '';
  let sampler = null;

  function emit(type, data) {
    for (const listener of listeners) {
      try {
        listener(type, data);
      } catch {
        /* un cliente desconectado no frena a los demás */
      }
    }
  }
  function describe(task, state) {
    let detail = null;
    try {
      detail = task.progress?.() ?? null;
    } catch {
      detail = null;
    }
    return { id: task.id, label: task.label, state, ...(detail ? { detail } : {}) };
  }
  function snapshot() {
    return [
      ...[...light.values()].map((task) => describe(task, 'running')),
      ...(current ? [describe(current, 'running')] : []),
      ...queue.map((task) => describe(task, 'queued'))
    ];
  }
  // Avance: se compara el estado cada medio segundo mientras hay algo en la fila y sólo se envía si cambió.
  function publish() {
    const tasks = snapshot();
    const text = JSON.stringify(tasks);
    if (text === lastSnapshot) return;
    lastSnapshot = text;
    emit('tasks', tasks);
  }
  function startSampler() {
    if (sampler) return;
    sampler = setInterval(() => {
      publish();
      if (!current && !queue.length && !light.size) {
        clearInterval(sampler);
        sampler = null;
      }
    }, sampleMs);
    sampler.unref?.();
  }
  // Corre una tarea; release() la saca de «en curso» antes de avisar a quien la espera.
  function execute(task, release) {
    publish();
    Promise.resolve()
      .then(task.run)
      .then(
        (value) => ({ ok: true, value }),
        (error) => ({ ok: false, error })
      )
      .then((result) => {
        // Primero se libera la fila: quien espera la tarea ya la ve terminada.
        release();
        publish();
        if (result.ok) {
          task.resolve(result.value);
          if (task.changesLibrary) emit('library', { reason: task.id });
        } else {
          log('warn', 'tareas', `${task.label}: ${result.error?.message ?? result.error}`);
          task.reject(result.error);
        }
      });
  }
  function next() {
    if (current || !queue.length) return;
    queue.sort((a, b) => (PRIORITY[a.id] ?? 9) - (PRIORITY[b.id] ?? 9) || a.queuedAt - b.queuedAt);
    current = queue.shift();
    execute(current, () => {
      current = null;
      setTimeout(next, 0);
    });
  }

  return {
    // Suma una tarea a la fila (o devuelve la que ya está con ese id). progress(): detalle del avance.
    // changesLibrary: al terminar bien, se avisa a la interfaz para que vuelva a pedir la biblioteca.
    // lightweight: corre ya, sin esperar la fila.
    enqueue(id, label, run, { progress, changesLibrary = true, lightweight = false } = {}) {
      if (light.has(id)) return light.get(id).promise;
      if (current?.id === id) return current.promise;
      const waiting = queue.find((task) => task.id === id);
      if (waiting) return waiting.promise;
      let resolve, reject;
      const promise = new Promise((ok, fail) => ((resolve = ok), (reject = fail)));
      // Quien encola sin esperar el resultado no deja una promesa rechazada sin atender.
      promise.catch(() => {});
      const task = { id, label, run, progress, changesLibrary, resolve, reject, promise, queuedAt: Date.now() };
      startSampler();
      if (lightweight) {
        light.set(id, task);
        execute(task, () => light.delete(id));
        return promise;
      }
      queue.push(task);
      publish();
      next();
      return promise;
    },
    has: (id) => light.has(id) || current?.id === id || queue.some((task) => task.id === id),
    snapshot,
    emit,
    subscribe(listener) {
      listeners.add(listener);
      listener('tasks', snapshot());
      return () => listeners.delete(listener);
    },
    listeners: () => listeners.size
  };
}

// Respuesta de eventos del servidor (text/event-stream) con un latido para que nada corte la conexión.
export function streamEvents(req, res, hub, { heartbeatMs = 25000 } = {}) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-content-type-options': 'nosniff'
  });
  res.write('retry: 3000\n\n');
  const unsubscribe = hub.subscribe((type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
  const heartbeat = setInterval(() => res.write(': latido\n\n'), heartbeatMs);
  heartbeat.unref?.();
  const close = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };
  req.on('close', close);
  res.on('error', close);
}
