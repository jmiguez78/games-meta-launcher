// Modo sala: una experiencia propia para la TV y el mando, no la interfaz de escritorio agrandada.
// Pantalla completa con el arte del juego enfocado de fondo, filas grandes que se desplazan solas para que el
// juego elegido quede siempre a la vista, una ficha con Jugar adelante y un menú con el botón Menú.
// Se maneja con cuatro direcciones y cuatro botones; el teclado y el mouse siguen funcionando.
import { state } from './state.js';
import { applyCover, coverInfo, paintBackdrop, pruneCoverLoads, showWordmark } from './art.js';
import { posterAction } from './cards.js';
import { playGame } from './launch.js';
import { uniqueGames } from './library.js';

const HIDE_CURSOR_MS = 2500;
const ROW_SIZE = 7;
const SCOPE_KEY = 'gml-couch-scope';
let root = null;
// «ready»: solo lo que se puede lanzar ya (instalado y con lanzador). «all»: toda la colección, con lo listo
// primero. El modo sala arranca en «ready» porque su idea es elegir y jugar.
let scope = readScope();
let section = 'home';
let rows = [];
let focus = { row: 0, col: 0 };
const columns = new Map(); // columna recordada por fila
let layer = null; // 'sheet' | 'menu' | null
let layerIndex = 0;
let sheetGame = null;
let infoTimer;
let backdropTimer;
let cursorTimer;
let clockTimer;

function readScope() {
  try {
    return localStorage.getItem(SCOPE_KEY) === 'all' ? 'all' : 'ready';
  } catch {
    return 'ready';
  }
}
const ready = (game) => GMLShelves.playable(game);

export const isCouch = () => document.body.classList.contains('couch');

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function build() {
  root = element('div', 'couch');
  root.id = 'couch';
  root.setAttribute('role', 'application');
  root.setAttribute('aria-label', 'Modo sala');
  root.innerHTML =
    '<div class="hero-backdrop couch-backdrop" aria-hidden="true"></div><div class="couch-shade" aria-hidden="true"></div>' +
    '<header class="couch-top"><img class="couch-mark" src="/brand/mark.svg" alt="" />' +
    '<div class="couch-tabs" role="tablist" aria-label="Secciones"></div>' +
    '<button type="button" class="couch-scope" tabindex="-1"><span class="pad-glyph view">⧉</span><span class="couch-scope-label"></span></button>' +
    '<span class="couch-clock" aria-hidden="true"></span></header>' +
    '<section class="couch-info" aria-live="polite"><p class="couch-reason"></p><img class="couch-logo" alt="" hidden />' +
    '<h2 class="couch-title"></h2><p class="couch-facts"></p></section>' +
    '<div class="couch-viewport"><div class="couch-rows"></div></div>' +
    '<footer class="couch-hints" aria-hidden="true"></footer>' +
    '<div class="couch-sheet" role="dialog" aria-modal="true" hidden></div>' +
    '<div class="couch-menu" role="dialog" aria-modal="true" aria-label="Menú del modo sala" hidden></div>';
  const tabs = root.querySelector('.couch-tabs');
  [
    ['home', 'Inicio'],
    ['library', 'Biblioteca']
  ].forEach(([id, label]) => {
    const tab = element('button', 'couch-tab', label);
    tab.type = 'button';
    tab.tabIndex = -1;
    tab.dataset.section = id;
    tab.setAttribute('role', 'tab');
    tab.onclick = () => showSection(id);
    tabs.append(tab);
  });
  root.querySelector('.couch-scope').onclick = toggleScope;
  root.querySelector('.couch-hints').innerHTML = [
    ['a', 'A', 'Elegir'],
    ['b', 'B', 'Volver'],
    ['x', 'X', 'Favorito'],
    ['y', 'Y', 'Saltar de letra'],
    ['bumper', 'LB RB', 'Sección'],
    ['view', '⧉', 'Instalados / Todos'],
    ['menu', '≡', 'Menú']
  ]
    .map(
      ([kind, glyph, label]) =>
        '<span class="couch-hint"><span class="pad-glyph ' + kind + '">' + glyph + '</span>' + label + '</span>'
    )
    .join('');
  // Mouse: pasar por encima enfoca, un clic elige. El puntero se esconde si no se mueve.
  root.addEventListener('pointermove', () => {
    root.classList.remove('couch-idle');
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => root.classList.add('couch-idle'), HIDE_CURSOR_MS);
  });
  root.addEventListener('pointerover', (event) => {
    const tile = event.target.closest('.couch-tile');
    if (tile && !layer) moveTo(Number(tile.dataset.row), Number(tile.dataset.col), false);
  });
  root.addEventListener('click', (event) => {
    const tile = event.target.closest('.couch-tile');
    if (tile && !layer) openSheet(gameAt(Number(tile.dataset.row), Number(tile.dataset.col)));
  });
  document.body.append(root);
}

