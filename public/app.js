const state = {
  games: [],
  query: '',
  favorite: false,
  // Facetas de la Biblioteca (ver catalog.js): dentro de cada una las opciones se suman.
  filters: { store: [], genre: [], length: [], played: [], rating: [], tag: [] },
  sort: 'name',
  direction: 'asc',
  view: remembered('gml-library-view', 'icons', ['icons', 'explorer']),
  detailTab: 'summary',
  // Alcance de la Biblioteca: 'installed' (por defecto) o '' para toda la cuenta.
  installation: 'installed',
  selectedKey: '',
  page: 'home'
};
// Preferencias de interfaz de este equipo (vista y filtros abiertos); sin almacenamiento se usan los valores por defecto.
function remembered(key, fallback, allowed) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
function remember(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento local no se recuerda */
  }
}
const pendingCoverLoads = new Map();
const coverObserver = new IntersectionObserver(
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
const library = document.querySelector('#library');
const homeShelvesHost = document.querySelector('#home-shelves');
const homeHero = document.querySelector('#home-hero');
const dialog = document.querySelector('#notice');
const editor = document.querySelector('#editor');
const toasts = document.querySelector('#toasts');
let editing = null;
// Título de cada página y palabras con las que la paleta de comandos la encuentra.
const pageMeta = {
  home: ['Inicio', 'inicio para jugar ahora'],
  library: ['Biblioteca', 'biblioteca colección juegos'],
  diagnostics: ['Estado de la biblioteca', 'diagnóstico estado sistema revisión plataformas'],
  settings: ['Configuración', 'configuración preferencias ajustes'],
  game: ['Juego', '']
};
// Iconos de trazo (estilo Lucide, licencia ISC) dibujados inline para no sumar dependencias.
const iconPaths = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  filter: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  gamepad: '<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  palette:
    '<path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 22z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16.5" cy="10.5" r="1"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  archive:
    '<rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M10 13h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>'
};
function icon(name, filled = false) {
  return (
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="' +
    (filled ? 'currentColor' : 'none') +
    '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    iconPaths[name] +
    '</svg>'
  );
}
function hydrateIcons(root) {
  root.querySelectorAll('[data-icon]').forEach((element) => {
    element.innerHTML = icon(element.dataset.icon);
  });
}

