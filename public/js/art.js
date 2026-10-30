// Portadas, imágenes principales, logos y color ambiental.
import { load } from './main.js';
import { palette } from './palette.js';

export const pendingCoverLoads = new Map();
const COVER_RETRIES = 4;
const COVER_RETRY_MS = 3500;

export const coverObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      if (entry.isIntersecting) {
        const load = pendingCoverLoads.get(entry.target);
        pendingCoverLoads.delete(entry.target);
        coverObserver.unobserve(entry.target);
        load?.();
      }
  },
  { rootMargin: '200px' }
);

export function coverInfo(game) {
  const palette = {
    Steam: 'steam',
    'Epic Games': 'epic',
    'Xbox / Microsoft Store': 'xbox',
    'Ubisoft Connect': 'ubisoft',
    'EA app': 'ea',
    'GOG Galaxy': 'gog',
    Arcade: 'arcade'
  };
  return {
    initials: game.name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase(),
    palette: palette[game.platform] || 'other'
  };
}

export function statusText(game) {
  if (game.installed === false) return 'No instalado';
  return game.status === 'installed'
    ? game.launch && game.launch.available
      ? 'Listo para jugar'
      : 'Inicio pendiente'
    : 'Requiere revisión';
}

// Color dominante del arte de cada juego: tiñe el brillo de la portada y el fondo ambiental.
// Se calcula una sola vez sobre una miniatura de 24×36 y se recuerda entre sesiones.
export const artColors = new Map(
  (() => {
    try {
      return Object.entries(JSON.parse(localStorage.getItem('gml-art-colors') || '{}'));
    } catch {
      return [];
    }
  })()
);

export let saveArtColorsTimer;

export function rememberArtColor(key, color) {
  artColors.set(key, color);
  clearTimeout(saveArtColorsTimer);
  saveArtColorsTimer = setTimeout(() => {
    try {
      localStorage.setItem('gml-art-colors', JSON.stringify(Object.fromEntries(artColors)));
    } catch {
      /* sin almacenamiento local el color se vuelve a calcular */
    }
  }, 500);
}

export function dominantColor(image) {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 36;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, 24, 36);
  const { data } = context.getImageData(0, 0, 24, 36);
  // Histograma de tonos ponderado por saturación y luminosidad media: gana el color con más presencia.
  const bins = Array.from({ length: 12 }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
  for (let index = 0; index < data.length; index += 4) {
    const r = data[index] / 255,
      g = data[index + 1] / 255,
      b = data[index + 2] / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    const light = (max + min) / 2;
    const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * light - 1));
    const weight = saturation * (1 - Math.abs(light - 0.5) * 1.6);
    if (weight <= 0.05) continue;
    let hue = 0;
    if (max === r) hue = ((g - b) / (max - min) + 6) % 6;
    else if (max === g) hue = (b - r) / (max - min) + 2;
    else hue = (r - g) / (max - min) + 4;
    const bin = bins[Math.floor(hue * 2) % 12];
    bin.weight += weight;
    bin.r += r * weight;
    bin.g += g * weight;
    bin.b += b * weight;
  }
  const best = bins.reduce((top, bin) => (bin.weight > top.weight ? bin : top));
  if (best.weight < 0.5) return null;
  const channel = (value) =>
    Math.round(Math.min(255, (value / best.weight) * 255))
      .toString(16)
      .padStart(2, '0');
  return '#' + channel(best.r) + channel(best.g) + channel(best.b);
}

export function applyArtColor(element, game, image) {
  let color = artColors.get(game.key);
  if (color === undefined) {
    try {
      color = dominantColor(image);
    } catch {
      color = null;
    }
    rememberArtColor(game.key, color);
  }
  if (color) element.closest('.tile, .detail-panel, [data-art-host]')?.style.setProperty('--art', color);
}

// El fondo de la aplicación toma el color del juego en foco; sin color conocido vuelve al violeta de marca.
export let ambientTimer;

export function setAmbient(game) {
  clearTimeout(ambientTimer);
  ambientTimer = setTimeout(() => {
    const color = game && artColors.get(game.key);
    if (color) document.body.style.setProperty('--ambient', color);
    else document.body.style.removeProperty('--ambient');
  }, 90);
}

// La portada manual tiene prioridad; después, la imagen del launcher (hero apaisada si se pide).
export function artSources(game, preferHero) {
  const artwork = game.artwork || {};
  const sources = [];
  if (game.coverFile) sources.push({ url: '/covers/' + encodeURIComponent(game.coverFile), kind: 'portrait' });
  if (preferHero && artwork.hero) sources.push({ url: '/api/art/hero/' + encodeURIComponent(game.key), kind: 'hero' });
  if (artwork.cover) sources.push({ url: '/api/art/cover/' + encodeURIComponent(game.key), kind: artwork.cover });
  return sources;
}