// ---------- Filas ----------
function buildRows() {
  const all = uniqueGames();
  const games = all.filter(ready);
  if (section === 'library') {
    const rows = GMLShelves.libraryRows(games, ROW_SIZE);
    if (scope === 'ready') return rows;
    // Toda la colección: primero lo que se lanza ya, después lo que falta instalar, también por letra.
    const pending = GMLShelves.libraryRows(
      all.filter((game) => !ready(game)),
      ROW_SIZE
    ).map((row) => ({ ...row, letter: 'pend-' + row.letter, title: row.title && 'Sin instalar · ' + row.title }));
    return rows.concat(pending);
  }
  if (scope === 'all') return homeRows(all);
  return homeRows(games);
}
function homeRows(games) {
  const picks = GMLShelves.heroCandidates(games);
  // Lo que ya está en Destacados no se repite en las filas de abajo.
  const shelves = GMLShelves.homeShelves(games, { exclude: picks.map((pick) => pick.game.key) }).filter(
    (shelf) => shelf.games.length
  );
  const result = [];
  if (picks.length) result.push({ id: 'featured', title: 'Destacados', games: picks.map((pick) => pick.game) });
  return result.concat(shelves.map((shelf) => ({ id: shelf.id, title: shelf.title, games: shelf.games })));
}
const gameAt = (row, col) => rows[row]?.games[col];

function renderRows() {
  rows = buildRows();
  const host = root.querySelector('.couch-rows');
  host.replaceChildren();
  root.querySelectorAll('.couch-tab').forEach((tab) => {
    const active = tab.dataset.section === section;
    tab.setAttribute('aria-selected', String(active));
    tab.classList.toggle('active', active);
  });
  const all = uniqueGames();
  const readyCount = all.filter(ready).length;
  const format = (value) => new Intl.NumberFormat('es-AR').format(value);
  root.querySelector('.couch-scope-label').textContent =
    scope === 'ready' ? 'Listos para jugar · ' + format(readyCount) : 'Toda la colección · ' + format(all.length);
  root.querySelector('.couch-scope').classList.toggle('all', scope === 'all');
  if (!rows.length) {
    host.append(
      element(
        'p',
        'couch-empty',
        all.length
          ? 'No hay juegos instalados listos para lanzar. Pulsá ⧉ (o la tecla V) para ver toda la colección.'
          : 'Todavía no hay juegos. Salí del modo sala y buscá juegos nuevos.'
      )
    );
    root.querySelector('.couch-info').hidden = true;
    return;
  }
  root.querySelector('.couch-info').hidden = false;
  rows.forEach((row, rowIndex) => {
    const block = element('section', 'couch-row' + (row.title ? '' : ' continued'));
    block.dataset.row = rowIndex;
    if (row.title) block.append(element('h3', 'couch-row-title', row.title));
    const track = element('div', 'couch-track');
    row.games.forEach((game, colIndex) => {
      const tile = element('button', 'couch-tile' + (ready(game) ? '' : ' not-ready'));
      tile.type = 'button';
      tile.tabIndex = -1;
      tile.dataset.row = rowIndex;
      tile.dataset.col = colIndex;
      tile.dataset.key = game.key;
      tile.setAttribute('aria-label', game.name + ', ' + game.platform);
      const art = element('span', 'couch-art ' + coverInfo(game).palette);
      art.append(element('span', 'cover-initial'));
      if (game.favorite) art.append(element('span', 'couch-star', '★'));
      if (!ready(game))
        art.append(element('span', 'couch-badge', game.installed === false ? 'Sin instalar' : 'No disponible'));
      tile.append(art, element('span', 'couch-tile-name', game.name));
      applyCover(art, game, coverInfo(game));
      track.append(tile);
    });
    block.append(track);
    host.append(block);
  });
  pruneCoverLoads();
  focus.row = Math.min(focus.row, rows.length - 1);
  focus.col = Math.min(focus.col, rows[focus.row].games.length - 1);
  moveTo(focus.row, focus.col, true);
}

