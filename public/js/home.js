// Inicio: imagen principal y filas.
import { applyCover, artColors, coverInfo, paintBackdrop, pruneCoverLoads, showWordmark } from './art.js';
import { bindTiles, makePosterCard, posterAction, selectTile } from './cards.js';
import { showGame } from './game-page.js';
import { icon } from './icons.js';
import { uniqueGames } from './library.js';
import { state } from './state.js';

export const homeShelvesHost = document.querySelector('#home-shelves');

export const homeHero = document.querySelector('#home-hero');

// Favoritos, después los jugados hace poco y después los listos para jugar, sin repetir.
export function quickGames(limit) {
  const favorites = state.games.filter((game) => game.favorite);
  const recent = [...state.games]
    .filter((game) => game.lastLaunchedAt)
    .sort((a, b) => String(b.lastLaunchedAt).localeCompare(String(a.lastLaunchedAt)));
  return [...favorites, ...recent, ...state.games.filter((game) => game.launch && game.launch.available)]
    .filter((game, index, all) => all.findIndex((item) => item.key === game.key) === index)
    .slice(0, limit);
}

// Inicio: una imagen principal que propone qué jugar y filas por intención (shelves.js elige los juegos).
export const heroReasons = {
  recent: 'Seguí donde lo dejaste',
  favorite: 'Uno de tus favoritos',
  rated: 'Muy valorado por la crítica',
  ready: 'Listo para jugar'
};

export let heroPicks = [];

export let heroKey = '';

export function heroGame() {
  return heroPicks.find((pick) => pick.game.key === heroKey) || heroPicks[0];
}

export function renderHero() {
  const pick = heroGame();
  homeHero.classList.toggle('hidden', !pick);
  if (!pick) return;
  const { game, reason } = pick;
  heroKey = game.key;
  homeHero.dataset.key = game.key;
  homeHero.style.removeProperty('--art');
  const known = artColors.get(game.key);
  if (known) homeHero.style.setProperty('--art', known);
  document.querySelector('#hero-reason').textContent = heroReasons[reason];
  showWordmark(document.querySelector('#hero-wordmark'), document.querySelector('#hero-title'), game, homeHero);
  const facts = document.querySelector('#hero-facts');
  facts.replaceChildren();
  const played = GMLShelves.lastPlayed(game);
  [
    game.platform,
    GMLShelves.hours(GMLShelves.playedHours(game)) ? GMLShelves.hours(GMLShelves.playedHours(game)) + ' jugadas' : '',
    played ? 'Última sesión: ' + GMLShelves.relativeDay(new Date(played).toISOString()).toLowerCase() : '',
    game.meta && game.meta.genres && game.meta.genres[0]
  ]
    .filter(Boolean)
    .forEach((text) => {
      const fact = document.createElement('span');
      fact.textContent = text;
      facts.append(fact);
    });
  const play = homeHero.querySelector('[data-hero-action=play]');
  const installable = game.installed === false;
  play.querySelector('.hero-play-icon').innerHTML = icon(installable ? 'download' : 'play', !installable);
  play.querySelector('.label').textContent = installable ? 'Instalar en Steam' : 'Jugar';
  play.setAttribute('aria-label', (installable ? 'Instalar en Steam: ' : 'Jugar a ') + game.name);
  const favorite = homeHero.querySelector('[data-hero-action=favorite]');
  favorite.innerHTML = icon('star', game.favorite);
  favorite.setAttribute('aria-pressed', String(Boolean(game.favorite)));
  favorite.setAttribute('aria-label', 'Favorito: ' + game.name);
  favorite.title = game.favorite ? 'Quitar de favoritos' : 'Marcar como favorito';
  homeHero.querySelector('[data-hero-action=detail]').setAttribute('aria-label', 'Ver la ficha de ' + game.name);
  const picker = document.querySelector('#hero-picker');
  picker.replaceChildren();
  picker.classList.toggle('hidden', heroPicks.length < 2);
  heroPicks.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hero-thumb';
    button.setAttribute('aria-label', item.game.name);
    button.setAttribute('aria-pressed', String(item.game.key === game.key));
    button.innerHTML = '<span class="cover-initial"></span>';
    applyCover(button, item.game, coverInfo(item.game));
    button.onclick = () => {
      heroKey = item.game.key;
      renderHero();
      // El destacado no se repite en las filas de abajo.
      renderShelves();
      pruneCoverLoads();
      document.querySelector('#hero-picker [aria-pressed=true]')?.focus();
    };
    picker.append(button);
  });
  paintBackdrop(homeHero, game);
}

export const shelfCaptions = {
  continue: (game) => GMLShelves.relativeDay(new Date(GMLShelves.lastPlayed(game)).toISOString()),
  short: (game) => 'Unas ' + GMLShelves.hours(game.meta.timeToBeat.normally / 3600),
  rated: (game) => 'Valoración ' + game.meta.rating,
  install: (game) => 'Valoración ' + game.meta.rating
};

export function updateShelfControls(shelf) {
  const track = shelf.querySelector('.shelf-track');
  const [previous, next] = shelf.querySelectorAll('.shelf-controls button');
  if (!previous) return;
  previous.disabled = track.scrollLeft <= 4;
  next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  shelf.querySelector('.shelf-controls').classList.toggle('hidden', track.scrollWidth <= track.clientWidth + 4);
}

