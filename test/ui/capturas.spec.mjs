// Capturas de referencia: un cambio de estilos que altere una pantalla hace fallar la prueba.
// Para aceptar un cambio visual a propósito: npm run test:ui -- --update-snapshots
import { expect, openApp, openGame, show, test } from './helpers.mjs';

const stable = async (page) => {
  await page.mouse.move(1430, 890);
  await page.evaluate(() => document.querySelectorAll('#toasts > *').forEach((toast) => toast.remove()));
  // Playwright desplaza la página para hacer clic; las capturas se toman siempre desde arriba.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
};

test('Inicio', async ({ page }) => {
  await openApp(page);
  await stable(page);
  await expect(page).toHaveScreenshot('inicio.png');
});

test('Biblioteca', async ({ page }) => {
  await openApp(page);
  await show(page, 'library');
  await page.locator('#search').blur();
  await stable(page);
  await expect(page).toHaveScreenshot('biblioteca.png');
});

test('Biblioteca en tabla con filtros', async ({ page }) => {
  await openApp(page);
  await show(page, 'library');
  await page.locator('#views button').last().click();
  await page.click('#toggle-filters');
  await stable(page);
  await expect(page).toHaveScreenshot('biblioteca-tabla.png');
});

test('página del juego', async ({ page }) => {
  await openApp(page);
  await openGame(page, 'steam:900000');
  await stable(page);
  await expect(page).toHaveScreenshot('juego.png');
});

test('Configuración', async ({ page }) => {
  await openApp(page);
  await show(page, 'settings');
  await stable(page);
  // La versión cambia en cada publicación: se tapa.
  await expect(page).toHaveScreenshot('configuracion.png', { fullPage: true, mask: [page.locator('#update-status')] });
});

test('modo sala', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => GMLGamepad.setBigScreen(true));
  await page.evaluate(() =>
    document.querySelectorAll('.couch-clock').forEach((clock) => (clock.textContent = '18:00'))
  );
  await stable(page);
  await expect(page).toHaveScreenshot('sala.png');
});

test('Inicio en tema claro', async ({ page }) => {
  await page.route('**/api/settings', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ contentType: 'application/json', body: '{"theme":"light","minimizeOnLaunch":false}' })
      : route.continue()
  );
  await openApp(page);
  await stable(page);
  await expect(page).toHaveScreenshot('inicio-claro.png');
});

test('Tu actividad', async ({ page }) => {
  await openApp(page);
  await show(page, 'activity');
  await page.waitForSelector('#activity-recent li');
  await stable(page);
  await expect(page).toHaveScreenshot('actividad.png', { fullPage: true });
});

test('Inicio con primeros pasos', async ({ page }) => {
  await page.route('**/api/onboarding', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), dismissed: false } });
  });
  await openApp(page);
  await page.waitForSelector('#onboarding:not([hidden]) .onboarding-step');
  await page.locator('#onboarding').scrollIntoViewIfNeeded();
  await stable(page);
  await expect(page.locator('#onboarding')).toHaveScreenshot('primeros-pasos.png');
});

// Tema claro y estados de error (F10).
const lightTheme = (page) =>
  page.route('**/api/settings', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ contentType: 'application/json', body: '{"theme":"light","minimizeOnLaunch":false}' })
      : route.continue()
  );

test('Tu actividad en tema claro', async ({ page }) => {
  await lightTheme(page);
  await openApp(page);
  await show(page, 'activity');
  await page.waitForSelector('#activity-recent li');
  await stable(page);
  await expect(page).toHaveScreenshot('actividad-claro.png');
});

test('Inicio cuando la biblioteca no carga', async ({ page }) => {
  await lightTheme(page);
  await page.route('**/api/library', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"No se pudo leer el inventario."}' })
  );
  await page.goto('/');
  await page.waitForSelector('#home-empty.error');
  await page.evaluate(() => document.fonts.ready);
  await stable(page);
  await expect(page).toHaveScreenshot('inicio-error.png');
});

test('Biblioteca vacía', async ({ page }) => {
  await page.route('**/api/library', (route) =>
    route.fulfill({ contentType: 'application/json', body: '{"schema":2,"games":[],"lists":[]}' })
  );
  await page.goto('/');
  await show(page, 'library');
  await page.locator('#search').blur();
  await page.evaluate(() => document.fonts.ready);
  await stable(page);
  await expect(page).toHaveScreenshot('biblioteca-vacia.png');
});