// Lleva el foco a una fila y columna: la fila enfocada sube a su lugar fijo y el riel se corre para que el
// juego quede a la vista. El fondo y los datos cambian después de una pausa breve, para no parpadear al recorrer.
function moveTo(row, col, immediate) {
  if (!rows.length) return;
  row = Math.max(0, Math.min(rows.length - 1, row));
  col = Math.max(0, Math.min(rows[row].games.length - 1, col));
  focus = { row, col };
  columns.set(row, col);
  const host = root.querySelector('.couch-rows');
  const rowEl = host.querySelector('.couch-row[data-row="' + row + '"]');
  host.style.transform = 'translateY(' + -rowEl.offsetTop + 'px)';
  host.querySelectorAll('.couch-row').forEach((item) => item.classList.toggle('current', item === rowEl));
  const track = rowEl.querySelector('.couch-track');
  const tile = track.children[col];
  const step = tile.offsetWidth + parseFloat(getComputedStyle(track).columnGap || '0');
  track.style.transform = 'translateX(' + -Math.max(0, col - 1) * step + 'px)';
  tile.focus({ preventScroll: true });
  const game = rows[row].games[col];
  clearTimeout(infoTimer);
  clearTimeout(backdropTimer);
  const update = () => showInfo(game, rows[row]);
  if (immediate) update();
  else infoTimer = setTimeout(update, 90);
  backdropTimer = setTimeout(() => paintBackdrop(root, game), immediate ? 0 : 260);
}

const reasons = {
  recent: 'Seguí donde lo dejaste',
  favorite: 'Uno de tus favoritos',
  rated: 'Muy bien valorado',
  ready: 'Listo para jugar'
};
function facts(game) {
  const played = GMLShelves.lastPlayed(game);
  const hours = GMLShelves.playedHours(game);
  return [
    game.arcade ? [game.meta?.developers?.[0], game.arcade.year].filter(Boolean).join(' · ') : game.platform,
    played ? 'Última vez: ' + GMLShelves.relativeDay(new Date(played).toISOString()).toLowerCase() : 'Sin estrenar',
    GMLShelves.hours(hours) ? GMLShelves.hours(hours) + ' jugadas' : '',
    game.meta?.rating ? 'Crítica ' + game.meta.rating : ''
  ]
    .filter(Boolean)
    .join('  ·  ');
}
function showInfo(game, row) {
  const info = root.querySelector('.couch-info');
  info.dataset.key = game.key;
  const reason =
    row.id === 'featured'
      ? reasons[GMLShelves.heroCandidates(uniqueGames()).find((pick) => pick.game.key === game.key)?.reason] || ''
      : row.title ||
        (section === 'library' ? (ready(game) ? '' : 'Sin instalar · ') + GMLShelves.initialOf(game.name) : '');
  info.querySelector('.couch-reason').textContent = reason;
  showWordmark(info.querySelector('.couch-logo'), info.querySelector('.couch-title'), game, info);
  const title = info.querySelector('.couch-title');
  title.classList.toggle('long', game.name.length > 14 && game.name.length <= 28);
  title.classList.toggle('longer', game.name.length > 28);
  info.querySelector('.couch-facts').textContent = facts(game);
}

