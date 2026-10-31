// Página del juego: cabecera, columna con Jugar y estadísticas, apertura y cierre.
import { request } from './api.js';
import { artColors, heroArtUrl, paintBackdrop, preloadImage, showWordmark, statusText } from './art.js';
import { decorateActions, playButtonHtml, posterAction, selectTile } from './cards.js';
import { gameTabs } from './details.js';
import { icon } from './icons.js';
import { otherCopies } from './library.js';
import { showPage } from './main.js';
import { state } from './state.js';

// ── Página de cada juego ────────────────────────────────────────
export const gamePage = document.querySelector('#game-page');

export let gameReturn = null;

export function gameFacts(game) {
  const facts = [game.platform];
  if (statusText(game) !== 'Listo para jugar') facts.push(statusText(game));
  if (game.meta?.year) facts.push(String(game.meta.year));
  (game.meta?.genres || []).slice(0, 2).forEach((genre) => facts.push(genre));
  if (game.meta?.developers?.[0]) facts.push(game.meta.developers[0]);
  return facts;
}

export function statRow(list, label, value) {
  if (!value) return;
  const row = document.createElement('div');
  row.innerHTML = '<dt></dt><dd></dd>';
  row.querySelector('dt').textContent = label;
  row.querySelector('dd').textContent = value;
  list.append(row);
}

// Columna de acción: jugar o instalar, favorito y edición, y la relación del jugador con el juego.
export function renderGameAside(game) {
  const aside = document.querySelector('#game-aside');
  aside.dataset.key = game.key;
  aside.innerHTML =
    '<div class="game-actions">' +
    playButtonHtml(game, 'button primary game-play') +
    '<div class="game-secondary"><button type="button" class="button" data-action="favorite">' +
    icon('star', game.favorite) +
    '<span></span></button><button type="button" class="button" data-action="edit">' +
    icon('pencil') +
    '<span>Editar</span></button><button type="button" class="button" data-action="lists">' +
    icon('list') +
    '<span>Listas</span></button></div></div><dl class="game-stats"></dl>' +
    '<div class="achievement-ring" hidden><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-track" cx="18" cy="18" r="15.5"/>' +
    '<circle class="ring-value" cx="18" cy="18" r="15.5" pathLength="100"/></svg><p><strong></strong><span></span></p></div>';
  aside.querySelector('[data-action=favorite] span').textContent = game.favorite ? 'En favoritos' : 'Favorito';
  decorateActions(aside, game);
  aside.querySelectorAll('[data-action]').forEach((button) => (button.tabIndex = 0));
  const stats = aside.querySelector('.game-stats');
  const played = GMLShelves.lastPlayed(game);
  const length = game.meta?.timeToBeat?.normally;
  statRow(
    stats,
    'Tiempo jugado',
    GMLShelves.hours(GMLShelves.playedHours(game)) || (game.steam ? 'Sin horas en Steam' : 'Sin sesiones medidas')
  );
  statRow(stats, 'Últimas dos semanas', GMLShelves.hours(game.steam?.recentHours));
  statRow(stats, 'Última sesión', played ? GMLShelves.relativeDay(new Date(played).toISOString()) : 'Sin registro');
  statRow(stats, 'Duración estimada', length ? 'Unas ' + GMLShelves.hours(length / 3600) : '');
  statRow(stats, 'Valoración de la crítica', game.meta?.rating ? game.meta.rating + ' de 100' : '');
  statRow(stats, 'Tu progreso', game.progress || 'Pendiente');
  statRow(stats, 'Tu puntuación', game.rating ? '★'.repeat(Math.min(Number(game.rating) || 0, 5)) : 'Sin puntuar');
  if (game.platform === 'Steam' && game.ownership === 'owned') loadAchievementRing(aside, game);
  // Otras tiendas donde está el mismo juego.
  const copies = otherCopies(game);
  if (copies.length) {
    const section = document.createElement('section');
    section.className = 'game-copies';
    section.innerHTML = '<h3>También en</h3>';
    copies.forEach((copy) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'game-copy';
      button.innerHTML = '<span></span><small></small>' + icon('chevronRight');
      button.querySelector('span').textContent = copy.platform;
      button.querySelector('small').textContent = statusText(copy);
      button.setAttribute('aria-label', game.name + ' en ' + copy.platform + ', ' + statusText(copy));
      button.onclick = () => openGamePage(copy);
      section.append(button);
    });
    aside.append(section);
  }
}

