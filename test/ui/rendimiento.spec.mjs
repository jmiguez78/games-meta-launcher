// Biblioteca para miles (F6): con 2.000 juegos, cada tecla de la búsqueda redibuja en menos de 30 ms (acá se
// exige 60 ms para tolerar máquinas de integración continua más lentas) y las portadas se dibujan por lotes.
import { expect, openApp, show, test } from './helpers.mjs';

async function bigLibrary(page, size = 2000) {
  await page.evaluate((count) => {
    const base = GML.state.games;
    GML.state.games = Array.from({ length: count }, (_, index) => {
      const game = base[index % base.length];
      return { ...game, key: game.key + '-' + index, id: game.id + '-' + index, name: game.name + ' ' + index };
    });
  }, size);
}

test('con 2.000 juegos, buscar responde en menos de 60 ms por tecla', async ({ page }) => {
  await openApp(page);
  await bigLibrary(page);
  await show(page, 'library');
  const times = await page.evaluate(async () => {
    const { renderLibrary } = await import('/js/library.js');
    renderLibrary();
    const result = [];
    for (const query of ['a', 'am', 'amb', 'ambar 1', '']) {
      GML.state.query = query;
      const start = performance.now();
      renderLibrary();
      result.push(performance.now() - start);
    }
    return result;
  });
  expect(Math.max(...times)).toBeLessThan(60);
});

test('las portadas se dibujan por lotes al desplazarse', async ({ page }) => {
  await openApp(page);
  await bigLibrary(page, 600);
  await show(page, 'library');
  await page.evaluate(async () => (await import('/js/library.js')).renderLibrary());
  // Los duplicados entre tiendas se agrupan: se compara con lo que la Biblioteca tiene para mostrar.
  const total = await page.evaluate(async () => (await import('/js/library.js')).visibleEntries().length);
  const first = await page.locator('#library .tile').count();
  expect(first).toBeLessThan(total);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.locator('#library .tile').count()).toBeGreaterThan(first);
  // Fin lleva al último juego aunque todavía no estuviera dibujado.
  await page.locator('#library .tile').first().focus();
  await page.keyboard.press('End');
  await expect(page.locator('#library .tile')).toHaveCount(total);
  await expect(page.locator('#library .tile').last()).toBeFocused();
});