// ---------- Ficha y menú ----------
function openSheet(game) {
  if (!game) return;
  sheetGame = game;
  layer = 'sheet';
  layerIndex = 0;
  const sheet = root.querySelector('.couch-sheet');
  sheet.dataset.key = game.key;
  sheet.setAttribute('aria-label', game.name);
  sheet.innerHTML =
    '<div class="couch-sheet-art"><span class="cover-initial"></span></div><div class="couch-sheet-body">' +
    '<img class="couch-logo" alt="" hidden /><h2 class="couch-title"></h2><p class="couch-facts"></p>' +
    '<p class="couch-summary"></p><div class="couch-actions"></div></div>';
  applyCover(sheet.querySelector('.couch-sheet-art'), game, coverInfo(game));
  showWordmark(sheet.querySelector('.couch-logo'), sheet.querySelector('.couch-title'), game, sheet);
  sheet.querySelector('.couch-facts').textContent = facts(game);
  sheet.querySelector('.couch-summary').textContent =
    game.arcade?.wiki?.extract || game.meta?.summary || 'Sin descripción todavía.';
  const actions = [
    [game.installed === false ? 'Instalar' : 'Jugar', 'play', true],
    [game.favorite ? 'Quitar de favoritos' : 'Agregar a favoritos', 'favorite'],
    ['Volver', 'back']
  ];
  const holder = sheet.querySelector('.couch-actions');
  actions.forEach(([label, action, primary]) => {
    const button = element('button', 'couch-action' + (primary ? ' primary' : ''), label);
    button.type = 'button';
    button.dataset.action = action;
    button.onclick = () => runSheetAction(action);
    holder.append(button);
  });
  sheet.hidden = false;
  root.classList.add('layer-open');
  focusLayer();
}
async function runSheetAction(action) {
  const game = sheetGame;
  if (action === 'back') return closeLayer();
  if (action === 'favorite') {
    await posterAction(game, 'favorite');
    closeLayer();
    renderRows();
    return;
  }
  closeLayer();
  playGame(game);
}
function openMenu() {
  layer = 'menu';
  layerIndex = 0;
  const menu = root.querySelector('.couch-menu');
  menu.innerHTML = '<h2>Menú</h2>';
  [
    ['Inicio', () => showSection('home')],
    ['Biblioteca', () => showSection('library')],
    [scope === 'ready' ? 'Mostrar toda la colección' : 'Mostrar solo los listos para jugar', toggleScope],
    ['Salir del modo sala', () => GMLGamepad.setBigScreen(false)]
  ].forEach(([label, run]) => {
    const button = element('button', 'couch-action', label);
    button.type = 'button';
    button.onclick = () => {
      closeLayer();
      run();
    };
    menu.append(button);
  });
  menu.hidden = false;
  root.classList.add('layer-open');
  focusLayer();
}
function layerButtons() {
  return [...root.querySelectorAll(layer === 'sheet' ? '.couch-sheet .couch-action' : '.couch-menu .couch-action')];
}
function focusLayer() {
  const buttons = layerButtons();
  layerIndex = (layerIndex + buttons.length) % buttons.length;
  buttons[layerIndex]?.focus({ preventScroll: true });
}
function closeLayer() {
  root.querySelector('.couch-sheet').hidden = true;
  root.querySelector('.couch-menu').hidden = true;
  root.classList.remove('layer-open');
  layer = null;
  sheetGame = null;
  moveTo(focus.row, focus.col, true);
}

