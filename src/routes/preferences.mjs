// Preferencias por juego, respaldo, portadas propias y ajustes de la aplicación.
import { badRequest, check } from '../http.mjs';

export function preferencesRoutes(router, d) {
  router.put('/api/preferences', async ({ body }) => {
    const update = await body();
    const key = check.string(update.key, 'Falta la clave del juego.', { max: 300 });
    const prefs = await d.updatePreferences((current) => {
      current.games[key] = d.gameUpdate(current.games[key] ?? {}, update);
    });
    return prefs.games[key];
  });
  router.get('/api/preferences/export', () => d.preferences());
  router.post('/api/preferences/import', async ({ body }) => {
    const imported = await body();
    if (!imported.games || typeof imported.games !== 'object' || Array.isArray(imported.games))
      throw badRequest('El archivo no contiene preferencias válidas.');
    return d.importPreferences(imported);
  });
  router.post('/api/covers', async ({ body }) => {
    const update = await body();
    const key = check.string(update.key, 'Falta el juego asociado a la portada.', { max: 300 });
    const file = await d.saveCover(update);
    await d.updatePreferences((prefs) => {
      prefs.games[key] = { ...(prefs.games[key] ?? {}), coverFile: file };
    });
    return { coverFile: file };
  });
  router.get('/api/settings', () => d.appSettings());
  router.put('/api/settings', async ({ body }) => {
    const update = await body();
    const patch = {};
    if ('theme' in update) patch.theme = check.oneOf(update.theme, d.themes, 'Tema no válido.');
    if ('minimizeOnLaunch' in update)
      patch.minimizeOnLaunch = check.boolean(update.minimizeOnLaunch, 'Valor no válido para minimizar al jugar.');
    if ('onboardingDismissed' in update)
      patch.onboardingDismissed = check.boolean(update.onboardingDismissed, 'Valor no válido.');
    if (!Object.keys(patch).length) throw badRequest('No hay cambios para guardar.');
    return d.saveSettings(patch);
  });
}