function say(message) {
  dialog.querySelector('p').textContent = message;
  dialog.showModal();
}
// Avisos apilados que no interrumpen. type: info, success, error o loading; action: { label, run }.
// Éxitos e información se cierran solos y se pausan con el puntero o el foco encima (WCAG 2.2.1);
// errores y cargas quedan hasta que el usuario los cierra o la operación termina con update().
const toastIcons = { info: 'info', success: 'check', error: 'alert', loading: 'refresh' };
function notify(message, options = {}) {
  const item = document.createElement('div');
  item.className = 'toast';
  item.innerHTML =
    '<span class="toast-icon" aria-hidden="true"></span><p class="toast-text"></p><span class="toast-actions"></span>' +
    '<button type="button" class="toast-close" aria-label="Cerrar aviso">' +
    icon('x') +
    '</button>';
  let timer;
  let deadline = 0;
  let remaining = 0;
  const holds = new Set();
  // Al cerrarse con el foco adentro, el foco vuelve a donde estaba antes de entrar al aviso.
  let returnFocus = null;
  const dismiss = () => {
    clearTimeout(timer);
    if (item.contains(document.activeElement))
      (returnFocus?.isConnected ? returnFocus : document.querySelector('.nav-item.active')).focus();
    item.classList.remove('show');
    setTimeout(() => item.remove(), 200);
  };
  const schedule = (ms) => {
    clearTimeout(timer);
    remaining = ms;
    deadline = Date.now() + ms;
    if (ms && !holds.size) timer = setTimeout(dismiss, ms);
  };
  const hold = (reason) => {
    if (!holds.size && remaining) remaining = Math.max(1500, deadline - Date.now());
    holds.add(reason);
    clearTimeout(timer);
  };
  const release = (reason) => {
    holds.delete(reason);
    if (!holds.size && remaining) schedule(remaining);
  };
  const update = (text, next = {}) => {
    const type = next.type || 'info';
    item.dataset.type = type;
    item.querySelector('.toast-icon').innerHTML = icon(toastIcons[type]);
    item.querySelector('.toast-text').textContent = text;
    const actions = item.querySelector('.toast-actions');
    actions.innerHTML = '';
    if (next.action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'toast-action';
      button.textContent = next.action.label;
      button.onclick = () => {
        dismiss();
        next.action.run();
      };
      actions.append(button);
    }
    schedule(type === 'error' || type === 'loading' ? 0 : next.action ? 8000 : 5000);
  };
  item.querySelector('.toast-close').onclick = dismiss;
  item.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dismiss();
  });
  item.addEventListener('pointerenter', () => hold('pointer'));
  item.addEventListener('pointerleave', () => release('pointer'));
  item.addEventListener('focusin', (event) => {
    if (!item.contains(event.relatedTarget)) returnFocus = event.relatedTarget;
    hold('focus');
  });
  item.addEventListener('focusout', (event) => {
    if (!item.contains(event.relatedTarget)) release('focus');
  });
  update(message, options);
  toasts.append(item);
  requestAnimationFrame(() => item.classList.add('show'));
  // Como máximo tres a la vista: se descarta el más viejo que no sea una carga en curso.
  const stack = [...toasts.children].filter((toast) => toast.dataset.type !== 'loading');
  if (toasts.children.length > 3 && stack[0]) stack[0].remove();
  return { update, dismiss };
}
function notifyError(error, retry) {
  return notify(error.message || 'No se pudo completar la acción.', {
    type: 'error',
    action: retry && { label: 'Reintentar', run: retry }
  });
}
// Deshace un cambio de preferencias sobre la versión vigente del juego (load() reemplaza los objetos).
function undoPreference(game, patch, message) {
  return async () => {
    try {
      await updatePreference(state.games.find((item) => item.key === game.key) || game, patch);
      notify(message, { type: 'success' });
    } catch (error) {
      notifyError(error);
    }
  };
}
// Errores de formulario junto al campo que los causa: aria-invalid, aria-describedby y foco en el primero.
// Los errores que no corresponden a un campo (por ejemplo, del servidor) van al .form-error del formulario.
function setFieldError(input, message) {
  const id = input.id + '-error';
  let error = document.getElementById(id);
  if (!error) {
    error = document.createElement('p');
    error.id = id;
    error.className = 'field-error';
    (input.closest('label, .field-row') || input).after(error);
  }
  error.innerHTML = icon('alert') + '<span></span>';
  error.querySelector('span').textContent = message;
  input.setAttribute('aria-invalid', 'true');
  const described = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
  if (!described.includes(id)) input.setAttribute('aria-describedby', [id, ...described].join(' '));
}
function clearFieldError(input) {
  const id = input.id + '-error';
  document.getElementById(id)?.remove();
  input.removeAttribute('aria-invalid');
  const described = (input.getAttribute('aria-describedby') || '').split(' ').filter((item) => item && item !== id);
  if (described.length) input.setAttribute('aria-describedby', described.join(' '));
  else input.removeAttribute('aria-describedby');
}
function setFormError(form, message) {
  form.querySelector('.form-error').textContent = message;
}
// errors: lista de [campo, mensaje]. Devuelve true si el formulario es válido.
function showFormErrors(form, errors) {
  form.querySelectorAll('[aria-invalid]').forEach(clearFieldError);
  setFormError(form, '');
  errors.forEach(([input, message]) => setFieldError(input, message));
  errors[0]?.[0].focus();
  return errors.length === 0;
}
['input', 'change'].forEach((type) =>
  document.addEventListener(type, (event) => {
    if (event.target.getAttribute?.('aria-invalid')) clearFieldError(event.target);
  })
);
async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la acción.');
  return data;
}
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );
}
function tagsOf(game) {
  return Array.isArray(game.tags) ? game.tags : [];
}
// Juegos visibles en la Biblioteca: filtrados, ordenados y con los duplicados entre tiendas agrupados.
function visibleEntries() {
  const filtered = GMLCatalog.filterGames(state.games, {
    query: state.query,
    scope: state.installation,
    filters: state.filters,
    favorite: state.favorite
  });
  return GMLCatalog.collapseDuplicates(GMLCatalog.sortGames(filtered, state.sort, state.direction));
}
function visibleGames() {
  return visibleEntries().map((entry) => entry.game);
}
// Colección sin duplicados entre tiendas, para Inicio.
function uniqueGames() {
  return GMLCatalog.collapseDuplicates(state.games).map((entry) => entry.game);
}
function otherCopies(game) {
  const key = GMLCatalog.titleKey(game.name);
  return state.games.filter((item) => item !== game && GMLCatalog.titleKey(item.name) === key);
}
function coverInfo(game) {
  const palette = {
    Steam: 'steam',
    'Epic Games': 'epic',
    'Xbox / Microsoft Store': 'xbox',
    'Ubisoft Connect': 'ubisoft',
    'EA app': 'ea',
    'GOG Galaxy': 'gog'
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
function statusText(game) {
  if (game.installed === false) return 'No instalado';
  return game.status === 'installed'
    ? game.launch && game.launch.available
      ? 'Listo para jugar'
      : 'Inicio pendiente'
    : 'Requiere revisión';
}
// Color dominante del arte de cada juego: tiñe el brillo de la portada y el fondo ambiental.
// Se calcula una sola vez sobre una miniatura de 24×36 y se recuerda entre sesiones.
const artColors = new Map(
  (() => {
    try {
      return Object.entries(JSON.parse(localStorage.getItem('gml-art-colors') || '{}'));
    } catch {
      return [];
    }
  })()
);
let saveArtColorsTimer;
function rememberArtColor(key, color) {
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
function dominantColor(image) {
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
function applyArtColor(element, game, image) {
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
let ambientTimer;
function setAmbient(game) {
  clearTimeout(ambientTimer);
  ambientTimer = setTimeout(() => {
    const color = game && artColors.get(game.key);
    if (color) document.body.style.setProperty('--ambient', color);
    else document.body.style.removeProperty('--ambient');
  }, 90);
}
// La portada manual tiene prioridad; después, la imagen del launcher (hero apaisada si se pide).
function artSources(game, preferHero) {
  const artwork = game.artwork || {};
  const sources = [];
  if (game.coverFile) sources.push({ url: '/covers/' + encodeURIComponent(game.coverFile), kind: 'portrait' });
  if (preferHero && artwork.hero) sources.push({ url: '/api/art/hero/' + encodeURIComponent(game.key), kind: 'hero' });
  if (artwork.cover) sources.push({ url: '/api/art/cover/' + encodeURIComponent(game.key), kind: artwork.cover });
  return sources;
}
function applyCover(element, game, cover, preferHero = false) {
  const initial = element.querySelector('.cover-initial');
  if (initial) initial.textContent = cover.initials || 'G';
  const sources = artSources(game, preferHero);
  // Cada imagen se aplica sólo si carga; si todas fallan quedan las iniciales.
  const tryNext = () => {
    const source = sources.shift();
    if (!source) return;
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
    image.onerror = tryNext;
    image.src = source.url;
  };
  pendingCoverLoads.set(element, tryNext);
  coverObserver.observe(element);
}
// Descarta las cargas de imágenes que quedaron fuera de pantalla después de redibujar. Se llama una vez
// que todo está insertado: las filas se arman antes de entrar al documento y no deben descartarse antes.
function pruneCoverLoads() {
  for (const target of pendingCoverLoads.keys())
    if (!target.isConnected) {
      coverObserver.unobserve(target);
      pendingCoverLoads.delete(target);
    }
}
// Acciones compartidas por portadas, filas, tabla y ficha. Los botones nacen fuera del orden de Tab;
// selectTile los habilita sólo en el elemento activo de cada colección.
function playButtonHtml(game, className) {
  const available = game.launch && game.launch.available;
  return (
    '<button type="button" class="' +
    className +
    '" data-action="play" tabindex="-1">' +
    icon(game.installed === false ? 'download' : available ? 'play' : 'alert', available) +
    '<span class="label"></span></button>'
  );
}
function iconActionsHtml(game) {
  return (
    '<button type="button" class="icon-btn" data-action="favorite" tabindex="-1">' +
    icon('star', game.favorite) +
    '</button><button type="button" class="icon-btn" data-action="edit" tabindex="-1">' +
    icon('pencil') +
    '</button>'
  );
}
function decorateActions(root, game) {
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
function metaLineHtml() {
  return '<p class="poster-meta"><span class="platform-name"></span><span class="status-pill"></span></p>';
}
function fillMetaLine(root, game) {
  const available = game.launch && game.launch.available;
  root.querySelector('.platform-name').textContent = game.platform;
  const status = root.querySelector('.status-pill');
  status.textContent = game.installed === false ? 'No instalado' : available ? 'Listo' : 'Requiere revisión';
  setStatusTone(status, game);
}
// Verde sólo para lo que se puede jugar ya; ámbar para lo que requiere revisión; neutro para lo no instalado.
function setStatusTone(element, game) {
  const available = game.launch && game.launch.available;
  element.classList.toggle('attention', !available && game.installed !== false);
  element.classList.toggle('muted', game.installed === false);
  element.classList.toggle('ready', Boolean(available) && game.installed !== false);
}
function lastPlayedText(game) {
  return game.lastLaunchedAt ? new Date(game.lastLaunchedAt).toLocaleDateString('es-AR') : 'Aún no registrado';
}
function playOrReview(game) {
  if (game.installed === false && game.platform === 'Steam' && game.ownership === 'owned')
    return installSteamGame(game);
  if (game.launch && game.launch.available) playGame(game);
  else say(game.evidence);
}
// Tabla para comparar: encabezados ordenables con aria-sort. Comparte el orden con el selector de la barra.
const tableColumns = [
  ['name', 'Nombre', 'ascending'],
  ['platform', 'Tienda', 'ascending'],
  ['status', 'Estado', 'ascending'],
  ['hours', 'Horas jugadas', 'descending'],
  ['recent', 'Última sesión', 'descending'],
  ['rating', 'Valoración', 'descending'],
  ['length', 'Duración', 'ascending']
];
function setSort(sort, direction = 'asc') {
  state.sort = sort;
  state.direction = direction;
  document.querySelector('#sort').value = sort;
}
function makeTable(entries) {
  const table = document.createElement('table');
  table.className = 'data-table games-table';
  table.innerHTML =
    '<caption class="visually-hidden">Juegos de la biblioteca</caption><thead><tr></tr></thead><tbody></tbody>';
  const headRow = table.querySelector('thead tr');
  tableColumns.forEach(([field, label, natural], index) => {
    const active = state.sort === field;
    const inverse = { ascending: 'descending', descending: 'ascending' };
    const th = document.createElement('th');
    th.scope = 'col';
    th.setAttribute('aria-sort', active ? (state.direction === 'asc' ? natural : inverse[natural]) : 'none');
    th.innerHTML =
      '<button type="button" class="sort-button"><span></span><span class="sort-indicator" aria-hidden="true"></span></button>';
    th.querySelector('span').textContent = label;
    const shown = active ? (state.direction === 'asc' ? natural : inverse[natural]) : '';
    th.querySelector('.sort-indicator').textContent = shown === 'ascending' ? '↑' : shown === 'descending' ? '↓' : '↕';
    th.querySelector('button').classList.toggle('active', active);
    th.querySelector('button').onclick = () => {
      setSort(field, active && state.direction === 'asc' ? 'desc' : 'asc');
      renderLibrary();
      library.querySelectorAll('.sort-button')[index].focus();
    };
    headRow.append(th);
  });
  const actionsHeader = document.createElement('th');
  actionsHeader.scope = 'col';
  actionsHeader.innerHTML = '<span class="visually-hidden">Acciones</span>';
  headRow.append(actionsHeader);
  const body = table.querySelector('tbody');
  entries.forEach(({ game, alsoOn }) => {
    const row = document.createElement('tr');
    row.className = 'tile' + (game.key === state.selectedKey ? ' selected' : '');
    row.dataset.key = game.key;
    row.tabIndex = -1;
    row.innerHTML =
      '<th scope="row" class="cell-name"><span class="cell-game"><span class="cell-thumb"><span class="cover-initial"></span></span>' +
      '<span class="cell-title"><span class="cell-label"></span><small></small></span></span></th>' +
      '<td></td><td><span class="status-pill"></span></td><td class="cell-number"></td><td></td><td class="cell-number"></td>' +
      '<td class="cell-number"></td><td class="cell-actions">' +
      playButtonHtml(game, 'button small') +
      '</td>';
    applyCover(row.querySelector('.cell-thumb'), game, coverInfo(game));
    row.querySelector('.cell-label').textContent = game.name;
    if (game.favorite)
      row
        .querySelector('.cell-label')
        .insertAdjacentHTML('afterbegin', '<span class="favorite-mark">' + icon('star', true) + '</span>');
    row.querySelector('small').textContent = alsoOn.length
      ? 'También en ' + alsoOn.map((item) => item.platform).join(', ')
      : '';
    const cells = row.querySelectorAll('td');
    const played = GMLCatalog.lastPlayed(game);
    cells[0].textContent = game.platform;
    cells[1].firstChild.textContent =
      game.installed === false ? 'No instalado' : game.launch && game.launch.available ? 'Listo' : 'Revisar';
    setStatusTone(cells[1].firstChild, game);
    cells[2].textContent = GMLShelves.hours(GMLCatalog.hoursPlayed(game)) || '—';
    cells[3].textContent = played ? GMLShelves.relativeDay(new Date(played).toISOString()) : '—';
    cells[4].textContent = GMLCatalog.rating(game) ?? '—';
    cells[5].textContent = GMLCatalog.length(game) ? GMLShelves.hours(GMLCatalog.length(game)) : '—';
    body.append(row);
    decorateActions(row, game);
  });
  return table;
}
function metaSection(meta) {
  const section = document.createElement('section');
  section.className = 'game-meta';
  const facts = [
    meta.year,
    (meta.developers || []).join(', '),
    meta.rating ? 'Valoración ' + meta.rating + '/100' : ''
  ].filter(Boolean);
  if (facts.length) {
    const line = document.createElement('p');
    line.className = 'meta-facts';
    line.textContent = facts.join(' · ');
    section.append(line);
  }
  if (meta.genres && meta.genres.length) {
    const genres = document.createElement('div');
    genres.className = 'tag-list meta-genres';
    meta.genres.forEach((genre) => {
      const label = document.createElement('span');
      label.textContent = genre;
      genres.append(label);
    });
    section.append(genres);
  }
  if (meta.summary) {
    const summary = document.createElement('p');
    summary.className = 'meta-summary';
    summary.textContent = meta.summary;
    section.append(summary);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'text-button';
    toggle.textContent = 'Leer más';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.onclick = () => {
      const expanded = summary.classList.toggle('expanded');
      toggle.textContent = expanded ? 'Leer menos' : 'Leer más';
      toggle.setAttribute('aria-expanded', String(expanded));
    };
    section.append(toggle);
  }
  if (metadataUrl(meta.url)) {
    const link = document.createElement('a');
    link.className = 'meta-source';
    link.href = meta.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Datos de IGDB.com';
    section.append(link);
  }
  return section;
}
function metadataUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
function metadataLink(label, url) {
  const link = document.createElement(metadataUrl(url) ? 'a' : 'span');
  link.textContent = label;
  if (link.tagName === 'A') {
    link.href = metadataUrl(url);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return link;
}
let mediaSession = null;
function openMediaViewer(pictures, index, title, trigger) {
  let viewer = document.querySelector('#media-viewer');
  if (!viewer) {
    viewer = document.createElement('dialog');
    viewer.id = 'media-viewer';
    viewer.className = 'media-viewer';
    viewer.setAttribute('aria-labelledby', 'media-viewer-title');
    viewer.innerHTML =
      '<header class="media-viewer-header"><div>' +
      '<h2 id="media-viewer-title"></h2></div><button type="button" class="icon-btn" aria-label="Cerrar galería">' +
      icon('x') +
      '</button></header><figure><img alt="Imagen de la galería" referrerpolicy="no-referrer" />' +
      '<figcaption id="media-viewer-status" role="status"></figcaption></figure>' +
      '<footer class="media-viewer-footer"><button type="button" class="button" data-gallery="previous">Anterior</button>' +
      '<span class="media-position" aria-live="polite"></span><button type="button" class="button" data-gallery="next">Siguiente</button>' +
      '<button type="button" class="button" data-gallery="retry" hidden>Reintentar imagen</button></footer>';
    viewer.querySelector('.icon-btn').onclick = () => viewer.close();
    viewer.querySelector('[data-gallery=previous]').onclick = () => showMediaImage(-1);
    viewer.querySelector('[data-gallery=next]').onclick = () => showMediaImage(1);
    viewer.querySelector('[data-gallery=retry]').onclick = () => showMediaImage(0);
    viewer.addEventListener('keydown', (event) => {
      // La galería conserva el foco y no activa atajos de la biblioteca que queda detrás.
      event.stopPropagation();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showMediaImage(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    viewer.addEventListener('close', () => {
      const opener = mediaSession?.trigger;
      mediaSession = null;
      viewer.querySelector('img').removeAttribute('src');
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    });
    document.body.append(viewer);
  }
  mediaSession = { pictures, index, title, trigger };
  viewer.querySelector('h2').textContent = title;
  showMediaImage(0);
  viewer.showModal();
}
function showMediaImage(direction) {
  if (!mediaSession) return;
  const viewer = document.querySelector('#media-viewer');
  const session = mediaSession;
  session.index = (session.index + direction + session.pictures.length) % session.pictures.length;
  const picture = session.pictures[session.index];
  const img = viewer.querySelector('img');
  const status = viewer.querySelector('figcaption');
  const retry = viewer.querySelector('[data-gallery=retry]');
  const figure = viewer.querySelector('figure');
  status.textContent = 'Cargando imagen…';
  figure.setAttribute('aria-busy', 'true');
  retry.hidden = true;
  img.hidden = true;
  img.alt = picture.label + ' de ' + session.title;
  viewer.querySelector('.media-position').textContent = session.index + 1 + ' / ' + session.pictures.length;
  viewer.querySelectorAll('[data-gallery=previous], [data-gallery=next]').forEach((button) => {
    button.disabled = session.pictures.length < 2;
  });
  img.onload = () => {
    img.hidden = false;
    figure.setAttribute('aria-busy', 'false');
    status.textContent = picture.label + ' · Usá las flechas para recorrer o Esc para cerrar.';
  };
  img.onerror = () => {
    figure.setAttribute('aria-busy', 'false');
    status.textContent = 'No se pudo cargar la imagen. Revisá tu conexión y reintentá.';
    retry.hidden = false;
  };
  img.src = 'https://images.igdb.com/igdb/image/upload/t_1080p/' + picture.id + '.jpg';
}
function appendExtendedMetadata(section, meta, mediaSection) {
  const addSection = (title, populate, target = section) => {
    const details = document.createElement('details');
    details.className = 'detail-section metadata-section';
    const heading = document.createElement('summary');
    heading.textContent = title;
    const body = document.createElement('div');
    body.className = 'metadata-content';
    populate(body);
    if (!body.childElementCount) return;
    details.append(heading, body);
    details.open = title === 'Acerca del juego' || target === mediaSection;
    target.append(details);
  };
  const factList = (body, rows) => {
    const dl = document.createElement('dl');
    dl.className = 'detail-tech';
    rows.forEach(([label, value]) => {
      if (!value) return;
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      dl.append(dt, dd);
    });
    if (dl.childElementCount) body.append(dl);
  };
  const list = (body, items) => {
    if (!items.length) return;
    const ul = document.createElement('ul');
    items.forEach((item) => {
      const li = document.createElement('li');
      if (typeof item === 'string') li.textContent = item;
      else li.append(item);
      ul.append(li);
    });
    body.append(ul);
  };
  const date = (value) =>
    value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '';
  addSection('Acerca del juego', (body) => {
    factList(body, [
      ['Título en IGDB', meta.title],
      ['Tipo', meta.type],
      ['Estado', meta.status],
      ['Edición', meta.versionTitle],
      ['Primer lanzamiento', date(meta.firstReleaseDate)],
      ['Géneros', (meta.genres || []).join(', ')],
      ['Temáticas', (meta.themes || []).join(', ')],
      ['Modos de juego', (meta.modes || []).join(', ')],
      ['Perspectiva', (meta.perspectives || []).join(', ')],
      ['Plataformas', (meta.platforms || []).join(', ')],
      ['Motor', (meta.engines || []).join(', ')],
      ['Colecciones', (meta.collections || []).join(', ')],
      ['Franquicias', (meta.franchises || []).join(', ')],
      ['Palabras clave', (meta.keywords || []).join(', ')],
      [
        'Otros nombres',
        (meta.alternativeNames || [])
          .map((item) => item.name + (item.comment ? ' (' + item.comment + ')' : ''))
          .join('; ')
      ]
    ]);
  });
  if (meta.storyline)
    addSection('Historia · puede contener spoilers', (body) => {
      const p = document.createElement('p');
      p.textContent = meta.storyline;
      body.append(p);
    });
  addSection('Compañías', (body) => {
    const roles = {
      developer: 'Desarrollo',
      publisher: 'Publicación',
      porting: 'Adaptación',
      supporting: 'Colaboración'
    };
    list(
      body,
      (meta.companies || []).map((item) => item.name + ' · ' + item.roles.map((role) => roles[role] || role).join(', '))
    );
  });
  addSection('Valoraciones y duración', (body) => {
    const ratings = meta.ratings || {};
    const duration = (seconds) =>
      Number.isFinite(seconds) && seconds > 0
        ? new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(seconds / 3600) + ' h'
        : '';
    factList(body, [
      ...[
        ['critics', 'Crítica'],
        ['users', 'Comunidad IGDB'],
        ['total', 'Combinada']
      ].map(([key, label]) => [
        label,
        ratings[key]?.value != null ? ratings[key].value + '/100 · ' + ratings[key].count + ' valoraciones' : ''
      ]),
      ['Duración rápida estimada', duration(meta.timeToBeat?.hastily)],
      ['Duración habitual estimada', duration(meta.timeToBeat?.normally)],
      ['Completar al 100 %', duration(meta.timeToBeat?.completely)],
      ['Muestras de duración', meta.timeToBeat?.count ? String(meta.timeToBeat.count) : '']
    ]);
  });
  addSection('Idiomas', (body) => {
    const languages = new Map();
    const supports = { Audio: 'Audio', Subtitles: 'Subtítulos', Interface: 'Interfaz' };
    (meta.languages || []).forEach((item) => {
      const label = item.nativeName || item.name;
      const values = languages.get(label) || new Set();
      if (item.support) values.add(supports[item.support] || item.support);
      languages.set(label, values);
    });
    list(
      body,
      [...languages].map(([name, values]) => name + (values.size ? ' · ' + [...values].join(', ') : ''))
    );
  });
  addSection('Multijugador por plataforma', (body) => {
    (meta.multiplayer || []).forEach((item) => {
      const title = document.createElement('h4');
      title.textContent = item.platform || 'Plataforma sin especificar';
      body.append(title);
      const features = [
        ['campaigncoop', 'Campaña cooperativa'],
        ['dropin', 'Entrada y salida durante la partida'],
        ['lancoop', 'Cooperativo por LAN'],
        ['offlinecoop', 'Cooperativo local'],
        ['onlinecoop', 'Cooperativo en línea'],
        ['splitscreen', 'Pantalla dividida local'],
        ['splitscreenonline', 'Pantalla dividida en línea']
      ];
      list(
        body,
        features.filter(([key]) => item[key]).map(([, label]) => label)
      );
      factList(
        body,
        [
          ['offlinemax', 'Máximo local'],
          ['onlinemax', 'Máximo en línea'],
          ['offlinecoopmax', 'Máximo cooperativo local'],
          ['onlinecoopmax', 'Máximo cooperativo en línea']
        ].map(([key, label]) => [label, item[key] > 0 ? item[key] + ' jugadores' : ''])
      );
    });
  });
  addSection('Clasificaciones de edad', (body) => {
    list(
      body,
      (meta.ageRatings || []).map(
        (item) =>
          item.organization +
          ' ' +
          item.rating +
          (item.descriptions.length ? ' · ' + item.descriptions.join(', ') : '') +
          (item.synopsis ? ' — ' + item.synopsis : '')
      )
    );
  });
  addSection('Lanzamientos por plataforma y región', (body) => {
    list(
      body,
      (meta.releases || []).map((item) =>
        [item.platform, item.region, item.label || date(item.date), item.status].filter(Boolean).join(' · ')
      )
    );
  });
  addSection(
    'Capturas e ilustraciones',
    (body) => {
      const gallery = document.createElement('div');
      gallery.className = 'metadata-gallery';
      const pictures = [
        ...(meta.screenshots || []).map((id) => ({ id, label: 'Captura' })),
        ...(meta.artworks || []).map((id) => ({ id, label: 'Ilustración' }))
      ].filter(({ id }, index, all) => /^[a-z0-9]+$/i.test(id) && all.findIndex((item) => item.id === id) === index);
      pictures.forEach(({ id, label }, index) => {
        const base = 'https://images.igdb.com/igdb/image/upload/';
        const link = document.createElement('button');
        link.type = 'button';
        link.className = 'gallery-thumbnail';
        link.setAttribute('aria-label', 'Ampliar ' + label.toLowerCase() + ' ' + (index + 1) + ' de ' + meta.title);
        link.setAttribute('aria-haspopup', 'dialog');
        link.onclick = () => openMediaViewer(pictures, index, meta.title, link);
        const img = document.createElement('img');
        img.src = base + 't_screenshot_med/' + id + '.jpg';
        img.alt = label + ' de ' + meta.title + ' (' + (index + 1) + ')';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => {
          img.hidden = true;
          link.textContent = img.alt + ' · Ampliar imagen';
        };
        link.replaceChildren(img);
        gallery.append(link);
      });
      if (gallery.childElementCount) body.append(gallery);
    },
    mediaSection
  );
  addSection(
    'Videos y enlaces',
    (body) => {
      list(body, [
        ...(meta.videos || []).map((item) => metadataLink(item.name, item.url)),
        ...(meta.websites || []).map((item) => metadataLink(item.label, item.url))
      ]);
    },
    mediaSection
  );
  addSection('Ediciones y juegos relacionados', (body) => {
    const labels = {
      parent_game: 'Juego base',
      version_parent: 'Edición base',
      dlcs: 'DLC',
      expansions: 'Expansiones',
      standalone_expansions: 'Expansiones independientes',
      remakes: 'Remakes',
      remasters: 'Remasterizaciones',
      ports: 'Adaptaciones',
      expanded_games: 'Versiones ampliadas',
      bundles: 'Paquetes',
      similar_games: 'Juegos similares'
    };
    Object.entries(meta.related || {}).forEach(([key, games]) => {
      if (!games.length) return;
      const heading = document.createElement('h4');
      heading.textContent = labels[key] || key;
      body.append(heading);
      list(
        body,
        games.map((game) => metadataLink(game.name, game.url))
      );
    });
  });
  if (meta.fetchedAt) {
    const updated = document.createElement('p');
    updated.className = 'meta-source';
    updated.textContent =
      'Información descargada: ' +
      date(meta.fetchedAt) +
      (meta.sourceUpdatedAt ? ' · Actualizada en IGDB: ' + date(meta.sourceUpdatedAt) : '');
    section.append(updated);
  }
}
// Descripción del juego: en español desde la tienda de Steam cuando existe; si no, la de IGDB (en inglés).
const steamDescriptions = new Map();
function steamDescription(game) {
  if (game.platform !== 'Steam' || !/^\d+$/.test(game.id)) return Promise.resolve('');
  if (!steamDescriptions.has(game.id))
    steamDescriptions.set(
      game.id,
      request('/api/steam/games/' + encodeURIComponent(game.id) + '/details')
        .then((envelope) => steamPlain(envelope.store?.data?.short_description || ''))
        .catch(() => '')
    );
  return steamDescriptions.get(game.id);
}
function descriptionSection(game) {
  const section = document.createElement('section');
  section.className = 'game-description';
  section.setAttribute('aria-busy', 'true');
  section.innerHTML =
    '<span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line"></span>' +
    '<span class="skeleton skeleton-line short"></span>';
  const english = game.meta?.summary || '';
  // Se espera la versión en español un momento; si no llega, se muestra la de IGDB y se reemplaza al llegar.
  let settled = false;
  const show = (text, source) => {
    settled = true;
    section.setAttribute('aria-busy', 'false');
    section.replaceChildren();
    if (!text) {
      section.remove();
      return;
    }
    const paragraph = document.createElement('p');
    paragraph.className = 'meta-summary';
    paragraph.textContent = text;
    const note = document.createElement('p');
    note.className = 'meta-source';
    note.textContent = source;
    section.append(paragraph);
    if (text.length > 420) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'text-button';
      toggle.textContent = 'Leer más';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.onclick = () => {
        const expanded = paragraph.classList.toggle('expanded');
        toggle.textContent = expanded ? 'Leer menos' : 'Leer más';
        toggle.setAttribute('aria-expanded', String(expanded));
      };
      section.append(toggle);
    }
    section.append(note);
  };
  const fallback = () => show(english, 'Descripción de IGDB, disponible sólo en inglés.');
  const timer = setTimeout(() => !settled && fallback(), 1500);
  steamDescription(game).then((spanish) => {
    clearTimeout(timer);
    if (spanish) show(spanish, 'Descripción de la tienda de Steam.');
    else if (!settled) fallback();
  });
  return section;
}
const launchKinds = {
  uri: 'Mediante el launcher de la tienda',
  file: 'Archivo ejecutable',
  appsFolder: 'Aplicación de Microsoft Store'
};
// Datos técnicos de la instalación, aparte del resumen: sólo hacen falta para resolver problemas.
function installationSection(game) {
  const details = document.createElement('details');
  details.className = 'detail-section launch-details';
  details.innerHTML = '<summary>Instalación</summary><dl class="detail-tech"></dl>';
  const list = details.querySelector('dl');
  [
    ['Estado', statusText(game)],
    ['Unidad', game.drive],
    ['Ubicación', game.location],
    ['Cómo se inicia', game.launch ? launchKinds[game.launch.type] || game.launch.type : ''],
    ['Nombre en la tienda', game.originalName],
    ['Detección', game.evidence]
  ].forEach(([label, value]) => {
    if (!value) return;
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    list.append(term, description);
  });
  return details;
}
function personalSection(game) {
  const section = document.createElement('section');
  section.className = 'detail-section personal-notes';
  section.innerHTML = '<h3>Tus notas</h3><p class="notes"></p><div class="tag-list personal-tags"></div>';
  section.querySelector('.notes').textContent =
    game.notes || 'Todavía no escribiste notas. Usá Editar para agregarlas.';
  tagsOf(game).forEach((tag) => {
    const label = document.createElement('span');
    label.textContent = '#' + tag;
    section.querySelector('.personal-tags').append(label);
  });
  return section;
}
// Pestañas de la ficha (Resumen, Información, Multimedia y, en Steam, Steam y Logros).
// Se usan en la vista Ficha de la Biblioteca y en la página de cada juego.
function gameTabs(game, { summaryExtras = [], prefix = 'detail' } = {}) {
  const tabs = document.createElement('div');
  tabs.className = 'detail-tabs';
  const tablist = document.createElement('div');
  tablist.className = 'detail-tablist';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Secciones de la ficha');
  const content = new Map();
  tabs.append(tablist);
  [
    ['summary', 'Resumen'],
    ['information', 'Información'],
    ['media', 'Multimedia'],
    ...(game.platform === 'Steam'
      ? [
          ['steam', 'Steam'],
          ['achievements', 'Logros']
        ]
      : [])
  ].forEach(([key, label]) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = prefix + '-tab-' + key;
    tab.textContent = label;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', prefix + '-panel-' + key);
    tab.dataset.tab = key;
    const body = document.createElement('section');
    body.id = prefix + '-panel-' + key;
    body.className = 'detail-tabpanel';
    body.setAttribute('role', 'tabpanel');
    body.setAttribute('aria-labelledby', tab.id);
    body.tabIndex = 0;
    content.set(key, body);
    tab.onclick = () => selectDetailTab(key);
    tablist.append(tab);
    tabs.append(body);
  });
  const selectDetailTab = (key, focus = false) => {
    state.detailTab = key;
    tablist.querySelectorAll('[role=tab]').forEach((tab) => {
      const active = tab.dataset.tab === key;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      content.get(tab.dataset.tab).hidden = !active;
      if (active && focus) tab.focus({ preventScroll: true });
    });
    if (key === 'steam' || key === 'achievements') loadSteamGameTab(content.get(key), game, key);
  };
  tablist.addEventListener('keydown', (event) => {
    const keys = [...content.keys()];
    const index = keys.indexOf(event.target.dataset.tab);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? keys.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
    selectDetailTab(keys[next], true);
  });
  const overview = content.get('summary');
  const information = content.get('information');
  const media = content.get('media');
  overview.append(descriptionSection(game));
  if (game.meta) overview.append(metaSection({ ...game.meta, summary: '' }));
  overview.append(...summaryExtras, personalSection(game), installationSection(game));
  if (game.meta) appendExtendedMetadata(information, game.meta, media);
  [
    [
      information,
      'Todavía no hay información ampliada de este juego. Actualizá la información de IGDB en Configuración.'
    ],
    [media, 'IGDB todavía no tiene imágenes, videos ni enlaces disponibles para este juego.']
  ].forEach(([body, message]) => {
    if (body.childElementCount) return;
    const empty = document.createElement('p');
    empty.className = 'detail-empty';
    empty.textContent = message;
    body.append(empty);
  });
  selectDetailTab(content.has(state.detailTab) ? state.detailTab : 'summary');
  return tabs;
}
// Portada en cuadrícula.
// options.caption reemplaza la plataforma bajo el título (por ejemplo, «Ayer» en la fila Continuar).
function makePosterCard(game, options = {}) {
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
async function posterAction(game, action) {
  if (action === 'play') return playOrReview(game);
  if (action === 'page') return openGamePage(game);
  if (action === 'edit') return editGame(game);
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
function tilesOf(container) {
  return [...container.querySelectorAll('.tile')];
}
function selectTile(tile, focus, remember = true) {
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
function tileNeighbor(tile, key) {
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
function gameFor(element) {
  return state.games.find((item) => item.key === element.dataset.key);
}
function bindTiles(container) {
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
bindTiles(library);

function renderLibraryState() {
  const holder = document.querySelector('#library-state');
  const view = state.loading ? 'loading' : state.loadError ? 'error' : state.games.length ? '' : 'empty';
  holder.className = 'library-state ' + view + (view ? '' : ' hidden');
  holder.setAttribute('aria-busy', String(view === 'loading'));
  library.classList.toggle('hidden', Boolean(view));
  if (view === 'loading')
    holder.innerHTML =
      '<span class="visually-hidden">Cargando biblioteca…</span>' +
      '<div class="skeleton skeleton-poster"></div>'.repeat(8);
  if (view === 'error') {
    holder.innerHTML =
      '<span class="state-icon">' +
      icon('alert') +
      '</span><h2>No pudimos cargar tu biblioteca</h2><p></p><button type="button" class="button">' +
      icon('refresh') +
      ' Reintentar</button>';
    holder.querySelector('p').textContent = state.loadError;
    holder.querySelector('button').onclick = () => load();
  }
  if (view === 'empty') {
    holder.innerHTML =
      '<span class="state-icon">' +
      icon('gamepad') +
      '</span><h2>Todavía no hay juegos en tu biblioteca</h2>' +
      '<p>Buscamos instalaciones de Steam, Epic, Xbox, Ubisoft, EA y GOG en esta PC. Si ya tenés juegos instalados, actualizá el inventario.</p>' +
      '<button type="button" class="button primary">' +
      icon('refresh') +
      ' Buscar juegos</button>';
    holder.querySelector('button').onclick = () => document.querySelector('#refresh').click();
  }
  return Boolean(view);
}
// Las portadas se arman una vez por juego y se reutilizan entre búsquedas y filtros: redibujar sólo
// cambia su orden, sin volver a crear elementos ni a pedir imágenes.
const posterCache = new Map();
function cachedPoster(game) {
  let card = posterCache.get(game.key);
  if (!card || card.gameRef !== game) {
    card = makePosterCard(game);
    card.gameRef = game;
    posterCache.set(game.key, card);
  }
  return card;
}
function renderLibrary() {
  const entries = visibleEntries();
  // Si el foco estaba dentro de la grilla, se recupera sobre el mismo juego y acción tras redibujar.
  const focused = library.contains(document.activeElement)
    ? {
        key: document.activeElement.closest('[data-key]')?.dataset.key,
        action: document.activeElement.dataset.action
      }
    : null;
  library.className = 'library ' + (state.view === 'explorer' ? 'table' : 'posters');
  if (renderLibraryState()) {
    library.replaceChildren();
    document.querySelector('#empty-state').classList.add('hidden');
    document.querySelector('#counter').textContent = state.loading ? 'Cargando juegos…' : '';
    return;
  }
  if (!entries.some(({ game }) => game.key === state.selectedKey) && entries[0])
    state.selectedKey = entries[0].game.key;
  if (state.view === 'explorer') library.replaceChildren(makeTable(entries));
  else
    library.replaceChildren(
      ...entries.map(({ game, alsoOn }) => {
        const card = cachedPoster(game);
        const badge = card.querySelector('.poster-badge');
        badge.textContent = alsoOn.length ? alsoOn.length + 1 + ' tiendas' : '';
        badge.title = alsoOn.length ? 'También en ' + alsoOn.map((item) => item.platform).join(', ') : '';
        return card;
      })
    );
  const active =
    library.querySelector('.tile[data-key="' + CSS.escape(state.selectedKey) + '"]') || library.querySelector('.tile');
  if (active) selectTile(active, false);
  const tile = focused?.key && library.querySelector('.tile[data-key="' + CSS.escape(focused.key) + '"]');
  if (tile) (focused.action ? tile.querySelector('[data-action="' + focused.action + '"]') : tile)?.focus();
  const total = GMLCatalog.collapseDuplicates(
    GMLCatalog.filterGames(state.games, { scope: state.installation })
  ).length;
  document.querySelector('#counter').textContent =
    entries.length === total
      ? entries.length + (entries.length === 1 ? ' juego' : ' juegos')
      : entries.length + ' de ' + total + ' juegos';
  document.querySelector('#empty-state').classList.toggle('hidden', entries.length > 0);
  renderActiveFilters();
  renderFacets();
  pruneCoverLoads();
}
// Favoritos, después los jugados hace poco y después los listos para jugar, sin repetir.
function quickGames(limit) {
  const favorites = state.games.filter((game) => game.favorite);
  const recent = [...state.games]
    .filter((game) => game.lastLaunchedAt)
    .sort((a, b) => String(b.lastLaunchedAt).localeCompare(String(a.lastLaunchedAt)));
  return [...favorites, ...recent, ...state.games.filter((game) => game.launch && game.launch.available)]
    .filter((game, index, all) => all.findIndex((item) => item.key === game.key) === index)
    .slice(0, limit);
}
// Inicio: una imagen principal que propone qué jugar y filas por intención (shelves.js elige los juegos).
const heroReasons = {
  recent: 'Seguí donde lo dejaste',
  favorite: 'Uno de tus favoritos',
  rated: 'Muy valorado por la crítica',
  ready: 'Listo para jugar'
};
let heroPicks = [];
let heroKey = '';
function heroGame() {
  return heroPicks.find((pick) => pick.game.key === heroKey) || heroPicks[0];
}
// Pinta el arte panorámico (o la portada desenfocada) detrás de una cabecera, con un fundido entre juegos.
function heroArtUrl(game) {
  const sources = artSources(game, true);
  return (sources.find((source) => source.kind === 'hero') || sources[0])?.url || '';
}
function paintBackdrop(host, game) {
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
    layer.className = 'hero-layer' + (url.includes('/hero/') ? '' : ' is-cover');
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
function showWordmark(image, title, game, host) {
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
function renderHero() {
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
    game.steam && GMLShelves.hours(game.steam.playtimeHours)
      ? GMLShelves.hours(game.steam.playtimeHours) + ' jugadas'
      : '',
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
homeHero.addEventListener('click', (event) => {
  const action = event.target.closest('[data-hero-action]')?.dataset.heroAction;
  const game = state.games.find((item) => item.key === homeHero.dataset.key);
  if (!action || !game) return;
  if (action === 'detail') showGame(game);
  else posterAction(game, action);
});
const shelfCaptions = {
  continue: (game) => GMLShelves.relativeDay(new Date(GMLShelves.lastPlayed(game)).toISOString()),
  short: (game) => 'Unas ' + GMLShelves.hours(game.meta.timeToBeat.normally / 3600),
  rated: (game) => 'Valoración ' + game.meta.rating,
  install: (game) => 'Valoración ' + game.meta.rating
};
function updateShelfControls(shelf) {
  const track = shelf.querySelector('.shelf-track');
  const [previous, next] = shelf.querySelectorAll('.shelf-controls button');
  if (!previous) return;
  previous.disabled = track.scrollLeft <= 4;
  next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  shelf.querySelector('.shelf-controls').classList.toggle('hidden', track.scrollWidth <= track.clientWidth + 4);
}
function renderShelves() {
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
function renderHomeEmpty() {
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
function renderHealthSignals() {
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
function renderHome() {
  heroPicks = GMLShelves.heroCandidates(uniqueGames());
  renderHero();
  renderShelves();
  renderHomeEmpty();
  renderHealthSignals();
  pruneCoverLoads();
}
// ── Página de cada juego ────────────────────────────────────────
const gamePage = document.querySelector('#game-page');
let gameReturn = null;
function gameFacts(game) {
  const facts = [game.platform];
  if (statusText(game) !== 'Listo para jugar') facts.push(statusText(game));
  if (game.meta?.year) facts.push(String(game.meta.year));
  (game.meta?.genres || []).slice(0, 2).forEach((genre) => facts.push(genre));
  if (game.meta?.developers?.[0]) facts.push(game.meta.developers[0]);
  return facts;
}
function statRow(list, label, value) {
  if (!value) return;
  const row = document.createElement('div');
  row.innerHTML = '<dt></dt><dd></dd>';
  row.querySelector('dt').textContent = label;
  row.querySelector('dd').textContent = value;
  list.append(row);
}
// Columna de acción: jugar o instalar, favorito y edición, y la relación del jugador con el juego.
function renderGameAside(game) {
  const aside = document.querySelector('#game-aside');
  aside.dataset.key = game.key;
  aside.innerHTML =
    '<div class="game-actions">' +
    playButtonHtml(game, 'button primary game-play') +
    '<div class="game-secondary"><button type="button" class="button" data-action="favorite">' +
    icon('star', game.favorite) +
    '<span></span></button><button type="button" class="button" data-action="edit">' +
    icon('pencil') +
    '<span>Editar</span></button></div></div><dl class="game-stats"></dl>' +
    '<div class="achievement-ring" hidden><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-track" cx="18" cy="18" r="15.5"/>' +
    '<circle class="ring-value" cx="18" cy="18" r="15.5" pathLength="100"/></svg><p><strong></strong><span></span></p></div>';
  aside.querySelector('[data-action=favorite] span').textContent = game.favorite ? 'En favoritos' : 'Favorito';
  decorateActions(aside, game);
  aside.querySelectorAll('[data-action]').forEach((button) => (button.tabIndex = 0));
  const stats = aside.querySelector('.game-stats');
  const played = GMLShelves.lastPlayed(game);
  const length = game.meta?.timeToBeat?.normally;
  statRow(stats, 'Tiempo jugado', game.steam ? GMLShelves.hours(game.steam.playtimeHours) || 'Sin horas en Steam' : '');
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
async function loadAchievementRing(aside, game) {
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
function renderGamePage(game) {
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
// Espera brevemente la imagen de cabecera para que la transición termine sobre el arte y no sobre un color.
function preloadImage(url, timeout) {
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
async function openGamePage(game, origin) {
  if (!game) return;
  if (state.page !== 'game')
    gameReturn = { page: state.page, scroll: window.scrollY, key: game.key, origin: origin || null };
  const show = () => {
    renderGamePage(game);
    showPage('game');
    window.scrollTo(0, 0);
    document.querySelector('#game-back').focus({ preventScroll: true });
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
function closeGamePage() {
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
document.querySelector('#game-back').onclick = closeGamePage;
document.querySelector('#game-aside').addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  const game = state.games.find((item) => item.key === gamePage.dataset.key);
  if (action && game) posterAction(game, action);
});
function renderScope() {
  const unique = (games) => GMLCatalog.collapseDuplicates(games).length;
  const installed = state.games.filter((game) => game.installed !== false);
  const scope = document.querySelector('#scope');
  // Sin juegos de la cuenta fuera de esta PC el selector no aporta nada y se oculta.
  scope.classList.toggle('hidden', installed.length === state.games.length);
  scope.querySelectorAll('[data-scope]').forEach((button) => {
    const active = button.dataset.scope === state.installation;
    button.setAttribute('aria-pressed', String(active));
    button.querySelector('.count').textContent = button.dataset.scope ? unique(installed) : unique(state.games);
  });
}
function renderFilters() {
  renderScope();
  renderFacets();
}
// Panel de filtros: cada faceta muestra sus opciones con la cantidad de juegos que quedarían al elegirla.
function renderFacets() {
  const panel = document.querySelector('#facet-groups');
  if (!panel) return;
  const counts = GMLCatalog.facetCounts(state.games, {
    query: state.query,
    scope: state.installation,
    filters: state.filters,
    favorite: state.favorite
  });
  const focusedValue = panel.contains(document.activeElement)
    ? [document.activeElement.dataset.facet, document.activeElement.dataset.value]
    : null;
  panel.replaceChildren();
  Object.entries(counts).forEach(([id, facet]) => {
    const selected = state.filters[id];
    const options = facet.options.filter((option) => option.count > 0 || selected.includes(option.value));
    if (!options.length) return;
    const group = document.createElement('section');
    group.className = 'facet';
    group.setAttribute('aria-labelledby', 'facet-' + id);
    group.innerHTML = '<h3></h3><div class="facet-options"></div>';
    group.querySelector('h3').id = 'facet-' + id;
    group.querySelector('h3').textContent = facet.label;
    const holder = group.querySelector('.facet-options');
    const limit = id === 'genre' || id === 'tag' ? 10 : options.length;
    options.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'facet-option';
      button.dataset.facet = id;
      button.dataset.value = option.value;
      button.setAttribute('aria-pressed', String(selected.includes(option.value)));
      button.innerHTML = '<span class="facet-label"></span><span class="facet-count"></span>';
      button.querySelector('.facet-label').textContent = id === 'tag' ? '#' + option.label : option.label;
      button.querySelector('.facet-count').textContent = option.count;
      if (index >= limit && !selected.includes(option.value)) button.hidden = true;
      holder.append(button);
    });
    if (options.length > limit) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'text-button facet-more';
      more.textContent = 'Ver ' + (options.length - limit) + ' más';
      more.onclick = () => {
        holder.querySelectorAll('[hidden]').forEach((button) => (button.hidden = false));
        more.remove();
      };
      group.append(more);
    }
    panel.append(group);
  });
  if (focusedValue)
    panel
      .querySelector('[data-facet="' + focusedValue[0] + '"][data-value="' + CSS.escape(focusedValue[1] || '') + '"]')
      ?.focus();
}
function renderActiveFilters() {
  const labels = [];
  if (state.query)
    labels.push(['“' + state.query + '”', () => (document.querySelector('#search').value = state.query = '')]);
  if (state.favorite) labels.push(['Favoritos', () => (state.favorite = false)]);
  const facetLabels = {
    length: Object.fromEntries(GMLCatalog.facets.length.options),
    played: Object.fromEntries(GMLCatalog.facets.played.options),
    rating: Object.fromEntries(GMLCatalog.facets.rating.options)
  };
  Object.entries(state.filters).forEach(([id, values]) =>
    values.forEach((value) =>
      labels.push([
        id === 'tag' ? '#' + value : facetLabels[id]?.[value] || value,
        () => (state.filters[id] = state.filters[id].filter((item) => item !== value))
      ])
    )
  );
  const holder = document.querySelector('#active-filters');
  holder.innerHTML = '';
  labels.forEach(([label, remove]) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'active-filter';
    chip.setAttribute('aria-label', 'Quitar filtro ' + label);
    chip.innerHTML = '<span></span>' + icon('x');
    chip.querySelector('span').textContent = label;
    chip.onclick = () => {
      remove();
      document.querySelector('#favorites-only').setAttribute('aria-pressed', String(state.favorite));
      renderLibrary();
      (document.querySelector('#active-filters button') || document.querySelector('#search')).focus();
    };
    holder.append(chip);
  });
  document.querySelector('#clear-filters').classList.toggle('hidden', labels.length === 0);
  const badge = document.querySelector('#active-filter-count');
  const facetCount =
    Object.values(state.filters).reduce((sum, values) => sum + values.length, 0) + (state.favorite ? 1 : 0);
  badge.textContent = facetCount;
  badge.classList.toggle('hidden', facetCount === 0);
}
// Quita búsqueda y filtros; el alcance (instalados o toda la cuenta) y el orden se conservan.
function clearFilters() {
  state.query = '';
  state.favorite = false;
  state.filters = { store: [], genre: [], length: [], played: [], rating: [], tag: [] };
  document.querySelector('#search').value = '';
  document.querySelector('#favorites-only').setAttribute('aria-pressed', 'false');
  renderLibrary();
}
async function updatePreference(game, patch) {
  const saved = await request('/api/preferences', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: game.key, ...patch })
  });
  Object.assign(game, saved);
  posterCache.delete(game.key);
  renderHome();
  renderFilters();
  renderLibrary();
  if (state.page === 'game' && gamePage.dataset.key === game.key) renderGameAside(game);
  return saved;
}
function editGame(game) {
  editing = game;
  document.querySelector('#editor-title').textContent = 'Ficha · ' + game.name;
  document.querySelector('#tags-input').value = tagsOf(game).join(', ');
  document.querySelector('#progress-input').value = game.progress || 'Pendiente';
  document.querySelector('#rating-input').value = game.rating || 0;
  document.querySelector('#notes-input').value = game.notes || '';
  document.querySelector('#cover-input').value = '';
  document.querySelector('#launch-type').value = game.launchOverride?.type || '';
  document.querySelector('#launch-target').value = game.launchOverride?.target || '';
  syncLaunchTarget();
  showFormErrors(editor.querySelector('form'), []);
  editor.showModal();
}
const launchPlaceholders = {
  '': 'Se usa la detección automática',
  uri: 'steam://rungameid/1234',
  file: 'C:\\Juegos\\MiJuego\\juego.exe',
  appsFolder: 'Paquete_abc123!App'
};
// Con detección automática la ruta no se usa: se deshabilita para que no parezca obligatoria.
function syncLaunchTarget() {
  const type = document.querySelector('#launch-type').value;
  const target = document.querySelector('#launch-target');
  target.disabled = !type;
  target.placeholder = launchPlaceholders[type];
  if (!type) clearFieldError(target);
}
function editorErrors() {
  const errors = [];
  const tags = document.querySelector('#tags-input');
  if (tags.value.split(',').filter((tag) => tag.trim()).length > 12)
    errors.push([tags, 'Podés usar hasta 12 etiquetas. Quitá algunas para guardar.']);
  const cover = document.querySelector('#cover-input');
  const file = cover.files[0];
  if (file && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    errors.push([cover, 'Elegí una imagen PNG, JPG o WebP.']);
  else if (file && file.size > 5_000_000)
    errors.push([cover, 'La imagen pesa más de 5 MB. Probá con una más liviana.']);
  const type = document.querySelector('#launch-type').value;
  const target = document.querySelector('#launch-target');
  const value = target.value.trim();
  if (type && !value) errors.push([target, 'Escribí la ruta o la URI, o volvé a la detección automática.']);
  else if (type === 'uri' && !/^[a-z][a-z0-9+.-]*:/i.test(value))
    errors.push([target, 'La URI empieza con el protocolo del launcher, por ejemplo steam://rungameid/1234.']);
  else if (type === 'file' && !/^([a-z]:[\\/]|\\\\)/i.test(value))
    errors.push([target, 'Usá la ruta completa, por ejemplo C:\\Juegos\\MiJuego\\juego.exe.']);
  else if (type === 'appsFolder' && !/^[^\\/!\s]+![^\\/!\s]+$/.test(value))
    errors.push([target, 'El identificador tiene la forma Paquete_abc123!App.']);
  return errors;
}
async function uploadCover(game, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const saved = await request('/api/covers', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: game.key, dataUrl: reader.result })
        });
        game.coverFile = saved.coverFile;
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer la portada.'));
    reader.readAsDataURL(file);
  });
}
// Pantalla «Iniciando…»: responde al instante con el arte del juego mientras la tienda lo abre.
const launchOverlay = document.querySelector('#launch-overlay');
const launcherNames = {
  Steam: 'Steam',
  'Epic Games': 'Epic Games',
  'Xbox / Microsoft Store': 'Xbox',
  'Ubisoft Connect': 'Ubisoft Connect',
  'EA app': 'EA app',
  'GOG Galaxy': 'GOG Galaxy'
};
let launchTimer;
function hideLaunchOverlay() {
  clearTimeout(launchTimer);
  launchOverlay.classList.remove('show');
  launchTimer = setTimeout(() => (launchOverlay.hidden = true), 300);
}
function showLaunchOverlay(game) {
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
launchOverlay.addEventListener('click', hideLaunchOverlay);
// Al volver a la aplicación (por ejemplo, después de jugar), la pantalla ya no hace falta.
window.addEventListener('focus', () => {
  if (launchOverlay.classList.contains('done')) hideLaunchOverlay();
});
async function playGame(game) {
  if (game.installed === false) return installSteamGame(game);
  showLaunchOverlay(game);
  try {
    const result = await request('/api/launch/' + encodeURIComponent(game.key), { method: 'POST' });
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
async function exportPreferences() {
  try {
    const data = await request('/api/preferences/export');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    link.download = 'games-meta-launcher-preferencias.json';
    link.click();
    URL.revokeObjectURL(link.href);
    notify('Respaldo preparado.', { type: 'success' });
  } catch (error) {
    notifyError(error, exportPreferences);
  }
}
function restorePreferences(data) {
  return request('/api/preferences/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data)
  });
}
// Antes de restaurar se guarda una copia de lo actual para poder deshacer.
async function importPreferences(file) {
  const notice = notify('Restaurando respaldo…', { type: 'loading' });
  try {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error('El archivo no es un respaldo de Games Meta Launcher.');
    }
    const previous = await request('/api/preferences/export');
    await restorePreferences(data);
    await load();
    notice.update('Preferencias restauradas.', {
      type: 'success',
      action: {
        label: 'Deshacer',
        run: async () => {
          try {
            await restorePreferences(previous);
            await load();
            notify('Se recuperaron tus preferencias anteriores.', { type: 'success' });
          } catch (error) {
            notifyError(error);
          }
        }
      }
    });
  } catch (error) {
    notice.update(error.message || 'No se pudo restaurar el respaldo.', { type: 'error' });
  }
}
async function loadHealth() {
  try {
    const data = await request('/api/health');
    const summary = document.querySelector('#health-summary');
    const tiles = [
      ['Detectados', data.total, 'en tu colección'],
      ['Listos', data.ready, 'con inicio disponible'],
      ['Revisión', data.review, data.review ? 'requieren atención' : 'sin alertas'],
      ['Índice', data.generatedAt ? 'OK' : '—', data.generatedAt ? 'actualizado localmente' : 'pendiente']
    ];
    summary.innerHTML = '';
    tiles.forEach(([label, value, hint]) => {
      const tile = document.createElement('article');
      tile.className = 'stat';
      tile.innerHTML = '<span></span><strong></strong><small></small>';
      tile.querySelector('span').textContent = label;
      tile.querySelector('strong').textContent = value;
      tile.querySelector('small').textContent = hint;
      summary.append(tile);
    });
    const rows = document.querySelector('#platform-health');
    rows.innerHTML = '';
    data.platforms.forEach((platform) => {
      const row = document.createElement('tr');
      row.innerHTML =
        '<th scope="row"></th><td></td><td><div class="meter-cell"><span></span>' +
        '<span class="meter" aria-hidden="true"><span></span></span></div></td><td><span class="status-pill"></span></td>';
      row.querySelector('th').textContent = platform.platform;
      row.querySelectorAll('td')[0].textContent = platform.total;
      row.querySelector('.meter-cell span').textContent = platform.ready + ' de ' + platform.total;
      row.querySelector('.meter span').style.width =
        (platform.total ? (platform.ready / platform.total) * 100 : 0) + '%';
      const status = row.querySelector('.status-pill');
      status.textContent = platform.review ? platform.review + ' para revisar' : 'Sin alertas';
      status.classList.toggle('attention', platform.review > 0);
      rows.append(row);
    });
  } catch (error) {
    notifyError(error, loadHealth);
  }
}
async function loadSchedule() {
  try {
    const data = await request('/api/schedule');
    const status = document.querySelector('#schedule-status');
    if (!data.supported) {
      status.textContent = 'La tarea programada sólo está disponible en Windows.';
      return;
    }
    if (!data.configured) {
      status.textContent = 'No hay una tarea creada. Guardá un horario para activarla.';
      return;
    }
    document.querySelector('#schedule-time').value = data.time || '03:00';
    status.textContent = data.enabled
      ? 'Activa. Se ejecuta todos los días a las ' + (data.time || '03:00') + '.'
      : 'La tarea existe, pero está desactivada.';
  } catch (error) {
    document.querySelector('#schedule-status').textContent = error.message;
  }
}
// Con «Sistema» no se fija atributo y el CSS sigue prefers-color-scheme.
function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    const active = button.dataset.themeOption === theme;
    button.setAttribute('aria-pressed', String(active));
  });
}
async function loadSettings() {
  try {
    const settings = await request('/api/settings');
    applyTheme(settings.theme);
    document.querySelector('#minimize-on-launch').checked = settings.minimizeOnLaunch !== false;
  } catch {
    applyTheme('dark');
  }
}
document.querySelector('#minimize-on-launch').onchange = async (event) => {
  const input = event.currentTarget;
  try {
    await request('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ minimizeOnLaunch: input.checked })
    });
    notify(
      input.checked
        ? 'La ventana se va a minimizar al iniciar un juego.'
        : 'La ventana va a quedar abierta al iniciar un juego.',
      {
        type: 'success'
      }
    );
  } catch (error) {
    input.checked = !input.checked;
    notifyError(error);
  }
};
let igdbPoll;
function describeIgdbStatus(settings, status) {
  if (status.running) return 'Buscando información… ' + status.done + ' de ' + status.total + ' juegos.';
  if (status.error) return status.error;
  if (status.finishedAt)
    return 'Listo: se encontró información de ' + status.matched + ' de ' + status.total + ' juegos.';
  return settings.configured
    ? 'Conectado. Usá «Actualizar información» cuando agregues juegos.'
    : 'Sin conectar. Creá una aplicación en Twitch y pegá acá sus credenciales.';
}
async function loadIgdb() {
  try {
    const [settings, status] = await Promise.all([request('/api/integrations/igdb'), request('/api/metadata/status')]);
    document.querySelector('#igdb-client-id').value = settings.clientId;
    document.querySelector('#igdb-secret').placeholder = settings.configured ? 'Guardado de forma segura' : '';
    document.querySelector('#igdb-refresh').hidden = !settings.configured;
    document.querySelector('#igdb-refresh').disabled = status.running;
    document.querySelector('#igdb-remove').classList.toggle('hidden', !settings.configured);
    showCredentialFields('igdb', settings.configured);
    document.querySelector('#igdb-status').textContent = describeIgdbStatus(settings, status);
    document.querySelector('#igdb-status').classList.toggle('connected', Boolean(settings.configured));
    clearTimeout(igdbPoll);
    if (status.running) igdbPoll = setTimeout(loadIgdb, 1000);
    else if (status.finishedAt && status.finishedAt !== state.metadataLoadedAt) {
      state.metadataLoadedAt = status.finishedAt;
      await load();
    }
  } catch (error) {
    document.querySelector('#igdb-status').textContent = error.message;
  }
}
function showPage(page, { focus = true } = {}) {
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
    loadSchedule();
    loadIgdb();
    loadSteamSettings();
  }
  if (page === 'library' && focus) document.querySelector('#search').focus();
}
async function load() {
  Object.assign(state, { loading: !state.games.length, loadError: '' });
  renderLibrary();
  try {
    const catalog = await request('/api/library');
    state.games = catalog.games;
    posterCache.clear();
    state.generatedAt = catalog.generatedAt;
    renderSyncStatus();
  } catch (error) {
    state.loadError = error.message || 'Revisá que la aplicación siga abierta y volvé a intentarlo.';
  } finally {
    state.loading = false;
  }
  renderHome();
  renderFilters();
  renderLibrary();
}
function setFiltersOpen(open) {
  document.querySelector('#filter-panel').classList.toggle('hidden', !open);
  document.querySelector('#library-page').classList.toggle('filters-open', open);
  document.querySelector('#toggle-filters').setAttribute('aria-expanded', String(open));
  remember('gml-filters-open', open ? 'yes' : 'no');
}
// Abre la página del juego desde cualquier lugar (paleta, imagen principal).
function showGame(game) {
  openGamePage(game);
}

// Paleta de comandos (Control+K): combobox con lista agrupada y aria-activedescendant.
// El foco queda siempre en el campo; las flechas mueven la opción activa y Enter la ejecuta.
const palette = document.querySelector('#palette');
const paletteInput = document.querySelector('#palette-input');
const paletteList = document.querySelector('#palette-list');
let paletteItems = [];
let paletteActive = 0;
function normalize(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
function paletteCommands() {
  const sections = [...document.querySelectorAll('.nav-item[data-page]')].map((button) => ({
    group: 'Secciones',
    label: 'Ir a ' + pageMeta[button.dataset.page][0],
    icon: button.querySelector('[data-icon]').dataset.icon,
    keywords: pageMeta[button.dataset.page].join(' '),
    run: () => showPage(button.dataset.page)
  }));
  const theme = (option, label, iconName) => ({
    group: 'Acciones',
    label,
    icon: iconName,
    keywords: 'tema apariencia modo color',
    run: () => document.querySelector('[data-theme-option="' + option + '"]').click()
  });
  const actions = [
    {
      group: 'Acciones',
      label: 'Buscar juegos nuevos',
      icon: 'refresh',
      keywords: 'escanear buscar juegos nuevos instalados indexar',
      run: () => document.querySelector('#refresh').click()
    },
    {
      group: 'Acciones',
      label: 'Buscar en la biblioteca',
      icon: 'search',
      keywords: 'filtrar',
      hint: '/',
      run: () => showPage('library')
    },
    {
      group: 'Acciones',
      label: 'Mostrar sólo favoritos',
      icon: 'star',
      keywords: 'filtrar estrella',
      run: () => {
        showPage('library');
        state.favorite = true;
        document.querySelector('#favorites-only').setAttribute('aria-pressed', 'true');
        renderLibrary();
      }
    },
    {
      group: 'Acciones',
      label: 'Limpiar filtros de la biblioteca',
      icon: 'filter',
      keywords: 'restablecer quitar',
      run: () => {
        clearFilters();
        showPage('library');
      }
    },
    theme('system', 'Tema: seguir a Windows', 'monitor'),
    theme('light', 'Tema claro', 'sun'),
    theme('dark', 'Tema oscuro', 'moon'),
    {
      group: 'Acciones',
      label: 'Respaldar biblioteca personal',
      icon: 'download',
      keywords: 'exportar copia preferencias backup',
      run: exportPreferences
    }
  ];
  return [...sections, ...actions];
}
function gameCommand(game, group) {
  const available = game.launch && game.launch.available;
  return {
    group,
    label: game.name,
    detail: game.platform + ' · ' + (available ? 'Enter para jugar' : 'Enter para revisar'),
    icon: available ? 'play' : 'alert',
    game,
    keywords: [
      game.platform,
      game.originalName || '',
      ...tagsOf(game),
      ...((game.meta && game.meta.genres) || [])
    ].join(' '),
    run: () => playOrReview(game),
    alternate: () => showGame(game)
  };
}
// Sin texto: acceso rápido, secciones y acciones. Con texto, cada palabra debe aparecer en el nombre o
// ser el comienzo de una palabra clave. Dentro de cada grupo va primero lo que empieza igual y después
// lo que contiene el texto; los grupos se ordenan por su mejor coincidencia (a igualdad, juegos primero).
function paletteMatches(query) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...quickGames(5).map((game) => gameCommand(game, 'Acceso rápido')), ...paletteCommands()];
  const phrase = words.join(' ');
  const rank = (item) => {
    const label = normalize(item.label);
    const keywords = normalize(item.keywords || '').split(/\s+/);
    if (!words.every((word) => label.includes(word) || keywords.some((keyword) => keyword.startsWith(word)))) return -1;
    return label.startsWith(phrase) ? 0 : label.includes(phrase) ? 1 : 2;
  };
  const ranked = (items) =>
    items
      .map((item) => [rank(item), item])
      .filter(([score]) => score >= 0)
      .sort((a, b) => a[0] - b[0]);
  const commands = paletteCommands();
  return [
    ranked(state.games.map((game) => gameCommand(game, 'Juegos'))).slice(0, 8),
    ranked(commands.filter((item) => item.group === 'Secciones')),
    ranked(commands.filter((item) => item.group === 'Acciones'))
  ]
    .filter((group) => group.length)
    .sort((a, b) => a[0][0] - b[0][0])
    .flatMap((group) => group.map(([, item]) => item));
}
function renderPalette() {
  paletteItems = paletteMatches(paletteInput.value);
  paletteList.innerHTML = '';
  let group;
  paletteItems.forEach((item, index) => {
    if (item.group !== paletteItems[index - 1]?.group) {
      group = document.createElement('div');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', 'palette-group-' + index);
      group.innerHTML = '<div class="palette-group-label" role="presentation"></div>';
      group.firstChild.id = 'palette-group-' + index;
      group.firstChild.textContent = item.group;
      paletteList.append(group);
    }
    const option = document.createElement('div');
    option.id = 'palette-option-' + index;
    option.className = 'palette-option';
    option.setAttribute('role', 'option');
    option.innerHTML =
      (item.game ? '<span class="palette-thumb"><span class="cover-initial"></span></span>' : icon(item.icon)) +
      '<span class="palette-label"><span></span></span>';
    if (item.game) applyCover(option.querySelector('.palette-thumb'), item.game, coverInfo(item.game));
    option.querySelector('.palette-label span').textContent = item.label;
    if (item.detail) option.querySelector('.palette-label').insertAdjacentHTML('beforeend', '<small></small>');
    if (item.detail) option.querySelector('small').textContent = item.detail;
    if (item.hint) option.insertAdjacentHTML('beforeend', '<kbd class="search-hint" aria-hidden="true"></kbd>');
    if (item.hint) option.querySelector('kbd').textContent = item.hint;
    option.onpointermove = () => paletteActive !== index && setPaletteActive(index);
    option.onclick = (event) => runPaletteItem(index, event.shiftKey);
    group.append(option);
  });
  pruneCoverLoads();
  const empty = document.querySelector('#palette-empty');
  empty.classList.toggle('hidden', paletteItems.length > 0);
  empty.querySelector('p').textContent = 'No encontramos «' + paletteInput.value.trim() + '».';
  document.querySelector('#palette-status').textContent = paletteItems.length
    ? paletteItems.length + (paletteItems.length === 1 ? ' resultado' : ' resultados')
    : 'Sin resultados';
  setPaletteActive(0);
}
function setPaletteActive(index) {
  paletteActive = index;
  paletteList
    .querySelectorAll('[role=option]')
    .forEach((option) => option.setAttribute('aria-selected', String(option.id === 'palette-option-' + index)));
  const active = document.getElementById('palette-option-' + index);
  if (active) {
    paletteInput.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  } else paletteInput.removeAttribute('aria-activedescendant');
}
// Se cierra antes de ejecutar: así el foco vuelve a la página y el comando puede moverlo donde corresponda.
function runPaletteItem(index, alternate) {
  const item = paletteItems[index];
  if (!item) return;
  palette.close();
  (alternate && item.alternate ? item.alternate : item.run)();
}
function openPalette() {
  if (document.querySelector('dialog[open]')) return;
  paletteInput.value = '';
  renderPalette();
  palette.showModal();
  paletteInput.focus();
}
paletteInput.oninput = renderPalette;
paletteInput.onkeydown = (event) => {
  const count = paletteItems.length;
  if (!count) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    setPaletteActive((paletteActive + (event.key === 'ArrowDown' ? 1 : -1) + count) % count);
  } else if (event.key === 'PageDown' || event.key === 'PageUp') {
    event.preventDefault();
    setPaletteActive(Math.max(0, Math.min(count - 1, paletteActive + (event.key === 'PageDown' ? 5 : -5))));
  } else if (event.key === 'Enter') {
    event.preventDefault();
    runPaletteItem(paletteActive, event.shiftKey);
  }
};
palette.onclick = (event) => {
  if (event.target === palette) palette.close();
};
document.querySelector('#open-palette').onclick = openPalette;

dialog.querySelector('button').onclick = () => dialog.close();
document.querySelector('#search').oninput = (event) => {
  state.query = event.target.value;
  renderLibrary();
};
document.querySelector('#favorites-only').onclick = (event) => {
  state.favorite = !state.favorite;
  event.currentTarget.setAttribute('aria-pressed', String(state.favorite));
  renderLibrary();
};
document.querySelector('#facet-groups').addEventListener('click', (event) => {
  const option = event.target.closest('.facet-option');
  if (!option) return;
  const { facet, value } = option.dataset;
  const selected = state.filters[facet];
  state.filters[facet] = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
  renderLibrary();
});
document.querySelector('#sort').onchange = (event) => {
  setSort(event.target.value);
  renderLibrary();
};
document.querySelector('#clear-filters').onclick = clearFilters;
document.querySelectorAll('#scope [data-scope]').forEach((button) => {
  button.onclick = () => {
    state.installation = button.dataset.scope;
    renderScope();
    renderLibrary();
  };
});
document.querySelector('#empty-clear').onclick = clearFilters;
document.querySelector('#toggle-filters').onclick = () =>
  setFiltersOpen(document.querySelector('#filter-panel').classList.contains('hidden'));
function syncViewButtons() {
  document.querySelectorAll('#views button').forEach((item) => {
    const active = item.dataset.view === state.view;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
}
document.querySelectorAll('#views button').forEach(
  (button) =>
    (button.onclick = () => {
      state.view = button.dataset.view;
      remember('gml-library-view', state.view);
      syncViewButtons();
      renderLibrary();
    })
);
syncViewButtons();
setFiltersOpen(remembered('gml-filters-open', 'no', ['yes', 'no']) === 'yes');
document
  .querySelectorAll('.nav-item[data-page]')
  .forEach((button) => (button.onclick = () => showPage(button.dataset.page)));
editor.querySelectorAll('[data-close]').forEach((button) => (button.onclick = () => editor.close()));
document.querySelector('#launch-type').onchange = syncLaunchTarget;
// El diálogo sólo se cierra si todo se guardó; si no, el error queda a la vista dentro de la ficha.
editor.querySelector('form').onsubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!editing || !showFormErrors(form, editorErrors())) return;
  const game = editing;
  const save = document.querySelector('#save-tags');
  const coverInput = document.querySelector('#cover-input');
  const cover = coverInput.files[0];
  const before = {
    tags: tagsOf(game),
    progress: game.progress || 'Pendiente',
    rating: Number(game.rating) || 0,
    notes: game.notes || '',
    launchOverride: game.launchOverride || null
  };
  const type = document.querySelector('#launch-type').value;
  const target = document.querySelector('#launch-target').value.trim();
  save.disabled = true;
  try {
    await updatePreference(game, {
      tags: document
        .querySelector('#tags-input')
        .value.split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      progress: document.querySelector('#progress-input').value,
      rating: Number(document.querySelector('#rating-input').value),
      notes: document.querySelector('#notes-input').value,
      launchOverride: type ? { type, target } : null
    });
    if (cover) {
      try {
        await uploadCover(game, cover);
      } catch (error) {
        showFormErrors(form, [[coverInput, error.message + ' El resto de la ficha ya se guardó.']]);
        return;
      }
    }
    renderHome();
    renderLibrary();
    editor.close();
    // La portada reemplaza un archivo y no se puede deshacer; el resto de la ficha, sí.
    notify('Ficha de ' + game.name + ' actualizada.', {
      type: 'success',
      action: cover
        ? undefined
        : {
            label: 'Deshacer',
            run: undoPreference(game, before, 'Se recuperó la ficha anterior de ' + game.name + '.')
          }
    });
  } catch (error) {
    setFormError(form, error.message);
  } finally {
    save.disabled = false;
  }
};
// Estado de la última búsqueda de juegos, en palabras relativas y al pie de la barra lateral.
function renderSyncStatus() {
  const status = document.querySelector('#last-update');
  status.textContent = state.generatedAt
    ? 'Biblioteca actualizada ' + GMLShelves.relativeTime(state.generatedAt)
    : 'Todavía no se buscaron juegos.';
  if (state.generatedAt) status.title = new Date(state.generatedAt).toLocaleString('es-AR');
}
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
document.querySelector('#export-preferences').onclick = exportPreferences;
document.querySelector('#import-preferences').onchange = (event) => {
  const file = event.target.files[0];
  if (file) importPreferences(file);
  event.target.value = '';
};
document.querySelector('#schedule-form').onsubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const time = document.querySelector('#schedule-time');
  if (!showFormErrors(form, time.value ? [] : [[time, 'Elegí la hora en que se actualiza la biblioteca.']])) return;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    await request('/api/schedule', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ time: time.value })
    });
    await loadSchedule();
    notify('Horario de indexación guardado.', { type: 'success' });
  } catch (error) {
    setFormError(form, error.message);
  } finally {
    button.disabled = false;
  }
};
document.querySelectorAll('[data-theme-option]').forEach((button) => {
  button.onclick = async () => {
    const theme = button.dataset.themeOption;
    applyTheme(theme);
    try {
      await request('/api/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ theme })
      });
    } catch (error) {
      notifyError(error, () => button.click());
    }
  };
});
// Mismo formato que valida el servidor: entre 10 y 64 letras y números.
function igdbErrors(clientId, secret) {
  const credential = /^[a-z0-9]{10,64}$/i;
  const errors = [];
  if (!clientId.value.trim()) errors.push([clientId, 'Pegá el ID de cliente de tu aplicación de Twitch.']);
  else if (!credential.test(clientId.value.trim()))
    errors.push([clientId, 'El ID de cliente tiene entre 10 y 64 letras y números, sin espacios ni símbolos.']);
  if (!secret.value.trim())
    errors.push([
      secret,
      secret.placeholder
        ? 'Para volver a conectar, pegá el secreto otra vez.'
        : 'Pegá el secreto de tu aplicación de Twitch.'
    ]);
  else if (!credential.test(secret.value.trim()))
    errors.push([secret, 'El secreto tiene entre 10 y 64 letras y números, sin espacios ni símbolos.']);
  return errors;
}
document.querySelector('#igdb-form').onsubmit = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const clientId = document.querySelector('#igdb-client-id');
  const secret = document.querySelector('#igdb-secret');
  if (!showFormErrors(form, igdbErrors(clientId, secret))) return;
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  try {
    await request('/api/integrations/igdb', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: clientId.value, clientSecret: secret.value })
    });
    secret.value = '';
    delete form.dataset.editing;
    notify('IGDB conectado. Buscando información de tus juegos…', { type: 'success' });
    await loadIgdb();
  } catch (error) {
    setFormError(form, error.message);
  } finally {
    button.disabled = false;
  }
};
document.querySelector('#igdb-change').onclick = () => {
  document.querySelector('#igdb-form').dataset.editing = 'true';
  showCredentialFields('igdb', true);
  document.querySelector('#igdb-client-id').focus();
};
document.querySelector('#igdb-refresh').onclick = async () => {
  try {
    await request('/api/metadata/refresh', { method: 'POST' });
    await loadIgdb();
  } catch (error) {
    notifyError(error);
  }
};
document.querySelector('#igdb-remove').onclick = async () => {
  try {
    await request('/api/integrations/igdb', { method: 'DELETE' });
    notify('IGDB desconectado. La información ya descargada se conserva.', { type: 'success' });
    await loadIgdb();
  } catch (error) {
    notifyError(error);
  }
};
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
