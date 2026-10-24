// Sistema: tarea programada, registro de la interfaz, diagnóstico y avisos de versión nueva.
import { HANDLED, check, send, withStatus } from '../http.mjs';

export function systemRoutes(router, d) {
  router.get('/api/schedule', () => d.schedule());
  router.put('/api/schedule', async ({ body }) => {
    const update = await body();
    return d.configureSchedule(check.string(update.time, 'Indicá una hora válida en formato HH:MM.', { max: 5 }));
  });
  router.post('/api/log', async ({ body }) => {
    d.clientLog(await body());
    return withStatus(204);
  });
  router.get('/api/diagnostics', async ({ res }) => {
    send(res, 200, JSON.stringify(await d.diagnostics(), null, 2));
    return HANDLED;
  });
  router.get('/api/updates', ({ query }) => d.updates.check({ force: query.get('refresh') === '1' }));
}
