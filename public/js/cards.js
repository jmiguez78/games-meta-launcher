// Portadas de juegos (tarjetas), sus acciones y la navegación por teclado entre ellas.
import { applyCover, coverInfo, setAmbient, statusText } from './art.js';
import { openPicker } from './lists.js';
import { editGame, updatePreference } from './editor.js';
import { notify, notifyError, say, undoPreference } from './feedback.js';
import { openGamePage } from './game-page.js';
import { icon } from './icons.js';
import { playGame } from './launch.js';
import { library } from './library.js';
import { remember, state } from './state.js';
import { installSteamGame } from './steam.js';

// Acciones compartidas por portadas, filas, tabla y ficha. Los botones nacen fuera del orden de Tab;
// selectTile los habilita sólo en el elemento activo de cada colección.
export function playButtonHtml(game, className) {
  const available = game.launch && game.launch.available;
  return (
    '<button type="button" class="' +
    className +
    '" data-action="play" tabindex="-1">' +
    icon(game.installed === false ? 'download' : available ? 'play' : 'alert', available) +
    '<span class="label"></span></button>'
  );
}

export function iconActionsHtml(game) {
  return (
    '<button type="button" class="icon-btn" data-action="favorite" tabindex="-1">' +
    icon('star', game.favorite) +
    '</button><button type="button" class="icon-btn" data-action="edit" tabindex="-1">' +
    icon('pencil') +
    '</button>'
  );
}

export function decorateActions(root, game) {
  const available = game.launch && game.launch.available;
  root.querySelectorAll('[data-action=play]').forEach((button) => {
    const installable = game.installed === false && game.ownership === 'owned' && game.platform === 'Steam';
    button.setAttribute(
      'aria-label',
      (installable ? 'Instalar en Steam: ' : available ? 'Jugar a ' : 'Revisar ') + game.name
    );
    // En la tabla el espacio es escaso: «Instalar» alcanza, la tienda está en su propia columna.
    const compact = Boolean(button.closest('.games-table'));
    button.querySelector('.label').textContent = installable
      ? compact
        ? 'Instalar'
        : 'Instalar en Steam'
      : available
        ? 'Jugar'
        : 'Revisar';
    button.classList.toggle('review', !available && !installable);
    button.classList.toggle('install', installable);
    if (compact) button.title = button.getAttribute('aria-label');
  });
  root.querySelectorAll('[data-action=favorite]').forEach((button) => {
    button.setAttribute('aria-pressed', String(Boolean(game.favorite)));
    button.setAttribute('aria-label', 'Favorito: ' + game.name);
    button.title = game.favorite ? 'Quitar de favoritos' : 'Marcar como favorito';
  });
  root.querySelectorAll('[data-action=edit]').forEach((button) => {
    button.setAttribute('aria-label', 'Editar ficha de ' + game.name);
    button.title = 'Editar ficha';
  });
}

export function metaLineHtml() {
  return '<p class="poster-meta"><span class="platform-name"></span><span class="status-pill"></span></p>';
}

export function fillMetaLine(root, game) {
  const available = game.launch && game.launch.available;
  // En Arcade, la plataforma es siempre la misma: dice más el fabricante y el año.
  root.querySelector('.platform-name').textContent = game.arcade
    ? [game.meta?.developers?.[0], game.arcade.year].filter(Boolean).join(' · ') || game.platform
    : game.platform;
  const status = root.querySelector('.status-pill');
  status.textContent = game.installed === false ? 'No instalado' : available ? 'Listo' : 'Requiere revisión';
  setStatusTone(status, game);
}

// Verde sólo para lo que se puede jugar ya; ámbar para lo que requiere revisión; neutro para lo no instalado.
export function setStatusTone(element, game) {
  const available = game.launch && game.launch.available;
  element.classList.toggle('attention', !available && game.installed !== false);
  element.classList.toggle('muted', game.installed === false);
  element.classList.toggle('ready', Boolean(available) && game.installed !== false);
}

export function lastPlayedText(game) {
  return game.lastLaunchedAt ? new Date(game.lastLaunchedAt).toLocaleDateString('es-AR') : 'Aún no registrado';
}

export function playOrReview(game) {
  if (game.installed === false && game.platform === 'Steam' && game.ownership === 'owned')
    return installSteamGame(game);
  if (game.launch && game.launch.available) playGame(game);
  else say(game.evidence);
}

// Portada en cuadrícula.
// options.caption reemplaza la plataforma bajo el título (por ejemplo, «Ayer» en la fila Continuar).
export function makePosterCard(game, options = {}) {
  const cover = coverInfo(game);
  const card = document.createElement('article');
  card.className = 'poster tile ' + cover.palette + (game.key === state.selectedKey ? ' selected' : '');
  card.dataset.key = game.key;
  card.tabIndex = -1;
  card.setAttribute('aria-label', game.name + ', ' + game.platform + ', ' + statusText(game));
  card.innerHTML =
    '<div class="poster-art"><span class="cover-initial"></span><span class="poster-badge"></span></div>' +
    '<div class="poster-overlay">' +
    playButtonHtml(game, 'poster-play') +
    '</div><div class="poster-actions">' +
    iconActionsHtml(game) +
    '</div><div class="poster-body"><h3 class="poster-title"></h3>' +
    metaLineHtml() +
    '</div>';
  applyCover(card.querySelector('.poster-art'), game, cover);
  card.querySelector('.poster-title').textContent = game.name;
  fillMetaLine(card, game);
  if (options.caption) card.querySelector('.platform-name').textContent = options.caption;
  decorateActions(card, game);
  return card;
}