// ---------- Secciones y entrada ----------
function showSection(id) {
  if (section !== id) {
    section = id;
    focus = { row: 0, col: 0 };
    columns.clear();
  }
  renderRows();
}
function toggleScope() {
  scope = scope === 'ready' ? 'all' : 'ready';
  try {
    localStorage.setItem(SCOPE_KEY, scope);
  } catch {
    /* sin almacenamiento: vale para esta sesión */
  }
  // Se conserva el juego enfocado si sigue en pantalla; si no, se vuelve al principio.
  const key = gameAt(focus.row, focus.col)?.key;
  rows = buildRows();
  const row = rows.findIndex((item) => item.games.some((game) => game.key === key));
  focus = row >= 0 ? { row, col: rows[row].games.findIndex((game) => game.key === key) } : { row: 0, col: 0 };
  columns.clear();
  renderRows();
  window.notify?.(scope === 'ready' ? 'Solo los juegos listos para jugar' : 'Toda la colección, lo instalado primero');
}
function jumpLetter() {
  if (section !== 'library') return showSection('library');
  const current = rows[focus.row]?.letter;
  const next = rows.findIndex((row, index) => index > focus.row && row.letter !== current);
  moveTo(next >= 0 ? next : 0, 0, false);
}

function handleKey(event) {
  if (!isCouch() || !root) return;
  // La pantalla «Iniciando…» y los diálogos del escritorio tienen prioridad.
  if (!document.querySelector('#launch-overlay')?.hidden || document.querySelector('dialog[open]')) return;
  const { key } = event;
  const handled = () => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  if (key === 'F11') return;
  if (layer) {
    if (['ArrowLeft', 'ArrowUp'].includes(key)) ((layerIndex -= 1), focusLayer());
    else if (['ArrowRight', 'ArrowDown'].includes(key)) ((layerIndex += 1), focusLayer());
    else if (key === 'Enter' || key === ' ') layerButtons()[layerIndex]?.click();
    else if (key === 'Escape' || key === 'Backspace' || key === 'ContextMenu') closeLayer();
    else if (key.toLowerCase() === 'f' && sheetGame) runSheetAction('favorite');
    else return;
    return handled();
  }
  if (key === 'ArrowRight') moveTo(focus.row, focus.col + 1);
  else if (key === 'ArrowLeft') moveTo(focus.row, focus.col - 1);
  else if (key === 'ArrowDown') moveTo(focus.row + 1, columns.get(focus.row + 1) ?? focus.col);
  else if (key === 'ArrowUp') moveTo(focus.row - 1, columns.get(focus.row - 1) ?? focus.col);
  else if (key === 'Enter' || key === ' ') openSheet(gameAt(focus.row, focus.col));
  else if (key.toLowerCase() === 'f') {
    const game = gameAt(focus.row, focus.col);
    if (game) posterAction(game, 'favorite').then(renderRows);
  } else if (
    key.toLowerCase() === 'y' ||
    key === '/' ||
    ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'k')
  )
    jumpLetter();
  else if (key.toLowerCase() === 'v' || key.toLowerCase() === 'i') toggleScope();
  else if (key === 'PageUp' || key === 'PageDown') showSection(section === 'home' ? 'library' : 'home');
  else if (key === 'Escape' || key === 'ContextMenu' || key === 'Backspace') openMenu();
  else if (key === 'Home') moveTo(focus.row, 0);
  else if (key === 'End') moveTo(focus.row, rows[focus.row].games.length - 1);
  else return;
  handled();
}

function tick() {
  const clock = root?.querySelector('.couch-clock');
  if (clock) clock.textContent = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function enter() {
  if (!root) build();
  root.hidden = false;
  root.classList.add('couch-idle');
  tick();
  clearInterval(clockTimer);
  clockTimer = setInterval(tick, 15000);
  renderRows();
}
function leave() {
  if (!root) return;
  closeLayer();
  root.hidden = true;
  clearInterval(clockTimer);
}

export function setup() {
  document.addEventListener('keydown', handleKey, true);
  window.addEventListener('gml-couch', (event) => (event.detail.on ? enter() : leave()));
  // La biblioteca se recargó (al volver de jugar, al buscar juegos nuevos): se redibujan las filas.
  window.addEventListener('gml-library', () => {
    if (isCouch() && !layer) renderRows();
  });
  if (isCouch()) enter();
}