export function renderShelves() {
  // Se conserva qué juego estaba enfocado para devolverle el foco tras redibujar (por ejemplo, al marcar favorito).
  const focusedKey = homeShelvesHost.contains(document.activeElement)
    ? document.activeElement.closest('[data-key]')?.dataset.key
    : null;
  const focusedShelf = document.activeElement.closest?.('[data-shelf]')?.dataset.shelf;
  homeShelvesHost.replaceChildren();
  const hero = heroGame();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  GMLShelves.homeShelves(uniqueGames(), { exclude: hero ? [hero.game.key] : [] }).forEach((shelf) => {
    const section = document.createElement('section');
    section.className = 'shelf';
    section.setAttribute('aria-labelledby', 'shelf-' + shelf.id);
    section.innerHTML =
      '<header class="shelf-heading"><div><h2></h2><p></p></div><div class="shelf-controls">' +
      '<button type="button" class="icon-btn"></button><button type="button" class="icon-btn"></button></div></header>' +
      '<div class="shelf-track library posters" aria-describedby="library-help"></div>';
    const heading = section.querySelector('h2');
    heading.id = 'shelf-' + shelf.id;
    heading.textContent = shelf.title;
    section.querySelector('.shelf-heading p').textContent = shelf.subtitle;
    const track = section.querySelector('.shelf-track');
    track.dataset.shelf = shelf.id;
    track.setAttribute('aria-labelledby', heading.id);
    const [previous, next] = section.querySelectorAll('.shelf-controls button');
    previous.innerHTML = icon('chevronLeft');
    next.innerHTML = icon('chevronRight');
    previous.setAttribute('aria-label', 'Anteriores en ' + shelf.title);
    next.setAttribute('aria-label', 'Más en ' + shelf.title);
    const scroll = (direction) =>
      track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: reduceMotion ? 'auto' : 'smooth' });
    previous.onclick = () => scroll(-1);
    next.onclick = () => scroll(1);
    track.addEventListener('scroll', () => updateShelfControls(section), { passive: true });
    if (!shelf.games.length) {
      track.classList.add('shelf-empty');
      track.textContent = shelf.empty;
      section.querySelector('.shelf-controls').classList.add('hidden');
    }
    shelf.games.forEach((game) => track.append(makePosterCard(game, { caption: shelfCaptions[shelf.id]?.(game) })));
    homeShelvesHost.append(section);
    if (shelf.games.length) {
      bindTiles(track);
      const selected =
        (focusedShelf === shelf.id && track.querySelector('.tile[data-key="' + CSS.escape(focusedKey || '') + '"]')) ||
        track.querySelector('.tile');
      selectTile(selected, false, false);
      if (focusedShelf === shelf.id && focusedKey) selected.focus({ preventScroll: true });
    }
    updateShelfControls(section);
  });
}

export function renderHomeEmpty() {
  const holder = document.querySelector('#home-empty');
  const empty = !state.loading && !state.loadError && !heroPicks.length;
  holder.classList.toggle('hidden', !empty);
  if (!empty) return;
  holder.innerHTML =
    '<span class="state-icon">' +
    icon('gamepad') +
    '</span><h2>Todavía no hay juegos para jugar</h2><p>Buscamos instalaciones de Steam, Epic, Xbox, Ubisoft, EA y GOG en esta PC. Si ya tenés juegos instalados, buscá de nuevo.</p><button type="button" class="button primary">' +
    icon('refresh') +
    ' Buscar juegos</button>';
  holder.querySelector('button').onclick = () => document.querySelector('#refresh').click();
}

// Lo que necesita atención aparece sólo cuando existe: en la barra lateral y en Configuración.
export function renderHealthSignals() {
  const review = state.games.filter((game) => game.installed !== false && !(game.launch && game.launch.available));
  const installed = state.games.filter((game) => game.installed !== false);
  const nav = document.querySelector('#nav-diagnostics');
  nav.classList.toggle('hidden', review.length === 0 && state.page !== 'diagnostics');
  document.querySelector('#review-count').textContent = review.length || '';
  nav.setAttribute(
    'aria-label',
    review.length
      ? 'Para revisar: ' + review.length + (review.length === 1 ? ' juego' : ' juegos')
      : 'Estado de la biblioteca'
  );
  document.querySelector('#settings-health').textContent =
    installed.length +
    ' juegos instalados en esta PC; ' +
    (installed.length - review.length) +
    ' listos para jugar. ' +
    (review.length
      ? review.length + (review.length === 1 ? ' necesita' : ' necesitan') + ' revisión.'
      : 'Ninguno necesita revisión.');
}

export function renderHome() {
  heroPicks = GMLShelves.heroCandidates(uniqueGames());
  renderHero();
  renderShelves();
  renderHomeEmpty();
  renderHealthSignals();
  pruneCoverLoads();
}

// Enlaces de eventos y estado inicial; se llama una vez desde main.js.
export function setup() {
  homeHero.addEventListener('click', (event) => {
    const action = event.target.closest('[data-hero-action]')?.dataset.heroAction;
    const game = state.games.find((item) => item.key === homeHero.dataset.key);
    if (!action || !game) return;
    if (action === 'detail') showGame(game);
    else posterAction(game, action);
  });
}
