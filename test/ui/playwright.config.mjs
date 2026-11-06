// Pruebas de interfaz con Playwright: pantallas, flujos, accesibilidad y capturas de referencia.
// El servidor se levanta con una biblioteca inventada (fixture.mjs) y sin descargas (GML_OFFLINE).
import { defineConfig } from '@playwright/test';

const PORT = 4390;
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  outputDir: '.resultados',
  snapshotPathTemplate: '{testDir}/capturas/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // En GitHub, «github» deja cada falla como anotación del trabajo (visible sin descargar el registro).
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never', outputFolder: '.informe' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1440, height: 900 },
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    colorScheme: 'dark',
    trace: 'retain-on-failure'
  },
  expect: {
    timeout: 8000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' }
  },
  webServer: {
    command: 'node test/ui/fixture.mjs test/ui/.data && node src/server.mjs',
    cwd: '../..',
    url: `http://127.0.0.1:${PORT}/api/health`,
    env: {
      PORT: String(PORT),
      GML_DATA_DIR: 'test/ui/.data',
      GML_OFFLINE: '1',
      // Capturas propias inventadas (fixture.mjs): nunca se leen las carpetas reales de Steam ni de Videos.
      GML_STEAM_DIR: 'test/ui/.data/Steam',
      GML_VIDEOS_DIR: 'test/ui/.data/Videos',
      GML_CAPTURES_DIR: 'test/ui/.data/Videos/Captures'
    },
    reuseExistingServer: false,
    timeout: 30000
  }
});
