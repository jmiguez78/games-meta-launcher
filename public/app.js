const state = {
  games: [],
  platform: '',
  drive: '',
  tag: '',
  query: '',
  favorite: false,
  sort: 'name',
  direction: 'asc',
  view: 'icons',
  selectedKey: '',
  page: 'home'
};
const library = document.querySelector('#library');
const quickLibrary = document.querySelector('#quick-library');
const dialog = document.querySelector('#notice');
const editor = document.querySelector('#editor');
const toasts = document.querySelector('#toasts');
let editing = null;
const pageMeta = {
  home: ['TU COLECCIÓN', 'Para jugar ahora'],
  library: ['BIBLIOTECA', 'Tu colección'],
  diagnostics: ['ESTADO DEL SISTEMA', 'Diagnóstico'],
  settings: ['PREFERENCIAS', 'Configuración']
};
const viewNames = { explorer: 'Tabla', detail: 'Detalle', list: 'Lista', icons: 'Portadas' };
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
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'
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
function sortValue(game, field) {
  if (field === 'recent') return game.lastLaunchedAt || '';
  if (field === 'status') return statusText(game);
  return game[field] || '';
}
function visibleGames() {
  const factor = state.direction === 'asc' ? 1 : -1;
  return state.games
    .filter(
      (game) =>
        (!state.platform || game.platform === state.platform) &&
        (!state.drive || game.drive === state.drive) &&
        (!state.tag || tagsOf(game).includes(state.tag)) &&
        (!state.favorite || game.favorite) &&
        (
          game.name +
          ' ' +
          game.platform +
          ' ' +
          game.location +
          ' ' +
          tagsOf(game).join(' ') +
          (game.meta ? ' ' + (game.meta.genres || []).join(' ') + ' ' + (game.meta.developers || []).join(' ') : '')
        )
          .toLowerCase()
          .includes(state.query.toLowerCase())
    )
    .sort((a, b) => String(sortValue(a, state.sort)).localeCompare(String(sortValue(b, state.sort)), 'es') * factor);
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
  return game.status === 'installed'
    ? game.launch && game.launch.available
      ? 'Listo para jugar'
      : 'Inicio pendiente'
    : 'Requiere revisión';
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
    };
    image.onerror = tryNext;
    image.src = source.url;
  };
  tryNext();
}
// Acciones compartidas por portadas, filas, tabla y ficha. Los botones nacen fuera del orden de Tab;
// selectTile los habilita sólo en el elemento activo de cada colección.
function playButtonHtml(game, className) {
  const available = game.launch && game.launch.available;
  return (
    '<button type="button" class="' +
    className +
    '" data-action="play" tabindex="-1">' +
    icon(available ? 'play' : 'alert', available) +
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
    button.setAttribute('aria-label', (available ? 'Jugar a ' : 'Revisar ') + game.name);
    button.querySelector('.label').textContent = available ? 'Jugar' : 'Revisar';
    button.classList.toggle('review', !available);
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
  return '<p class="poster-meta"><span class="platform-name"></span><span aria-hidden="true">·</span><span class="status-pill"></span></p>';
}
function fillMetaLine(root, game) {
  const available = game.launch && game.launch.available;
  root.querySelector('.platform-name').textContent = game.platform;
  const status = root.querySelector('.status-pill');
  status.textContent = available ? 'Listo' : 'Requiere revisión';
  status.classList.toggle('attention', !available);
}
function lastPlayedText(game) {
  return game.lastLaunchedAt ? new Date(game.lastLaunchedAt).toLocaleDateString('es-AR') : 'Aún no registrado';
}
function playOrReview(game) {
  if (game.launch && game.launch.available) playGame(game);
  else say(game.evidence);
}
// Fila para las vistas Lista y Detalle.
function makeRow(game) {
  const cover = coverInfo(game);
  const row = document.createElement('article');
  row.className = 'game-row tile ' + cover.palette + (game.key === state.selectedKey ? ' selected' : '');
  row.dataset.key = game.key;
  row.tabIndex = -1;
  row.setAttribute('aria-label', game.name + ', ' + game.platform + ', ' + statusText(game));
  row.innerHTML =
    '<div class="row-thumb"><span class="cover-initial"></span></div>' +
    '<div class="row-main"><h3 class="row-title"></h3>' +
    metaLineHtml() +
    '</div><p class="row-played"></p><div class="row-actions">' +
    playButtonHtml(game, 'button small') +
    iconActionsHtml(game) +
    '</div>';
  applyCover(row.querySelector('.row-thumb'), game, cover);
  row.querySelector('.row-title').textContent = game.name;
  fillMetaLine(row, game);
  row.querySelector('.row-played').textContent = game.lastLaunchedAt ? 'Jugado el ' + lastPlayedText(game) : '';
  decorateActions(row, game);
  return row;
}
// Tabla semántica para la vista Tabla: encabezados ordenables con aria-sort.
function makeTable(games) {
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML =
    '<caption class="visually-hidden">Juegos de la biblioteca</caption><thead><tr></tr></thead><tbody></tbody>';
  const headers = [
    ['name', 'Nombre'],
    ['platform', 'Plataforma'],
    ['drive', 'Unidad'],
    ['status', 'Estado'],
    ['recent', 'Última vez jugado']
  ];
  const headRow = table.querySelector('thead tr');
  headers.forEach(([field, label]) => {
    const active = state.sort === field;
    const th = document.createElement('th');
    th.scope = 'col';
    th.setAttribute('aria-sort', active ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none');
    th.innerHTML =
      '<button type="button" class="sort-button"><span></span><span class="sort-indicator" aria-hidden="true"></span></button>';
    th.querySelector('span').textContent = label;
    th.querySelector('.sort-indicator').textContent = active ? (state.direction === 'asc' ? '↑' : '↓') : '↕';
    th.querySelector('button').classList.toggle('active', active);
    th.querySelector('button').onclick = () => {
      state.direction =
        state.sort === field ? (state.direction === 'asc' ? 'desc' : 'asc') : field === 'recent' ? 'desc' : 'asc';
      state.sort = field;
      renderLibrary();
      library.querySelectorAll('.sort-button')[headers.findIndex(([name]) => name === field)].focus();
    };
    headRow.append(th);
  });
  const actionsHeader = document.createElement('th');
  actionsHeader.scope = 'col';
  actionsHeader.innerHTML = '<span class="visually-hidden">Acciones</span>';
  headRow.append(actionsHeader);
  const body = table.querySelector('tbody');
  games.forEach((game) => {
    const row = document.createElement('tr');
    row.className = 'tile' + (game.key === state.selectedKey ? ' selected' : '');
    row.dataset.key = game.key;
    row.tabIndex = -1;
    row.innerHTML =
      '<th scope="row" class="cell-name"></th><td></td><td></td><td></td><td></td><td class="cell-actions">' +
      playButtonHtml(game, 'button small') +
      '</td>';
    const name = row.querySelector('.cell-name');
    name.textContent = game.name;
    if (game.favorite)
      name.insertAdjacentHTML('afterbegin', '<span class="favorite-mark">' + icon('star', true) + '</span>');
    const cells = row.querySelectorAll('td');
    cells[0].textContent = game.platform;
    cells[1].textContent = game.drive || '—';
    cells[2].innerHTML = '<span class="status-pill"></span>';
    cells[2].firstChild.textContent = statusText(game);
    cells[2].firstChild.classList.toggle('attention', !(game.launch && game.launch.available));
    cells[3].textContent = lastPlayedText(game);
    decorateActions(row, game);
    body.append(row);
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
  if (meta.url) {
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
function detailPanel(game) {
  const panel = document.createElement('aside');
  panel.className = 'detail-panel';
  if (!game) {
    panel.innerHTML = '<p class="detail-empty">Elegí un juego para ver su ficha.</p>';
    return panel;
  }
  const cover = coverInfo(game);
  panel.dataset.key = game.key;
  panel.setAttribute('aria-label', 'Ficha de ' + game.name);
  panel.innerHTML =
    '<div class="detail-hero ' +
    cover.palette +
    '"><span class="cover-initial"></span></div><div class="detail-body">' +
    metaLineHtml() +
    '<h2></h2><div class="detail-actions">' +
    playButtonHtml(game, 'button primary') +
    '<button type="button" class="button" data-action="favorite">' +
    icon('star', game.favorite) +
    '<span>' +
    (game.favorite ? 'En favoritos' : 'Favorito') +
    '</span></button><button type="button" class="button" data-action="edit">' +
    icon('pencil') +
    '<span>Editar</span></button></div>' +
    '<dl class="detail-facts"><div><dt>Progreso</dt><dd></dd></div><div><dt>Tu puntuación</dt><dd></dd></div>' +
    '<div><dt>Última vez jugado</dt><dd></dd></div><div><dt>Unidad</dt><dd></dd></div></dl>' +
    '<section class="detail-section"><h3>Notas</h3><p class="notes"></p><div class="tag-list"></div></section>' +
    '<details class="detail-section"><summary>Detalles técnicos</summary><dl class="detail-tech">' +
    '<dt>Ubicación</dt><dd></dd><dt>Detección</dt><dd></dd></dl></details></div>';
  applyCover(panel.querySelector('.detail-hero'), game, cover, true);
  fillMetaLine(panel, game);
  panel.querySelector('h2').textContent = game.name;
  if (game.meta) panel.querySelector('.detail-actions').before(metaSection(game.meta));
  const facts = panel.querySelectorAll('.detail-facts dd');
  facts[0].textContent = game.progress || 'Pendiente';
  facts[1].textContent = game.rating ? '★'.repeat(Math.min(Number(game.rating) || 0, 5)) : 'Sin puntuar';
  facts[2].textContent = lastPlayedText(game);
  facts[3].textContent = game.drive || '—';
  const tech = panel.querySelectorAll('.detail-tech dd');
  tech[0].textContent = game.location;
  tech[1].textContent = game.evidence;
  panel.querySelector('.notes').textContent = game.notes || 'Sin notas personales.';
  tagsOf(game).forEach((tag) => {
    const label = document.createElement('span');
    label.textContent = '#' + tag;
    panel.querySelector('.tag-list').append(label);
  });
  decorateActions(panel, game);
  panel.querySelectorAll('[data-action=favorite], [data-action=edit]').forEach((button) => (button.tabIndex = 0));
  panel.querySelector('[data-action=play]').tabIndex = 0;
  return panel;
}
// Portada en cuadrícula.
function makePosterCard(game) {
  const cover = coverInfo(game);
  const card = document.createElement('article');
  card.className = 'poster tile ' + cover.palette + (game.key === state.selectedKey ? ' selected' : '');
  card.dataset.key = game.key;
  card.tabIndex = -1;
  card.setAttribute('aria-label', game.name + ', ' + game.platform + ', ' + statusText(game));
  card.innerHTML =
    '<div class="poster-art"><span class="cover-initial"></span></div>' +
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
  decorateActions(card, game);
  return card;
}
async function posterAction(game, action) {
  if (action === 'play') return playOrReview(game);
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
  if (focus) tile.focus();
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
function tileSelected(container, tile) {
  container.dispatchEvent(new CustomEvent('tileselect', { detail: tile }));
}
function bindTiles(container) {
  container.dataset.tiles = '';
  container.addEventListener('click', (event) => {
    const host = event.target.closest('[data-key]');
    if (!host || !container.contains(host)) return;
    const action = event.target.closest('[data-action]');
    if (host.classList.contains('tile')) {
      selectTile(host, !action);
      tileSelected(container, host);
    }
    if (action) posterAction(gameFor(host), action.dataset.action);
  });
  container.addEventListener('dblclick', (event) => {
    const tile = event.target.closest('.tile');
    if (tile && !event.target.closest('button')) playOrReview(gameFor(tile));
  });
  container.addEventListener('keydown', (event) => {
    const tile = event.target.closest('.tile');
    if (!tile || event.target !== tile || event.altKey || event.ctrlKey || event.metaKey) return;
    if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = tileNeighbor(tile, event.key);
      selectTile(next, true);
      tileSelected(container, next);
    } else if (event.key === 'Enter') posterAction(gameFor(tile), 'play');
    else if (event.key.toLowerCase() === 'f') posterAction(gameFor(tile), 'favorite');
    else if (event.key.toLowerCase() === 'e') posterAction(gameFor(tile), 'edit');
  });
}
bindTiles(library);
bindTiles(quickLibrary);
// En la vista Detalle, elegir otro juego actualiza la ficha sin redibujar la lista.
library.addEventListener('tileselect', (event) => {
  if (state.view !== 'detail') return;
  library.querySelector('.detail-panel').replaceWith(detailPanel(gameFor(event.detail)));
});
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
function renderLibrary() {
  const games = visibleGames();
  // Si el foco estaba dentro de la grilla, se recupera sobre el mismo juego y acción tras redibujar.
  const focused = library.contains(document.activeElement)
    ? {
        key: document.activeElement.closest('[data-key]')?.dataset.key,
        action: document.activeElement.dataset.action
      }
    : null;
  library.className = 'library ' + { icons: 'posters', list: 'rows', detail: 'detail', explorer: 'table' }[state.view];
  library.innerHTML = '';
  if (renderLibraryState()) {
    document.querySelector('#empty-state').classList.add('hidden');
    document.querySelector('#counter').textContent = state.loading ? 'Cargando juegos…' : '';
    return;
  }
  if (!games.some((game) => game.key === state.selectedKey) && games[0]) state.selectedKey = games[0].key;
  if (state.view === 'explorer') library.append(makeTable(games));
  else if (state.view === 'detail') {
    const results = document.createElement('div');
    results.className = 'detail-results';
    games.forEach((game) => results.append(makeRow(game)));
    library.append(results, detailPanel(games.find((game) => game.key === state.selectedKey)));
  } else games.forEach((game) => library.append(state.view === 'icons' ? makePosterCard(game) : makeRow(game)));
  const active = library.querySelector('.tile.selected') || library.querySelector('.tile');
  if (active) selectTile(active, false);
  const tile = focused?.key && library.querySelector('.tile[data-key="' + CSS.escape(focused.key) + '"]');
  if (tile) (focused.action ? tile.querySelector('[data-action="' + focused.action + '"]') : tile)?.focus();
  document.querySelector('#counter').textContent =
    games.length === state.games.length
      ? games.length + ' juegos'
      : games.length + ' de ' + state.games.length + ' juegos';
  document.querySelector('#view-label').textContent = viewNames[state.view];
  document.querySelector('#empty-state').classList.toggle('hidden', games.length > 0);
  renderActiveFilters();
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
function renderHome() {
  const favorites = state.games.filter((game) => game.favorite);
  const quick = quickGames(6);
  quickLibrary.innerHTML = '';
  quick.forEach((game) => quickLibrary.append(makePosterCard(game)));
  const first = quickLibrary.querySelector('.tile');
  if (first) selectTile(first, false, false);
  document.querySelector('#quick-subtitle').textContent = favorites.length
    ? favorites.length + ' favorito' + (favorites.length === 1 ? '' : 's') + ' para volver a jugar.'
    : 'Marcá favoritos para encontrarlos siempre acá.';
  document.querySelector('#stat-total').textContent = state.games.length;
  document.querySelector('#stat-ready').textContent = state.games.filter(
    (game) => game.launch && game.launch.available
  ).length;
  document.querySelector('#stat-favorites').textContent = favorites.length;
  document.querySelector('#stat-progress').textContent = state.games.filter(
    (game) => game.progress === 'Jugando'
  ).length;
}
function chips(holder, options, selected, allLabel, choose) {
  holder.innerHTML = '';
  [allLabel, ...options].forEach((value) => {
    const button = document.createElement('button');
    button.className = 'chip ' + ((!selected && value === allLabel) || selected === value ? 'active' : '');
    button.textContent = value;
    button.onclick = () => choose(value === allLabel ? '' : value);
    holder.append(button);
  });
}
function renderFilters() {
  chips(
    document.querySelector('#platforms'),
    [...new Set(state.games.map((game) => game.platform))].sort(),
    state.platform,
    'Todas las plataformas',
    (value) => {
      state.platform = value;
      renderFilters();
      renderLibrary();
    }
  );
  const select = (selector, label, values, current, set) => {
    const element = document.querySelector(selector);
    element.innerHTML = '<option value="">' + label + '</option>';
    values.forEach((value) => element.add(new Option(value, value)));
    element.value = current;
    element.onchange = (event) => {
      set(event.target.value);
      renderLibrary();
    };
  };
  select(
    '#drive',
    'Todas las unidades',
    [...new Set(state.games.map((game) => game.drive))].sort(),
    state.drive,
    (value) => (state.drive = value)
  );
  select(
    '#tag',
    'Todas las etiquetas',
    [...new Set(state.games.flatMap(tagsOf))].sort((a, b) => a.localeCompare(b, 'es')),
    state.tag,
    (value) => (state.tag = value)
  );
}
function renderActiveFilters() {
  const labels = [];
  if (state.query)
    labels.push(['“' + state.query + '”', () => (document.querySelector('#search').value = state.query = '')]);
  if (state.platform) labels.push([state.platform, () => (state.platform = '')]);
  if (state.tag) labels.push(['#' + state.tag, () => (state.tag = '')]);
  if (state.drive) labels.push([state.drive, () => (state.drive = '')]);
  if (state.favorite)
    labels.push(['Favoritos', () => (document.querySelector('#favorites-only').checked = state.favorite = false)]);
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
      renderFilters();
      renderLibrary();
      (document.querySelector('#active-filters button') || document.querySelector('#search')).focus();
    };
    holder.append(chip);
  });
  const badge = document.querySelector('#active-filter-count');
  badge.textContent = labels.length;
  badge.classList.toggle('hidden', labels.length === 0);
}
function clearFilters() {
  Object.assign(state, {
    platform: '',
    drive: '',
    tag: '',
    query: '',
    favorite: false,
    sort: 'name',
    direction: 'asc'
  });
  document.querySelector('#search').value = '';
  document.querySelector('#favorites-only').checked = false;
  document.querySelector('#sort').value = 'name';
  renderFilters();
  renderLibrary();
}
async function updatePreference(game, patch) {
  const saved = await request('/api/preferences', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: game.key, ...patch })
  });
  Object.assign(game, saved);
  renderHome();
  renderFilters();
  renderLibrary();
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
async function playGame(game) {
  try {
    await request('/api/launch/' + encodeURIComponent(game.key), { method: 'POST' });
    game.lastLaunchedAt = new Date().toISOString();
    renderHome();
    renderLibrary();
    notify(game.name + ': inicio solicitado.', { type: 'success' });
  } catch (error) {
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
    applyTheme((await request('/api/settings')).theme);
  } catch {
    applyTheme('system');
  }
}
let igdbPoll;
function describeIgdbStatus(settings, status) {
  if (status.running) return 'Buscando información… ' + status.done + ' de ' + status.total + ' juegos.';
  if (status.error) return status.error;
  if (status.finishedAt)
    return 'Listo: se encontró información de ' + status.matched + ' de ' + status.total + ' juegos.';
  return settings.configured
    ? 'Conectado. Usá «Actualizar información» cuando agregues juegos.'
    : 'Sin conectar. Creá una aplicación en Twitch y pegá aquí sus credenciales.';
}
async function loadIgdb() {
  try {
    const [settings, status] = await Promise.all([request('/api/integrations/igdb'), request('/api/metadata/status')]);
    document.querySelector('#igdb-client-id').value = settings.clientId;
    document.querySelector('#igdb-secret').placeholder = settings.configured ? 'Guardado de forma segura' : '';
    document.querySelector('#igdb-refresh').disabled = !settings.configured || status.running;
    document.querySelector('#igdb-remove').classList.toggle('hidden', !settings.configured);
    document.querySelector('#igdb-status').textContent = describeIgdbStatus(settings, status);
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
function showPage(page) {
  state.page = page;
  Object.keys(pageMeta).forEach((name) =>
    document.querySelector('#' + name + '-page').classList.toggle('hidden', name !== page)
  );
  document.querySelectorAll('.nav-item').forEach((button) => {
    const current = button.dataset.page === page;
    button.classList.toggle('active', current);
    if (current) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelector('#page-kicker').textContent = pageMeta[page][0];
  document.querySelector('#page-title').textContent = pageMeta[page][1];
  if (page === 'diagnostics') loadHealth();
  if (page === 'settings') {
    loadSchedule();
    loadIgdb();
  }
  if (page === 'library') document.querySelector('#search').focus();
}
async function load() {
  Object.assign(state, { loading: !state.games.length, loadError: '' });
  renderLibrary();
  try {
    const catalog = await request('/api/library');
    state.games = catalog.games;
    document.querySelector('#last-update').textContent = catalog.generatedAt
      ? 'Actualizado ' + new Date(catalog.generatedAt).toLocaleString('es-AR')
      : 'Aún no se indexó la biblioteca.';
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
  document.querySelector('#toggle-filters').setAttribute('aria-expanded', String(open));
}
// Abre la ficha del juego en la vista Detalle; si los filtros lo ocultan, se limpian.
function showGame(game) {
  showPage('library');
  if (!visibleGames().some((item) => item.key === game.key)) clearFilters();
  state.selectedKey = game.key;
  document.querySelector('#views [data-view="detail"]').click();
  library.querySelector('.tile.selected')?.focus();
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
  const sections = [...document.querySelectorAll('.nav-item')].map((button) => ({
    group: 'Secciones',
    label: 'Ir a ' + button.textContent.trim(),
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
      label: 'Actualizar inventario',
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
        state.favorite = document.querySelector('#favorites-only').checked = true;
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
    keywords: [game.platform, ...tagsOf(game), ...((game.meta && game.meta.genres) || [])].join(' '),
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
    option.innerHTML = icon(item.icon) + '<span class="palette-label"><span></span></span>';
    option.querySelector('.palette-label span').textContent = item.label;
    if (item.detail) option.querySelector('.palette-label').insertAdjacentHTML('beforeend', '<small></small>');
    if (item.detail) option.querySelector('small').textContent = item.detail;
    if (item.hint) option.insertAdjacentHTML('beforeend', '<kbd class="search-hint" aria-hidden="true"></kbd>');
    if (item.hint) option.querySelector('kbd').textContent = item.hint;
    option.onpointermove = () => paletteActive !== index && setPaletteActive(index);
    option.onclick = (event) => runPaletteItem(index, event.shiftKey);
    group.append(option);
  });
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
document.querySelector('#favorites-only').onchange = (event) => {
  state.favorite = event.target.checked;
  renderLibrary();
};
document.querySelector('#sort').onchange = (event) => {
  state.sort = event.target.value;
  state.direction = event.target.value === 'recent' ? 'desc' : 'asc';
  renderLibrary();
};
document.querySelector('#clear-filters').onclick = clearFilters;
document.querySelector('#empty-clear').onclick = clearFilters;
document.querySelector('#toggle-filters').onclick = () =>
  setFiltersOpen(document.querySelector('#filter-panel').classList.contains('hidden'));
document.querySelectorAll('#views button').forEach(
  (button) =>
    (button.onclick = () => {
      state.view = button.dataset.view;
      document.querySelectorAll('#views button').forEach((item) => {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
      renderLibrary();
    })
);
document.querySelectorAll('.nav-item').forEach((button) => (button.onclick = () => showPage(button.dataset.page)));
document.querySelectorAll('[data-go-library]').forEach((button) => (button.onclick = () => showPage('library')));
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
document.querySelector('#refresh').onclick = async (event) => {
  // currentTarget deja de existir después del primer await; se guarda el botón antes.
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Actualizando…';
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
    button.innerHTML = icon('refresh') + ' Actualizar';
  }
};
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
    notify('IGDB conectado. Buscando información de tus juegos…', { type: 'success' });
    await loadIgdb();
  } catch (error) {
    setFormError(form, error.message);
  } finally {
    button.disabled = false;
  }
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
});
hydrateIcons(document);
loadSettings();
load();
