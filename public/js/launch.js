// Jugar: pantalla «Iniciando…» y lanzamiento.
import { request } from './api.js';
import { artColors, paintBackdrop, showWordmark } from './art.js';
import { posterCache } from './cards.js';
import { notifyError } from './feedback.js';
import { renderHome } from './home.js';
import { renderLibrary } from './library.js';
import { load } from './main.js';
import { installSteamGame } from './steam.js';

// Pantalla «Iniciando…»: responde al instante con el arte del juego mientras la tienda lo abre.
export const launchOverlay = document.querySelector('#launch-overlay');

export const launcherNames = {
  Arcade: 'MAME',
  Steam: 'Steam',
  'Epic Games': 'Epic Games',
  'Xbox / Microsoft Store': 'Xbox',
  'Ubisoft Connect': 'Ubisoft Connect',
  'EA app': 'EA app',
  'GOG Galaxy': 'GOG Galaxy'
};

export let launchTimer;

export function hideLaunchOverlay() {
  clearTimeout(launchTimer);
  launchOverlay.classList.remove('show');
  launchTimer = setTimeout(() => (launchOverlay.hidden = true), 300);
}

export function showLaunchOverlay(game) {
  clearTimeout(launchTimer);
  launchOverlay.dataset.key = game.key;
  launchOverlay.classList.remove('done');
  launchOverlay.style.removeProperty('--art');
  if (artColors.get(game.key)) launchOverlay.style.setProperty('--art', artColors.get(game.key));
  showWordmark(
    document.querySelector('#launch-wordmark'),
    document.querySelector('#launch-title'),
    game,
    launchOverlay
  );
  const custom = game.launchOverride || game.launch?.type === 'file';
  document.querySelector('#launch-message').textContent =
    custom || !launcherNames[game.platform] ? 'Iniciando…' : 'Iniciando en ' + launcherNames[game.platform] + '…';
  paintBackdrop(launchOverlay, game);
  launchOverlay.hidden = false;
  requestAnimationFrame(() => launchOverlay.classList.add('show'));
}

// version: en Arcade, el set de una versión regional; el tiempo jugado se suma al juego.
export async function playGame(game, version) {
  if (game.installed === false) return installSteamGame(game);
  showLaunchOverlay(game);
  try {
    const key = version ? 'arcade:' + version : game.key;
    const result = await request('/api/launch/' + encodeURIComponent(key), { method: 'POST' });
    game.lastLaunchedAt = new Date().toISOString();
    launchOverlay.classList.add('done');
    document.querySelector('#launch-message').textContent = result.minimize
      ? 'Listo. Que lo disfrutes.'
      : 'Listo. El juego se está abriendo.';
    launchTimer = setTimeout(hideLaunchOverlay, 2600);
    posterCache.delete(game.key);
    renderHome();
    renderLibrary();
  } catch (error) {
    hideLaunchOverlay();
    notifyError(error, () => playGame(game));
  }
}

// Enlaces de eventos y estado inicial; se llama una vez desde main.js.
export function setup() {
  launchOverlay.addEventListener('click', hideLaunchOverlay);
  // Al volver a la aplicación (por ejemplo, después de jugar), la pantalla ya no hace falta.
  window.addEventListener('focus', () => {
    if (launchOverlay.classList.contains('done')) hideLaunchOverlay();
  });
  // Al cerrar MAME, la aplicación de escritorio vuelve al frente y avisa: se actualiza el tiempo jugado.
  window.addEventListener('gml-game-exit', () => {
    hideLaunchOverlay();
    load();
  });
}
