import { app, BrowserWindow, nativeTheme, session, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// Puerto fijo para que la interfaz conserve lo que recuerda (vista, colección, la última biblioteca) entre
// aperturas: el almacenamiento del navegador depende del origen. Si estuviera ocupado, se usa uno libre.
const PREFERRED_PORT = 47321;

let server;
let window;
const scanMode = process.argv.includes('--scan');

async function runScan() {
  process.env.GML_DATA_DIR = app.getPath('userData');
  const { log } = await import('./log.mjs');
  log('info', 'tarea', 'Indexación programada: inicio');
  const { scanLibrary } = await import('./indexer.mjs');
  try {
    const scanned = await scanLibrary();
    log('info', 'tarea', `Indexación programada: ${scanned.games.length} juegos`);
  } catch (error) {
    log('error', 'tarea', `Indexación programada: ${error.message}`, error.stack);
  }
  const { createSteam } = await import('./steam.mjs');
  const steam = createSteam(app.getPath('userData'));
  try {
    if ((await steam.settings()).configured) await steam.sync();
  } catch (error) {
    log('warn', 'tarea', `Steam: ${error.message}`);
  }
  steam.close();
  try {
    const { createArcade } = await import('./mame.mjs');
    const arcade = createArcade(app.getPath('userData'));
    if ((await arcade.settings()).exe) await arcade.refresh();
  } catch (error) {
    log('warn', 'tarea', `Arcade: ${error.message}`);
  }
  const { flushLog } = await import('./log.mjs');
  await flushLog();
  app.quit();
}

function listen(start, port) {
  return new Promise((resolve, reject) => {
    const instance = start(port, { ...callbacks });
    instance.once('listening', () => resolve(instance));
    instance.once('error', (error) => {
      if (port !== 0 && error.code === 'EADDRINUSE') resolve(listen(start, 0));
      else reject(error);
    });
  });
}
// Al iniciar un juego, la ventana se minimiza para que el juego quede adelante (se puede desactivar).
// Al cerrar un juego que el launcher abrió (Arcade), la ventana vuelve al frente.
function bringBack() {
  if (!window || window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}
const callbacks = {
  onLaunch: () => window?.minimize(),
  onGameExit: () => {
    bringBack();
    window?.webContents.executeJavaScript("window.dispatchEvent(new Event('gml-game-exit'))").catch(() => {});
  }
};

async function openWindow() {
  process.env.GML_DATA_DIR = app.getPath('userData');
  const { startServer, appSettings } = await import('./server.mjs');
  const { log } = await import('./log.mjs');
  // El tema elegido también gobierna la barra de título y prefers-color-scheme de la ventana.
  const applyTheme = ({ theme }) => {
    nativeTheme.themeSource = theme;
  };
  callbacks.onSettingsChange = applyTheme;
  applyTheme(await appSettings());
  server = await listen(startServer, PREFERRED_PORT);
  const origin = `http://127.0.0.1:${server.address().port}`;
  log('info', 'app', `Inicio de la versión ${app.getVersion()} en ${origin}`);

  // Permisos: sólo pantalla completa (modo sala). Cámara, micrófono, ubicación o notificaciones, nunca.
  session.defaultSession.setPermissionRequestHandler((_contents, permission, done) =>
    done(permission === 'fullscreen')
  );
  session.defaultSession.setPermissionCheckHandler((_contents, permission) => permission === 'fullscreen');

  window = new BrowserWindow({
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
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      navigateOnDragDrop: false,
      spellcheck: false
    }
  });
  window.once('ready-to-show', () => window.show());
  // La ventana nunca sale de la interfaz: los enlaces https se abren en el navegador y el resto se bloquea.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(origin + '/')) return;
    event.preventDefault();
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.on('render-process-gone', (_event, details) =>
    log('error', 'app', `La interfaz se cerró inesperadamente: ${details.reason}`)
  );
  await window.loadURL(origin);
}

if (scanMode) {
  app.whenReady().then(runScan);
} else if (!app.requestSingleInstanceLock()) {
  // Ya hay una ventana abierta: esa pasa al frente (second-instance) y esta termina.
  app.quit();
} else {
  app.on('second-instance', bringBack);
  app.whenReady().then(openWindow);
  app.on('window-all-closed', () => {
    server?.close();
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow();
  });
}
process.on('uncaughtException', async (error) => {
  try {
    const { log } = await import('./log.mjs');
    log('error', 'app', `Error no controlado: ${error.message}`, error.stack);
  } catch {}
});
process.on('unhandledRejection', async (reason) => {
  try {
    const { log } = await import('./log.mjs');
    log('error', 'app', `Promesa rechazada sin manejar: ${reason?.message ?? reason}`, reason?.stack);
  } catch {}
});
