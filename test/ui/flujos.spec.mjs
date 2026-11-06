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

test('listas propias: crear desde un juego, verla en Inicio y en la Biblioteca, y una automática', async ({ page }) => {
  await openApp(page);
  await openGame(page, 'steam:900000');
  await page.locator('#game-aside [data-action=lists]').click();
  const picker = page.locator('#list-picker');
  await expect(picker).toBeVisible();
  await picker.locator('#list-picker-name').fill('Para el finde');
  await picker.getByRole('button', { name: 'Crear y agregar' }).click();
  await expect(picker.getByRole('checkbox', { name: 'Para el finde' })).toBeChecked();
  await picker.getByRole('button', { name: 'Cerrar' }).click();

  await show(page, 'home');
  const shelf = page.locator('.shelf', { has: page.getByRole('heading', { name: 'Para el finde' }) });
  await expect(shelf.locator('.tile')).toHaveCount(1);
  await shelf.getByRole('button', { name: 'Ver toda la lista Para el finde' }).click();
  await expect(page.locator('#library .tile')).toHaveCount(1);
  await expect(page.locator('#active-filters')).toContainText('Lista: Para el finde');

  // Una idea de lista automática: los arcades para dos jugadores.
  await page.locator('#open-lists').click();
  await page.locator('#list-ideas').getByRole('button', { name: 'Arcade de a dos' }).click();
  await expect(page.locator('#lists-manage .list-row')).toHaveCount(2);
  await expect(page.locator('#lists-manage')).toContainText('Automática · 6 juegos');
  // Borrar las dos (y deshacer una) deja el resto de las pruebas como estaba.
  await page.getByRole('button', { name: 'Borrar «Arcade de a dos»' }).click();
  await expect(page.locator('#lists-manage .list-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Borrar «Para el finde»' }).click();
  await expect(page.locator('#lists-empty')).toBeVisible();
  await page.locator('#lists-dialog').getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.locator('#active-filters')).not.toContainText('Lista:');
});

test('tus capturas y videos: en la ficha del juego, en el visor y en Inicio', async ({ page }) => {
  await openApp(page);
  const shelf = page.locator('#home-captures');
  await expect(shelf).toBeVisible();
  await expect(shelf.locator('.capture-thumbnail')).toHaveCount(4);
  await openGame(page, 'steam:900000');
  await page.locator('#game-page [role=tab]', { hasText: 'Tus capturas' }).click();
  const panel = page.locator('#game-page [role=tabpanel]:not([hidden])');
  await expect(panel.locator('.capture-summary')).toContainText('4 capturas y 1 video');
  await expect(panel.locator('.capture-summary')).toContainText('Xbox Game Bar y Steam');
  await expect(panel.locator('.capture-thumbnail')).toHaveCount(5);
  // El video va primero (es el más nuevo), con su duración sobre la miniatura.
  const clip = panel.locator('.capture-thumbnail.is-video');
  await expect(clip.locator('.capture-badge')).toHaveText('0:02');
  await clip.click();
  const viewer = page.locator('#media-viewer');
  await expect(viewer.locator('video')).toBeVisible();
  await expect(viewer.locator('img')).toBeHidden();
  await expect(viewer.locator('.media-position')).toHaveText('1 / 5');
  await viewer.locator('[data-gallery=next]').click();
  await expect(viewer.locator('img')).toBeVisible();
  await expect(viewer.locator('video')).toBeHidden();
  await expect(viewer.locator('[data-gallery=folder]')).toBeVisible();
  await page.keyboard.press('Escape');
  // Un juego sin capturas explica cómo sacarlas.
  await openGame(page, 'steam:900006');
  await page.locator('#game-page [role=tab]', { hasText: 'Tus capturas' }).click();
  await expect(page.locator('#game-page [role=tabpanel]:not([hidden]) .capture-summary')).toContainText('F12');
});
