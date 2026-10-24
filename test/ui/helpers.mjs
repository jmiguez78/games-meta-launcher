import { test as base, expect } from '@playwright/test';

// Fecha fija (las filas de Inicio y los «hace 3 días» dependen del día) y registro de errores de la página y de
// bloqueos de la política de contenido: cualquier prueba falla si aparecen.
export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = [];
    page.on('pageerror', (error) => problems.push('Error de la página: ' + error.message));
    page.on('console', (message) => {
      if (/Content Security Policy|Refused to/i.test(message.text())) problems.push('CSP: ' + message.text());
    });
    await page.clock.setFixedTime(new Date('2026-10-24T18:00:00-03:00'));
    // Jugar no abre nada en las pruebas.
    await page.route(/\/api\/launch\//, (route) =>
      route.fulfill({ contentType: 'application/json', body: '{"ok":true,"minimize":false}' })
    );
    await use(page);
    expect(problems, problems.join('\n')).toEqual([]);
  }
});
export { expect };

export async function openApp(page, path = '/') {
  await page.goto(path);
  await page.waitForFunction(() => window.GML && GML.state.games.length > 40);
  await page.evaluate(() => document.fonts.ready);
}
export const show = (page, name) => page.evaluate((target) => GML.showPage(target), name);
export const openGame = (page, key) =>
  page.evaluate((target) => GML.openGamePage(GML.state.games.find((game) => game.key === target)), key);
