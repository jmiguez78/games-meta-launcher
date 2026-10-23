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
const template = document.querySelector('#card-template');
const dialog = document.querySelector('#notice');
const editor = document.querySelector('#editor');
const toast = document.querySelector('#toast');
let editing = null;
let toastTimer;
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
  gamepad: '<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/>'
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
function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
}
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
function makeCard(game, compact = false) {
  const node = template.content.cloneNode(true);
  const item = node.querySelector('.game-item');
  const cover = coverInfo(game);
  item.classList.add(cover.palette);
  if (compact) item.classList.add('compact');
  if (game.key === state.selectedKey) item.classList.add('selected');
  applyCover(node.querySelector('.cover'), game, cover);
  node.querySelector('.platform').textContent = game.platform;
  node.querySelector('h3').textContent = game.name;
  const status = node.querySelector('.status');
  status.textContent = statusText(game) + ' · ' + (game.progress || 'Pendiente');
  status.classList.toggle('attention', game.status === 'attention');
  node.querySelector('.location').textContent = game.location;
  const tags = node.querySelector('.tag-list');
  tagsOf(game).forEach((tag) => {
    const label = document.createElement('span');
    label.textContent = '#' + tag;
    tags.append(label);
  });
  const favorite = node.querySelector('.favorite');
  favorite.textContent = game.favorite ? '★' : '☆';
  favorite.classList.toggle('selected', game.favorite);
  favorite.onclick = async (event) => {
    event.stopPropagation();
    try {
      await updatePreference(game, { favorite: !game.favorite });
    } catch (error) {
      say(error.message);
    }
  };
  node.querySelector('.edit').onclick = (event) => {
    event.stopPropagation();
    editGame(game);
  };
  const play = node.querySelector('.play');
  if (!(game.launch && game.launch.available)) {
    play.textContent = 'Revisar';
    play.onclick = (event) => {
      event.stopPropagation();
      say(game.evidence);
    };
  } else
    play.onclick = (event) => {
      event.stopPropagation();
      playGame(game);
    };
  item.onclick = () => {
    state.selectedKey = game.key;
    if (state.page === 'home') showPage('library');
    else if (state.view === 'detail') renderLibrary();
  };
  return node;
}
function lastPlayedText(game) {
  return game.lastLaunchedAt ? new Date(game.lastLaunchedAt).toLocaleDateString('es-AR') : 'Aún no registrado';
}
function playOrReview(game) {
  if (game.launch && game.launch.available) playGame(game);
  else say(game.evidence);
}
function makeExplorerRow(game) {
  const row = document.createElement('div');
  row.className = 'explorer-row' + (game.key === state.selectedKey ? ' selected' : '');
  row.setAttribute('role', 'row');
  row.tabIndex = 0;
  row.title = 'Doble clic o Enter para jugar';
  row.innerHTML =
    '<span class="row-name"></span><span class="row-platform"></span><span class="row-drive"></span><span class="row-status"></span><span class="row-played"></span><span class="row-action"><button class="button play"></button></span>';
  row.querySelector('.row-name').textContent = (game.favorite ? '★ ' : '') + game.name;
  row.querySelector('.row-platform').textContent = game.platform;
  row.querySelector('.row-drive').textContent = game.drive || '—';
  const status = row.querySelector('.row-status');
  status.textContent = statusText(game);
  status.classList.toggle('attention', game.status === 'attention');
  row.querySelector('.row-played').textContent = lastPlayedText(game);
  const play = row.querySelector('.play');
  const available = game.launch && game.launch.available;
  play.textContent = available ? 'Jugar' : 'Revisar';
  play.onclick = (event) => {
    event.stopPropagation();
    playOrReview(game);
  };
  // La selección se marca sin volver a dibujar la tabla para que el doble clic llegue a la misma fila.
  row.onclick = () => {
    state.selectedKey = game.key;
    row.parentElement.querySelectorAll('.explorer-row.selected').forEach((item) => item.classList.remove('selected'));
    row.classList.add('selected');
  };
  row.ondblclick = () => playOrReview(game);
  row.onkeydown = (event) => {
    if (event.key === 'Enter') playOrReview(game);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling;
      if (next && next.classList.contains('explorer-row')) {
        next.focus();
        next.click();
      }
    }
  };
  return row;
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
    summary.title = 'Clic para ver completo';
    summary.onclick = () => summary.classList.toggle('expanded');
    section.append(summary);
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
    panel.innerHTML = '<p>Elegí un juego para ver su información.</p>';
    return panel;
  }
  const cover = coverInfo(game);
  panel.innerHTML =
    '<div class="detail-cover ' +
    cover.palette +
    '">' +
    escapeHtml(cover.initials) +
    '</div><p class="platform">' +
    escapeHtml(game.platform) +
    '</p><h2></h2><p class="detail-status"></p><dl><dt>Ubicación</dt><dd></dd><dt>Estado</dt><dd>' +
    statusText(game) +
    '</dd><dt>Progreso</dt><dd>' +
    escapeHtml(game.progress || 'Pendiente') +
    '</dd><dt>Puntuación</dt><dd>' +
    (game.rating ? '★'.repeat(Math.min(Number(game.rating) || 0, 5)) : 'Sin puntuar') +
    '</dd><dt>Última vez jugado</dt><dd>' +
    lastPlayedText(game) +
    '</dd><dt>Detección</dt><dd></dd></dl><p class="notes"></p><div class="tag-list"></div>';
  applyCover(panel.querySelector('.detail-cover'), game, cover, true);
  panel.querySelector('h2').textContent = game.name;
  panel.querySelector('.detail-status').textContent =
    game.launch && game.launch.available ? 'Disponible para iniciar' : 'Inicio pendiente';
  if (game.meta) panel.querySelector('.detail-status').after(metaSection(game.meta));
  panel.querySelectorAll('dd')[0].textContent = game.location;
  panel.querySelectorAll('dd')[5].textContent = game.evidence;
  panel.querySelector('.notes').textContent = game.notes || 'Sin notas personales.';
  tagsOf(game).forEach((tag) => {
    const label = document.createElement('span');
    label.textContent = '#' + tag;
    panel.querySelector('.tag-list').append(label);
  });
  const actions = document.createElement('div');
  actions.className = 'detail-actions';
  const edit = document.createElement('button');
  edit.className = 'button';
  edit.textContent = 'Editar ficha';
  edit.onclick = () => editGame(game);
  const play = document.createElement('button');
  play.className = 'button primary';
  play.textContent = game.launch && game.launch.available ? 'Jugar' : 'Revisar';
  play.onclick = () => (game.launch && game.launch.available ? playGame(game) : say(game.evidence));
  actions.append(edit, play);
  panel.append(actions);
  return panel;
}
// Portada en cuadrícula: un solo punto de Tab por grilla (tabindex itinerante) y atajos sobre la tarjeta enfocada.
function makePosterCard(game) {
  const cover = coverInfo(game);
  const available = game.launch && game.launch.available;
  const card = document.createElement('article');
  card.className = 'poster ' + cover.palette + (game.key === state.selectedKey ? ' selected' : '');
  card.dataset.key = game.key;
  card.tabIndex = game.key === state.selectedKey ? 0 : -1;
  card.setAttribute('aria-label', game.name + ', ' + game.platform + ', ' + statusText(game));
  card.innerHTML =
    '<div class="poster-art"><span class="cover-initial"></span></div>' +
    '<div class="poster-overlay"><button type="button" class="poster-play" data-action="play" tabindex="-1">' +
    icon(available ? 'play' : 'alert', available) +
    '<span></span></button></div>' +
    '<div class="poster-actions">' +
    '<button type="button" class="icon-btn" data-action="favorite" tabindex="-1">' +
    icon('star', game.favorite) +
    '</button><button type="button" class="icon-btn" data-action="edit" tabindex="-1">' +
    icon('pencil') +
    '</button></div>' +
    '<div class="poster-body"><h3 class="poster-title"></h3>' +
    '<p class="poster-meta"><span class="platform-name"></span><span aria-hidden="true">·</span>' +
    '<span class="status-pill"></span></p></div>';
  applyCover(card.querySelector('.poster-art'), game, cover);
  card.querySelector('.poster-title').textContent = game.name;
  card.querySelector('.platform-name').textContent = game.platform;
  const status = card.querySelector('.status-pill');
  status.textContent = available ? 'Listo' : 'Requiere revisión';
  status.classList.toggle('attention', !available);
  const play = card.querySelector('.poster-play');
  play.querySelector('span').textContent = available ? 'Jugar' : 'Revisar';
  play.classList.toggle('review', !available);
  play.setAttribute('aria-label', (available ? 'Jugar a ' : 'Revisar ') + game.name);
  const favorite = card.querySelector('[data-action=favorite]');
  favorite.setAttribute('aria-pressed', String(Boolean(game.favorite)));
  favorite.setAttribute('aria-label', 'Favorito: ' + game.name);
  favorite.title = game.favorite ? 'Quitar de favoritos' : 'Marcar como favorito';
  const edit = card.querySelector('[data-action=edit]');
  edit.setAttribute('aria-label', 'Editar ficha de ' + game.name);
  edit.title = 'Editar ficha';
  return card;
}
async function posterAction(game, action) {
  if (action === 'play') return playOrReview(game);
  if (action === 'edit') return editGame(game);
  if (action === 'favorite') {
    try {
      await updatePreference(game, { favorite: !game.favorite });
      notify(game.favorite ? game.name + ' se agregó a favoritos.' : game.name + ' se quitó de favoritos.');
    } catch (error) {
      say(error.message);
    }
  }
}
function selectPoster(card, focus) {
  library.querySelectorAll('.poster').forEach((item) => {
    const active = item === card;
    item.classList.toggle('selected', active);
    item.tabIndex = active ? 0 : -1;
    item.querySelectorAll('button').forEach((button) => (button.tabIndex = active ? 0 : -1));
  });
  state.selectedKey = card.dataset.key;
  if (focus) card.focus();
}
function posterNeighbor(card, key) {
  const cards = [...library.querySelectorAll('.poster')];
  const index = cards.indexOf(card);
  const columns = cards.filter((item) => item.offsetTop === cards[0].offsetTop).length || 1;
  const target = {
    ArrowRight: index + 1,
    ArrowLeft: index - 1,
    ArrowDown: index + columns,
    ArrowUp: index - columns,
    Home: 0,
    End: cards.length - 1
  }[key];
  return cards[Math.max(0, Math.min(cards.length - 1, target))];
}
library.addEventListener('click', (event) => {
  const card = event.target.closest('.poster');
  if (!card) return;
  const game = state.games.find((item) => item.key === card.dataset.key);
  const action = event.target.closest('[data-action]');
  selectPoster(card, !action);
  if (action) posterAction(game, action.dataset.action);
});
library.addEventListener('dblclick', (event) => {
  const card = event.target.closest('.poster');
  if (card && !event.target.closest('[data-action]'))
    playOrReview(state.games.find((item) => item.key === card.dataset.key));
});
library.addEventListener('keydown', (event) => {
  const card = event.target.closest('.poster');
  if (!card || event.target !== card || event.altKey || event.ctrlKey || event.metaKey) return;
  const game = state.games.find((item) => item.key === card.dataset.key);
  if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    selectPoster(posterNeighbor(card, event.key), true);
  } else if (event.key === 'Enter') posterAction(game, 'play');
  else if (event.key.toLowerCase() === 'f') posterAction(game, 'favorite');
  else if (event.key.toLowerCase() === 'e') posterAction(game, 'edit');
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
  library.className = 'library ' + (state.view === 'icons' ? 'posters' : state.view);
  library.innerHTML = '';
  if (renderLibraryState()) {
    document.querySelector('#empty-state').classList.add('hidden');
    document.querySelector('#counter').textContent = state.loading ? 'Cargando juegos…' : '';
    return;
  }
  if (!state.selectedKey && games[0]) state.selectedKey = games[0].key;
  if (state.view === 'explorer') {
    const table = document.createElement('section');
    table.className = 'explorer-table';
    const headers = [
      ['name', 'Nombre'],
      ['platform', 'Plataforma'],
      ['drive', 'Unidad'],
      ['status', 'Estado'],
      ['recent', 'Última vez jugado']
    ];
    const head = document.createElement('div');
    head.className = 'explorer-head';
    headers.forEach(([field, label]) => {
      const button = document.createElement('button');
      const active = state.sort === field;
      button.className = active ? 'active' : '';
      button.textContent = label + (active ? (state.direction === 'asc' ? ' ↑' : ' ↓') : ' ↕');
      button.setAttribute('aria-sort', active ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none');
      button.onclick = () => {
        state.direction =
          state.sort === field ? (state.direction === 'asc' ? 'desc' : 'asc') : field === 'recent' ? 'desc' : 'asc';
        state.sort = field;
        renderLibrary();
      };
      head.append(button);
    });
    head.append(document.createElement('span'));
    table.append(head);
    games.forEach((game) => table.append(makeExplorerRow(game)));
    library.append(table);
  } else if (state.view === 'detail') {
    const results = document.createElement('div');
    results.className = 'detail-results';
    games.forEach((game) => results.append(makeCard(game, true)));
    library.append(results, detailPanel(games.find((game) => game.key === state.selectedKey)));
  } else if (state.view === 'icons') {
    if (!games.some((game) => game.key === state.selectedKey) && games[0]) state.selectedKey = games[0].key;
    games.forEach((game) => library.append(makePosterCard(game)));
    const active = library.querySelector('.poster.selected');
    if (active) selectPoster(active, false);
    const card = focused?.key && library.querySelector('.poster[data-key="' + CSS.escape(focused.key) + '"]');
    if (card) (focused.action ? card.querySelector('[data-action="' + focused.action + '"]') : card)?.focus();
  } else games.forEach((game) => library.append(makeCard(game, state.view === 'list')));
  document.querySelector('#counter').textContent =
    games.length === state.games.length
      ? games.length + ' juegos'
      : games.length + ' de ' + state.games.length + ' juegos';
  document.querySelector('#view-label').textContent = viewNames[state.view];
  document.querySelector('#empty-state').classList.toggle('hidden', games.length > 0);
  renderActiveFilters();
}
function renderHome() {
  const favorites = state.games.filter((game) => game.favorite);
  const recent = [...state.games]
    .filter((game) => game.lastLaunchedAt)
    .sort((a, b) => String(b.lastLaunchedAt).localeCompare(String(a.lastLaunchedAt)));
  const quick = [...favorites, ...recent, ...state.games.filter((game) => game.launch && game.launch.available)]
    .filter((game, index, all) => all.findIndex((item) => item.key === game.key) === index)
    .slice(0, 6);
  quickLibrary.innerHTML = '';
  quick.forEach((game) => quickLibrary.append(makeCard(game)));
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
  editor.showModal();
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
    notify(game.name + ': inicio solicitado.');
  } catch (error) {
    say(error.message);
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
    notify('Respaldo preparado.');
  } catch (error) {
    say(error.message);
  }
}
async function importPreferences(file) {
  try {
    const data = JSON.parse(await file.text());
    await request('/api/preferences/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    });
    await load();
    notify('Preferencias restauradas.');
  } catch (error) {
    say(error.message || 'No se pudo restaurar el respaldo.');
  }
}
async function loadHealth() {
  try {
    const data = await request('/api/health');
    const summary = document.querySelector('#health-summary');
    summary.innerHTML =
      '<article><span>Detectados</span><strong>' +
      data.total +
      '</strong><small>en tu colección</small></article><article><span>Listos</span><strong>' +
      data.ready +
      '</strong><small>con inicio disponible</small></article><article><span>Revisión</span><strong>' +
      data.review +
      '</strong><small>requieren atención</small></article><article><span>Índice</span><strong>' +
      (data.generatedAt ? 'OK' : '—') +
      '</strong><small>' +
      (data.generatedAt ? 'actualizado localmente' : 'pendiente') +
      '</small></article>';
    const rows = document.querySelector('#platform-health');
    rows.innerHTML = '';
    data.platforms.forEach((platform) => {
      const row = document.createElement('div');
      row.className = 'health-row';
      row.innerHTML = '<strong></strong><span></span><span></span><span></span>';
      row.querySelector('strong').textContent = platform.platform;
      row.querySelectorAll('span')[0].textContent = platform.total + ' detectados';
      row.querySelectorAll('span')[1].textContent = platform.ready + ' listos';
      row.querySelectorAll('span')[2].textContent = platform.review ? platform.review + ' para revisar' : 'Sin alertas';
      rows.append(row);
    });
  } catch (error) {
    say(error.message);
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
    button.classList.toggle('active', active);
    button.setAttribute('aria-checked', String(active));
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
  document
    .querySelectorAll('.nav-item')
    .forEach((button) => button.classList.toggle('active', button.dataset.page === page));
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
document.querySelector('#save-tags').onclick = async () => {
  if (!editing) return;
  try {
    const type = document.querySelector('#launch-type').value;
    const target = document.querySelector('#launch-target').value.trim();
    await updatePreference(editing, {
      tags: document
        .querySelector('#tags-input')
        .value.split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      progress: document.querySelector('#progress-input').value,
      rating: Number(document.querySelector('#rating-input').value),
      notes: document.querySelector('#notes-input').value,
      launchOverride: type && target ? { type, target } : null
    });
    const cover = document.querySelector('#cover-input').files[0];
    if (cover) await uploadCover(editing, cover);
    renderHome();
    renderLibrary();
    notify('Ficha actualizada.');
  } catch (error) {
    say(error.message);
  }
};
document.querySelector('#refresh').onclick = async (event) => {
  // currentTarget deja de existir después del primer await; se guarda el botón antes.
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Actualizando…';
  try {
    await request('/api/scan', { method: 'POST' });
    await load();
    notify('Inventario actualizado.');
  } catch (error) {
    say(error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = '<span aria-hidden="true">↻</span> Actualizar';
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
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  try {
    await request('/api/schedule', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ time: document.querySelector('#schedule-time').value })
    });
    await loadSchedule();
    notify('Horario de indexación guardado.');
  } catch (error) {
    say(error.message);
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
      say(error.message);
    }
  };
});
document.querySelector('#igdb-form').onsubmit = async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type=submit]');
  const secret = document.querySelector('#igdb-secret');
  button.disabled = true;
  try {
    await request('/api/integrations/igdb', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: document.querySelector('#igdb-client-id').value, clientSecret: secret.value })
    });
    secret.value = '';
    notify('IGDB conectado. Buscando información de tus juegos…');
    await loadIgdb();
  } catch (error) {
    say(error.message);
  } finally {
    button.disabled = false;
  }
};
document.querySelector('#igdb-refresh').onclick = async () => {
  try {
    await request('/api/metadata/refresh', { method: 'POST' });
    await loadIgdb();
  } catch (error) {
    say(error.message);
  }
};
document.querySelector('#igdb-remove').onclick = async () => {
  try {
    await request('/api/integrations/igdb', { method: 'DELETE' });
    notify('IGDB desconectado. La información ya descargada se conserva.');
    await loadIgdb();
  } catch (error) {
    say(error.message);
  }
};
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    showPage('library');
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
