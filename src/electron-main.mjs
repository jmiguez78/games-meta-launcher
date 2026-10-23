import { app, BrowserWindow, shell } from 'electron';

let server;
async function runScan() {
  process.env.GML_DATA_DIR = app.getPath('userData');
  const { scanLibrary } = await import('./indexer.mjs');
  await scanLibrary();
  app.quit();
}
async function openWindow() {
  process.env.GML_DATA_DIR = app.getPath('userData');
  const { startServer } = await import('./server.mjs');
  server = startServer(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  const window = new BrowserWindow({
    width: 1360, height: 900, minWidth: 920, minHeight: 650,
    title: 'Games Meta Launcher', backgroundColor: '#eef1f6', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  await window.loadURL(`http://127.0.0.1:${port}`);
  window.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}
app.whenReady().then(() => process.argv.includes('--scan') ? runScan() : openWindow());
app.on('window-all-closed', () => { server?.close(); if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) openWindow(); });
