// Cada pantalla abre sin errores, con su contenido principal y en español.
import { expect, openApp, openGame, show, test } from './helpers.mjs';

test('Inicio muestra la imagen principal y filas con juegos', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#hero-title')).not.toBeEmpty();
  await expect(page.locator('#home-shelves .poster').first()).toBeVisible();
  await expect(page.locator('#page-title')).toHaveText('Inicio');
});

test('la Biblioteca lista los juegos en portadas y en tabla', async ({ page }) => {
  await openApp(page);
  await show(page, 'library');
  await expect(page.locator('#counter')).toContainText('juegos');
  await expect(page.locator('#library .poster').first()).toBeVisible();
  await page.locator('#views button').last().click();
  await expect(page.locator('#library table')).toBeVisible();
  await expect(page.locator('#library tbody tr').first()).toBeVisible();
});

test('los filtros muestran géneros en español', async ({ page }) => {
  await openApp(page);
  await show(page, 'library');
  await page.click('#toggle-filters');
  const facets = page.locator('#facet-groups');
  await expect(facets).toContainText('Rol');
  await expect(facets).toContainText('Aventura');
  await expect(facets).not.toContainText('Role-playing');
});

test('la página de un juego muestra ficha, pestañas y datos traducidos', async ({ page }) => {
  await openApp(page);
  await openGame(page, 'steam:900000');
  await expect(page.locator('#game-title')).toHaveText('Ámbar');
  await expect(page.locator('#game-page')).toContainText('Rol');
  const tabs = page.locator('#game-page [role=tab]');
  await expect(tabs.first()).toBeVisible();
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
});

test('un juego de Arcade muestra su categoría en español', async ({ page }) => {
  await openApp(page);
  await openGame(page, 'arcade:nave');
  await expect(page.locator('#game-page')).toContainText('Disparos / Vuelo vertical');
});

test('Configuración y Para revisar abren sin errores', async ({ page }) => {
  await openApp(page);
  await show(page, 'settings');
  await expect(page.locator('#export-diagnostics')).toBeVisible();
  await show(page, 'diagnostics');
  await expect(page.locator('#health-summary')).not.toBeEmpty();
});