export function applyCover(element, game, cover, preferHero = false) {
  const initial = element.querySelector('.cover-initial');
  if (initial) initial.textContent = cover.initials || 'G';
  const sources = artSources(game, preferHero);
  // Cada imagen se aplica sólo si carga; si todas fallan quedan las iniciales. Las del launcher pueden estar
  // descargándose todavía (el servidor responde 503): se vuelven a pedir unas veces, sólo cuando la portada
  // vuelve a estar a la vista.
  let source;
  let retries = 0;
  const retry = () => {
    if (!source?.url.startsWith('/api/art/') || retries >= COVER_RETRIES) return tryNext();
    retries += 1;
    setTimeout(() => {
      if (!element.isConnected) return;
      pendingCoverLoads.set(element, attempt);
      coverObserver.observe(element);
    }, COVER_RETRY_MS);
  };
  const tryNext = () => {
    source = sources.shift();
    retries = 0;
    if (source) attempt();
  };
  const attempt = () => {
    const image = new Image();
    image.onload = () => {
      const logo = source.kind === 'logo';
      element.style.backgroundImage =
        (logo ? '' : 'linear-gradient(#10182700 55%,#101827aa),') + 'url("' + source.url + '")';
      element.style.backgroundSize = logo ? 'contain' : 'cover';
      element.style.backgroundRepeat = 'no-repeat';
      element.style.backgroundPosition = 'center';
      if (logo) {
        element.style.backgroundOrigin = 'content-box';
        element.style.backgroundColor = (game.artwork && game.artwork.background) || '#1d2433';
      }
      element.classList.add('has-image', 'art-' + source.kind);
      if (!logo) applyArtColor(element, game, image);
    };
    image.onerror = retry;
    // El 503 no se guarda en caché: pedir la misma dirección otra vez vuelve al servidor.
    image.src = source.url;
  };
  pendingCoverLoads.set(element, tryNext);
  coverObserver.observe(element);
}

// Descarta las cargas de imágenes que quedaron fuera de pantalla después de redibujar. Se llama una vez
// que todo está insertado: las filas se arman antes de entrar al documento y no deben descartarse antes.
export function pruneCoverLoads() {
  for (const target of pendingCoverLoads.keys())
    if (!target.isConnected) {
      coverObserver.unobserve(target);
      pendingCoverLoads.delete(target);
    }
}

// Pinta el arte panorámico (o la portada desenfocada) detrás de una cabecera, con un fundido entre juegos.
export function heroArtUrl(game) {
  const sources = artSources(game, true);
  return (sources.find((source) => source.kind === 'hero') || sources[0])?.url || '';
}

export function paintBackdrop(host, game) {
  const backdrop = host.querySelector('.hero-backdrop');
  const url = heroArtUrl(game);
  backdrop.dataset.key = game.key;
  if (!url) {
    backdrop.replaceChildren();
    return;
  }
  const image = new Image();
  image.onload = () => {
    if (backdrop.dataset.key !== game.key) return;
    // La imagen nueva aparece sobre la anterior y la reemplaza al terminar el fundido.
    const layer = document.createElement('div');
    layer.className =
      'hero-layer' +
      (url.includes('/hero/') ? '' : ' is-cover') +
      // Las capturas de arcade son pixel art de baja resolución: se amplían nítidas, sin suavizar.
      (game.platform === 'Arcade' && url.includes('/hero/') ? ' pixel-art' : '');
    layer.style.backgroundImage = 'url("' + url + '")';
    backdrop.append(layer);
    requestAnimationFrame(() => layer.classList.add('show'));
    setTimeout(() => [...backdrop.children].slice(0, -1).forEach((old) => old.remove()), 600);
    applyArtColor(host, game, image);
    if (host.contains(document.querySelector('.page:not(.hidden) .hero-backdrop'))) setAmbient(game);
  };
  image.src = url;
}

// El logo del juego reemplaza al título escrito sólo si carga; el título queda para lectores de pantalla.
export function showWordmark(image, title, game, host) {
  title.textContent = game.name;
  title.classList.remove('visually-hidden');
  image.hidden = true;
  image.onload = null;
  image.removeAttribute('src');
  if (!(game.artwork && game.artwork.wordmark)) return;
  image.onload = () => {
    if (host.dataset.key !== game.key) return;
    image.hidden = false;
    title.classList.add('visually-hidden');
  };
  image.src = '/api/art/wordmark/' + encodeURIComponent(game.key);
}

// Espera brevemente la imagen de cabecera para que la transición termine sobre el arte y no sobre un color.
export function preloadImage(url, timeout) {
  return new Promise((resolve) => {
    if (!url) return resolve();
    const image = new Image();
    const done = () => resolve();
    image.onload = done;
    image.onerror = done;
    setTimeout(done, timeout);
    image.src = url;
  });
}
