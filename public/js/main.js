// Punto de entrada: navegación entre páginas, carga de la biblioteca y atajos globales.
import { setup as setupFeedback } from './feedback.js';
import { setup as setupLibrary } from './library.js';
import { setup as setupHome } from './home.js';
import { setup as setupGamePage } from './game-page.js';
import { setup as setupLaunch } from './launch.js';
import { setup as setupSettings } from './settings.js';
import { setup as setupPalette } from './palette.js';
import { setup as setupEditor } from './editor.js';
import { setup as setupCouch } from './couch.js';
import { request } from './api.js';
import { readSnapshot, saveSnapshot } from './snapshot.js';
import { report, setup as setupReport } from './report.js';
import { setAmbient } from './art.js';
import { posterCache } from './cards.js';
import { loadHealth } from './diagnostics.js';
import { notify } from './feedback.js';
import { closeGamePage, openGamePage } from './game-page.js';
import { heroGame, renderHealthSignals, renderHome } from './home.js';
import { hydrateIcons } from './icons.js';
import { hideLaunchOverlay, launchOverlay } from './launch.js';
import { renderFilters, renderLibrary, setFiltersOpen } from './library.js';
import { openPalette, palette } from './palette.js';
import { loadIgdb, loadMame, loadSchedule, loadSettings } from './settings.js';
import { state } from './state.js';
import { initializeSteamUI, loadSteamSettings } from './steam.js';

// Título de cada página y palabras con las que la paleta de comandos la encuentra.
export const pageMeta = {
  home: ['Inicio', 'inicio para jugar ahora'],
  library: ['Biblioteca', 'biblioteca colección juegos'],
  diagnostics: ['Estado de la biblioteca', 'diagnóstico estado sistema revisión plataformas'],
  settings: ['Configuración', 'configuración preferencias ajustes'],
  game: ['Juego', '']
};

export function showPage(page, { focus = true } = {}) {
  state.page = page;
  Object.keys(pageMeta).forEach((name) =>
    document.querySelector('#' + name + '-page').classList.toggle('hidden', name !== page)
  );
  document.querySelectorAll('.nav-item[data-page]').forEach((button) => {
    const current = button.dataset.page === page;
    button.classList.toggle('active', current);
    if (current) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#page-title').textContent = pageMeta[page][0];
  document.body.dataset.page = page;
  renderHealthSignals();
  if (page === 'home') setAmbient(heroGame()?.game);
  if (page === 'diagnostics') loadHealth();
  if (page === 'settings') {
    document.querySelector('#big-screen').checked = document.body.classList.contains('couch');
    loadSchedule();
    loadIgdb();
    loadMame();
    loadSteamSettings();
  }
  if (page === 'library' && focus) document.querySelector('#search').focus();
}

// Texto de la última biblioteca aplicada: si la respuesta nueva es idéntica, no se redibuja nada.
let shownText = null;
function applyCatalog(text) {
  const catalog = JSON.parse(text);
  state.games = catalog.games;
  posterCache.clear();
  state.generatedAt = catalog.generatedAt;
  shownText = text;
  renderSyncStatus();
}
function renderAll() {
  renderHome();
  renderFilters();
  renderLibrary();
  window.dispatchEvent(new Event('gml-library'));
}

// Al abrir, se pinta la última biblioteca guardada (arranque instantáneo) y se pide la actual en paralelo.
export async function load() {
  const firstLoad = !state.games.length;
  const pending = fetch('/api/library').then(async (response) => {
    const text = await response.text();
    if (!response.ok) throw new Error(JSON.parse(text).error || 'No se pudo cargar la biblioteca.');
    return text;
  });
  if (firstLoad) {
    const saved = await readSnapshot();
    if (saved) {
      try {
        applyCatalog(saved);
        renderAll();
      } catch {
        shownText = null;
      }
    }
  }
  Object.assign(state, { loading: !state.games.length, loadError: '' });
  if (state.loading) renderLibrary();
  try {
    const text = await pending;
    if (text === shownText) return;
    applyCatalog(text);
    saveSnapshot(text);
  } catch (error) {
    if (!state.games.length)
      state.loadError = error.message || 'Revisá que la aplicación siga abierta y volvé a intentarlo.';
    else report('warn', 'No se pudo actualizar la biblioteca: ' + error.message);
  } finally {
    state.loading = false;
  }
  renderAll();
}

// Estado de la última búsqueda de juegos, en palabras relativas y al pie de la barra lateral.
export function renderSyncStatus() {
  const status = document.querySelector('#last-update');
  status.textContent = state.generatedAt
    ? 'Biblioteca actualizada ' + GMLShelves.relativeTime(state.generatedAt)
    : 'Todavía no se buscaron juegos.';
  if (state.generatedAt) status.title = new Date(state.generatedAt).toLocaleString('es-AR');
}

// Compatibilidad con los scripts clásicos (gamepad.js usa notify) y depuración desde la consola.
window.notify = notify;
window.GML = { state, openGamePage, showPage, load };
setupReport();
setupFeedback();
setupLibrary();
setupHome();
setupGamePage();
setupLaunch();
setupSettings();
setupPalette();
setupEditor();
setupCouch();
document
  .querySelectorAll('.nav-item[data-page]')
  .forEach((button) => (button.onclick = () => showPage(button.dataset.page)));

setInterval(renderSyncStatus, 60000);

document.querySelector('#refresh').onclick = async (event) => {
  // currentTarget deja de existir después del primer await; se guarda el botón antes.
  const button = event.currentTarget;
  button.disabled = true;
  button.classList.add('busy');
  document.querySelector('#last-update').textContent = 'Buscando juegos…';
  const notice = notify('Buscando juegos instalados…', { type: 'loading' });
  try {
    await request('/api/scan', { method: 'POST' });
    await load();
    notice.update('Inventario actualizado: ' + state.games.length + ' juegos.', { type: 'success' });
  } catch (error) {
    notice.update(error.message, {
      type: 'error',
      action: { label: 'Reintentar', run: () => document.querySelector('#refresh').click() }
    });
  } finally {
    button.disabled = false;
    button.classList.remove('busy');
    renderSyncStatus();
  }
};

document.querySelector('#open-diagnostics').onclick = () => showPage('diagnostics');

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (palette.open) palette.close();
    else openPalette();
  }
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    showPage('library');
  }
  if (event.key === 'Escape' && state.page === 'library' && !document.querySelector('dialog[open]'))
    setFiltersOpen(false);
  if (event.key === 'Escape' && !launchOverlay.hidden) {
    hideLaunchOverlay();
    return;
  }
  if (event.key === 'Escape' && state.page === 'game' && !document.querySelector('dialog[open]')) closeGamePage();
});

hydrateIcons(document);

initializeSteamUI();

loadSettings();

load();