export async function loadAchievementRing(aside, game) {
  try {
    const { data } = await request('/api/steam/games/' + encodeURIComponent(game.id) + '/achievements');
    if (aside.dataset.key !== game.key || !data?.accessible || !data.total) return;
    const ring = aside.querySelector('.achievement-ring');
    const percent = Math.round((data.unlocked / data.total) * 100);
    ring.querySelector('.ring-value').style.strokeDasharray = percent + ' 100';
    ring.querySelector('strong').textContent = percent + ' %';
    ring.querySelector('span').textContent = data.unlocked + ' de ' + data.total + ' logros';
    ring.hidden = false;
  } catch {
    /* sin cuenta de Steam o sin logros: el anillo no se muestra */
  }
}

export function renderGamePage(game) {
  gamePage.dataset.key = game.key;
  gamePage.style.removeProperty('--art');
  if (artColors.get(game.key)) gamePage.style.setProperty('--art', artColors.get(game.key));
  gamePage.setAttribute('aria-label', game.name);
  showWordmark(document.querySelector('#game-wordmark'), document.querySelector('#game-title'), game, gamePage);
  const facts = document.querySelector('#game-facts');
  facts.replaceChildren();
  gameFacts(game).forEach((text) => {
    const fact = document.createElement('span');
    fact.textContent = text;
    facts.append(fact);
  });
  paintBackdrop(gamePage, game);
  document.querySelector('#game-main').replaceChildren(gameTabs(game, { prefix: 'page' }));
  renderGameAside(game);
}

export async function openGamePage(game, origin) {
  if (!game) return;
  if (state.page !== 'game')
    gameReturn = { page: state.page, scroll: window.scrollY, key: game.key, origin: origin || null };
  const show = () => {
    renderGamePage(game);
    showPage('game');
    window.scrollTo(0, 0);
    // El foco queda en la acción principal (Jugar o Instalar); Volver está a un Escape.
    document.querySelector('#game-aside [data-action=play]').focus({ preventScroll: true });
  };
  const art = origin?.querySelector('.poster-art, .row-thumb');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && art && !reduceMotion) {
    // La portada elegida se expande hasta convertirse en la cabecera de la página.
    await preloadImage(heroArtUrl(game), 260);
    art.style.viewTransitionName = 'game-art';
    const backdrop = gamePage.querySelector('.hero-backdrop');
    const transition = document.startViewTransition(() => {
      art.style.viewTransitionName = '';
      show();
      backdrop.style.viewTransitionName = 'game-art';
    });
    transition.finished.finally(() => (backdrop.style.viewTransitionName = ''));
  } else show();
}

export function closeGamePage() {
  const back = gameReturn || { page: 'library', scroll: 0 };
  gameReturn = null;
  showPage(back.page, { focus: false });
  window.scrollTo(0, back.scroll || 0);
  // El foco vuelve al juego desde el que se abrió la página.
  const tile =
    (back.origin?.isConnected && back.origin) ||
    document.querySelector('#' + back.page + '-page .tile[data-key="' + CSS.escape(back.key || '') + '"]');
  if (tile) {
    selectTile(tile, false);
    tile.focus({ preventScroll: true });
  }
}

// Abre la página del juego desde cualquier lugar (paleta, imagen principal).
export function showGame(game) {
  openGamePage(game);
}

// Enlaces de eventos y estado inicial; se llama una vez desde main.js.
export function setup() {
  document.querySelector('#game-back').onclick = closeGamePage;
  document.querySelector('#game-aside').addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    const game = state.games.find((item) => item.key === gamePage.dataset.key);
    if (action && game) posterAction(game, action);
  });
}
