// Recorridos completos: buscar, marcar favorito, paleta, modo sala, arranque instantáneo y diagnóstico.
import fs from 'node:fs';
import { expect, openApp, openGame, show, test } from './helpers.mjs';

test('buscar filtra la biblioteca y quitar la búsqueda la restaura', async ({ page }) => {
  await openApp(page);
  await show(page, 'library');
  const counter = page.locator('#counter');
  const before = await counter.textContent();
  await page.fill('#search', 'Glaciar II');
  await expect(page.locator('#library .poster')).toHaveCount(1);
  await page.fill('#search', '');
  await expect(counter).toHaveText(before);
});

test('marcar un favorito se guarda y sobrevive a recargar', async ({ page }) => {
  await openApp(page);
  await openGame(page, 'epic games:prueba1');
  const before = await page.evaluate(() => GML.state.games.find((g) => g.key === 'epic games:prueba1').favorite);
  await page.locator('#game-page [data-action=favorite]').click();
  await expect
    .poll(() => page.evaluate(() => GML.state.games.find((g) => g.key === 'epic games:prueba1').favorite))
    .toBe(!before);
  await openApp(page);
  expect(await page.evaluate(() => GML.state.games.find((g) => g.key === 'epic games:prueba1').favorite)).toBe(!before);
});

test('la paleta encuentra un juego y lo inicia', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('Control+k');
  await page.keyboard.type('Zafiro');
  await expect(page.locator('#palette [role=option]').first()).toContainText('Zafiro');
  // Elegir un juego en la paleta lo inicia.
  const [launch] = await Promise.all([page.waitForRequest(/\/api\/launch\//), page.keyboard.press('Enter')]);
  expect(decodeURIComponent(launch.url())).toContain('ubisoft:prueba23');
});

test('el modo sala se maneja con teclado y alterna instalados y todos', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => GMLGamepad.setBigScreen(true));
  const couch = page.locator('#couch');
  await expect(couch).toBeVisible();
  await expect(page.locator('.couch-scope-label')).toContainText('Listos para jugar');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('.couch-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.couch-sheet')).toBeHidden();
  await page.keyboard.press('v');
  await expect(page.locator('.couch-scope-label')).toContainText('Toda la colección');
  await page.keyboard.press('ContextMenu');
  await page.locator('.couch-menu .couch-action', { hasText: 'Salir del modo sala' }).click();
  await expect(couch).toBeHidden();
});

test('al volver a abrir, la biblioteca aparece antes de que responda el servidor', async ({ page }) => {
  await openApp(page);
  await page.waitForTimeout(800);
  await page.route('**/api/library', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.continue();
  });
  await page.reload();
  await page.waitForFunction(() => window.GML && GML.state.games.length > 40, null, { timeout: 2500 });
  await expect(page.locator('#home-shelves .poster').first()).toBeVisible({ timeout: 2500 });
  await page.unroute('**/api/library');
});

test('exportar el diagnóstico descarga un archivo sin datos personales', async ({ page }) => {
  await openApp(page);
  await show(page, 'settings');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-diagnostics')]);
  expect(download.suggestedFilename()).toMatch(/^games-meta-launcher-diagnostico-\d{4}-\d\d-\d\d\.json$/);
  const report = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(report.library.total).toBe(54);
  expect(report.files.find((file) => file.name === 'preferences.json').schema).toBe(1);
  expect(JSON.stringify(report)).not.toMatch(/"(apiKey|clientSecret|secret)"\s*:/);
});

test('Configuración avisa una versión nueva y ofrece ver las novedades', async ({ page }) => {
  await page.route('**/api/updates*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        enabled: true,
        current: '0.29.0',
        available: true,
        latest: '0.30.0',
        newer: true,
        url: 'https://github.com/x/y/releases/tag/v0.30.0'
      })
    })
  );
  await openApp(page);
  await show(page, 'settings');
  await expect(page.locator('#update-status')).toHaveText('Versión 0.29.0. Hay una versión nueva: 0.30.0.');
  await expect(page.locator('#check-updates')).toHaveText('Ver novedades');
});
