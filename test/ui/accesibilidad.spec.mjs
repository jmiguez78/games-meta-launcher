// Auditoría automática de accesibilidad (WCAG 2.1 AA, incluido el contraste) en las pantallas principales.
import AxeBuilder from '@axe-core/playwright';
import { expect, openApp, openGame, show, test } from './helpers.mjs';

async function audit(page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = result.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
  return serious.map((item) => `${item.id}: ${item.nodes.length} elementos (${item.nodes[0]?.target.join(' ')})`);
}

for (const theme of ['dark', 'light']) {
  test.describe(`tema ${theme === 'dark' ? 'oscuro' : 'claro'}`, () => {
    test.use({ colorScheme: theme });
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/settings', (route) =>
        route.request().method() === 'GET'
          ? route.fulfill({ contentType: 'application/json', body: JSON.stringify({ theme, minimizeOnLaunch: false }) })
          : route.continue()
      );
    });
    test('Inicio', async ({ page }) => {
      await openApp(page);
      expect(await audit(page)).toEqual([]);
    });
    test('Biblioteca con filtros', async ({ page }) => {
      await openApp(page);
      await show(page, 'library');
      await page.click('#toggle-filters');
      expect(await audit(page)).toEqual([]);
    });
    test('página del juego', async ({ page }) => {
      await openApp(page);
      await openGame(page, 'steam:900000');
      expect(await audit(page)).toEqual([]);
    });
    test('Configuración', async ({ page }) => {
      await openApp(page);
      await show(page, 'settings');
      expect(await audit(page)).toEqual([]);
    });
    test('Tu actividad', async ({ page }) => {
      await openApp(page);
      await show(page, 'activity');
      await page.waitForSelector('#activity-recent li');
      expect(await audit(page)).toEqual([]);
    });
    test('Primeros pasos y listas', async ({ page }) => {
      await page.route('**/api/onboarding', async (route) => {
        const response = await route.fetch();
        await route.fulfill({ response, json: { ...(await response.json()), dismissed: false } });
      });
      await openApp(page);
      await page.waitForSelector('#onboarding:not([hidden]) .onboarding-step');
      expect(await audit(page)).toEqual([]);
      await show(page, 'library');
      await page.click('#open-lists');
      expect(await audit(page)).toEqual([]);
    });
    test('error al cargar la biblioteca', async ({ page }) => {
      await page.route('**/api/library', (route) =>
        route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Falla de prueba."}' })
      );
      await page.goto('/');
      await show(page, 'library');
      await page.waitForSelector('#library-state:not(.hidden)');
      expect(await audit(page)).toEqual([]);
    });
  });
}