export async function posterAction(game, action) {
  if (action === 'play') return playOrReview(game);
  if (action === 'page') return openGamePage(game);
  if (action === 'edit') return editGame(game);
  if (action === 'lists') return openPicker(game);
  if (action === 'favorite') {
    const previous = Boolean(game.favorite);
    try {
      await updatePreference(game, { favorite: !previous });
      notify(previous ? game.name + ' se quitó de favoritos.' : game.name + ' se agregó a favoritos.', {
        type: 'success',
        action: {
          label: 'Deshacer',
          run: undoPreference(
            game,
            { favorite: previous },
            previous ? game.name + ' volvió a favoritos.' : game.name + ' ya no está en favoritos.'
          )
        }
      });
    } catch (error) {
      notifyError(error);
    }
  }
}

// Navegación de colecciones: un único punto de Tab por colección (tabindex itinerante).
// Flechas para moverse, Enter juega, F marca favorito y E edita.
export function tilesOf(container) {
  return [...container.querySelectorAll('.tile')];
}

export function selectTile(tile, focus, remember = true) {
  const container = tile.closest('[data-tiles]');
  tilesOf(container).forEach((item) => {
    const active = item === tile;
    item.classList.toggle('selected', active);
    item.tabIndex = active ? 0 : -1;
    item.querySelectorAll('button').forEach((button) => (button.tabIndex = active ? 0 : -1));
  });
  if (remember) state.selectedKey = tile.dataset.key;
  if (focus) {
    tile.focus();
    setAmbient(gameFor(tile));
  }
}

export function tileNeighbor(tile, key) {
  const tiles = tilesOf(tile.closest('[data-tiles]'));
  const index = tiles.indexOf(tile);
  const columns = tiles.filter((item) => item.offsetTop === tiles[0].offsetTop).length || 1;
  const target = {
    ArrowRight: index + 1,
    ArrowLeft: index - 1,
    ArrowDown: index + columns,
    ArrowUp: index - columns,
    Home: 0,
    End: tiles.length - 1
  }[key];
  return tiles[Math.max(0, Math.min(tiles.length - 1, target))];
}

export function gameFor(element) {
  return state.games.find((item) => item.key === element.dataset.key);
}

export function bindTiles(container) {
  container.dataset.tiles = '';
  container.addEventListener('pointerover', (event) => {
    const tile = event.target.closest('.tile');
    if (tile && !tile.contains(event.relatedTarget)) setAmbient(gameFor(tile));
  });
  container.addEventListener('click', (event) => {
    const host = event.target.closest('[data-key]');
    if (!host || !container.contains(host)) return;
    const action = event.target.closest('[data-action]');
    if (host.classList.contains('tile')) {
      // Un clic en el juego (no en sus botones) abre su página.
      if (!action) {
        selectTile(host, false);
        openGamePage(gameFor(host), host);
        return;
      }
      selectTile(host, false);
    }
    if (action) posterAction(gameFor(host), action.dataset.action);
  });
  container.addEventListener('keydown', (event) => {
    const tile = event.target.closest('.tile');
    if (!tile || event.target !== tile || event.altKey || event.ctrlKey || event.metaKey) return;
    // En Inicio, arriba y abajo pasan de una fila a otra conservando la posición.
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && 'shelf' in container.dataset) {
      event.preventDefault();
      // Se saltean las filas sin juegos (por ejemplo, Favoritos vacío).
      const tracks = [...document.querySelectorAll('[data-shelf]')].filter((track) => tilesOf(track).length);
      const target = tracks[tracks.indexOf(container) + (event.key === 'ArrowDown' ? 1 : -1)];
      const targetTiles = target ? tilesOf(target) : [];
      if (!targetTiles.length) return;
      const next = targetTiles[Math.min(tilesOf(container).indexOf(tile), targetTiles.length - 1)];
      selectTile(next, true);
      return;
    }
    if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = tileNeighbor(tile, event.key);
      selectTile(next, true);
    } else if (event.key === 'Enter') {
      if (container === library && state.view === 'explorer') openGamePage(gameFor(tile), tile);
      else posterAction(gameFor(tile), 'play');
    } else if (event.key === ' ') {
      event.preventDefault();
      openGamePage(gameFor(tile), tile);
    } else if (event.key.toLowerCase() === 'f') posterAction(gameFor(tile), 'favorite');
    else if (event.key.toLowerCase() === 'e') posterAction(gameFor(tile), 'edit');
  });
}

// Las portadas se arman una vez por juego y se reutilizan entre búsquedas y filtros: redibujar sólo
// cambia su orden, sin volver a crear elementos ni a pedir imágenes.
export const posterCache = new Map();

export function cachedPoster(game) {
  let card = posterCache.get(game.key);
  if (!card || card.gameRef !== game) {
    card = makePosterCard(game);
    card.gameRef = game;
    posterCache.set(game.key, card);
  }
  return card;
}
