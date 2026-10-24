import { app, BrowserWindow, nativeTheme, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let server;
async function runScan() {
  process.env.GML_DATA_DIR = app.getPath('userData');
  const { scanLibrary } = await import('./indexer.mjs');
  await scanLibrary();
  const { createSteam } = await import('./steam.mjs');
  const steam = createSteam(app.getPath('userData'));
  try {
    if ((await steam.settings()).configured) await steam.sync();
  } catch {}
  steam.close();
  app.quit();
}
async function openWindow() {
  process.env.GML_DATA_DIR = app.getPath('userData');
  const { startServer, appSettings } = await import('./server.mjs');
  // El tema elegido también gobierna la barra de título y prefers-color-scheme de la ventana.
  const applyTheme = ({ theme }) => {
    nativeTheme.themeSource = theme;
  };
  applyTheme(await appSettings());
  server = startServer(0, { onSettingsChange: applyTheme });
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 920,
    minHeight: 650,
    title: 'Games Meta Launcher',
    icon: path.join(root, 'public', 'brand', 'icon-256.png'),
    // La ventana se muestra recién cuando la interfaz pintó su primer cuadro, con el fondo del tema:
    // así no hay un destello blanco al abrir.
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#07080c' : '#f4f5f8',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  window.once('ready-to-show', () => window.show());
  await window.loadURL(`http://127.0.0.1:${port}`);
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}
app.whenReady().then(() => (process.argv.includes('--scan') ? runScan() : openWindow()));
app.on('window-all-closed', () => {
  server?.close();
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) openWindow();
});
