// Biblioteca: colecciones, búsqueda, filtros, orden, vistas y barra fija.
import { applyCover, coverInfo, pruneCoverLoads } from './art.js';
import { bindTiles, cachedPoster, decorateActions, playButtonHtml, selectTile, setStatusTone } from './cards.js';
import { icon } from './icons.js';
import { load } from './main.js';
import { remember, remembered, state } from './state.js';

export const library = document.querySelector('#library');

// Juegos visibles en la Biblioteca: filtrados, ordenados y con los duplicados entre tiendas agrupados.
// Con una lista abierta (F9), la búsqueda y los filtros se aplican sobre los juegos de esa lista.
export function visibleEntries() {
  const list = state.list && (state.lists || []).find((item) => item.id === state.list);
  const filtered = GMLCatalog.filterGames(list ? GMLCatalog.listGames(list, state.games) : state.games, {
    query: state.query,
    scope: list ? '' : state.installation,
    collection: list ? 'all' : activeCollection(),
    filters: state.filters,
    favorite: state.favorite
  });
  return GMLCatalog.collapseDuplicates(GMLCatalog.sortGames(filtered, state.sort, state.direction));
}

export function visibleGames() {
  return visibleEntries().map((entry) => entry.game);
}

// Colección sin duplicados entre tiendas, para Inicio.
export function uniqueGames() {
  return GMLCatalog.collapseDuplicates(state.games).map((entry) => entry.game);
}

export function otherCopies(game) {
  const key = GMLCatalog.titleKey(game.name);
  return state.games.filter((item) => item !== game && GMLCatalog.titleKey(item.name) === key);
}

// Tabla para comparar: encabezados ordenables con aria-sort. Comparte el orden con el selector de la barra.
export const tableColumns = [
  ['name', 'Nombre', 'ascending'],
  ['platform', 'Tienda', 'ascending'],
  ['status', 'Estado', 'ascending'],
  ['hours', 'Horas jugadas', 'descending'],
  ['recent', 'Última sesión', 'descending'],
  ['rating', 'Valoración', 'descending'],
  ['length', 'Duración', 'ascending']
];

export function setSort(sort, direction = 'asc') {
  state.sort = sort;
  state.direction = direction;
  document.querySelector('#sort').value = sort;
}

// Pintado por lotes (F6): con bibliotecas grandes se dibujan las primeras portadas y el resto a medida que el
// desplazamiento se acerca al final. Buscar o filtrar sólo redibuja lo que se ve.
const FIRST_BATCH = 96;
const NEXT_BATCH = 120;
const batch = { entries: [], shown: 0, append: () => {} };
const moreMarker = document.createElement('div');
moreMarker.className = 'library-more';
moreMarker.setAttribute('aria-hidden', 'true');
const moreObserver = new IntersectionObserver((items) => items.some((item) => item.isIntersecting) && showMore(), {
  rootMargin: '1500px 0px'
});
function showMore() {
  if (batch.shown >= batch.entries.length) return;
  const next = batch.entries.slice(batch.shown, batch.shown + NEXT_BATCH);
  batch.shown += next.length;
  batch.append(next);
  if (batch.shown >= batch.entries.length) moreMarker.remove();
  // Si el marcador sigue cerca de la vista (pantalla alta), se sigue sin esperar otro desplazamiento.
  else
    requestAnimationFrame(() => {
      if (moreMarker.isConnected && moreMarker.getBoundingClientRect().top < innerHeight + 1500) showMore();
    });
}
// Dibuja los primeros `count` (al menos el lote inicial) y deja el resto para cuando haga falta.
function paintInBatches(entries, append, count = FIRST_BATCH) {
  Object.assign(batch, { entries, shown: Math.min(entries.length, Math.max(count, FIRST_BATCH)), append });
  append(entries.slice(0, batch.shown));
  if (batch.shown < entries.length) {
    library.after(moreMarker);
    moreObserver.observe(moreMarker);
  } else moreMarker.remove();
}
// Todos los juegos visibles en pantalla (antes de, por ejemplo, saltar al último con Fin).
export function showAllTiles() {
  while (batch.shown < batch.entries.length) showMore();
}
function posterFor({ game, alsoOn }) {
  const card = cachedPoster(game);
  const badge = card.querySelector('.poster-badge');
  badge.textContent = alsoOn.length ? alsoOn.length + 1 + ' tiendas' : '';
  badge.title = alsoOn.length ? 'También en ' + alsoOn.map((item) => item.platform).join(', ') : '';
  return card;
}

export function makeTable(entries) {
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
  return table;
}
function tableRows(entries) {
  return entries.map(({ game, alsoOn }) => {
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
    decorateActions(row, game);
    return row;
  });
}

export function renderLibraryState() {
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

export function renderLibrary() {
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
  // El juego seleccionado o con foco siempre queda dibujado aunque esté más abajo del primer lote.
  const keep = Math.max(
    entries.findIndex(({ game }) => game.key === (focused?.key || state.selectedKey)),
    // Al volver a dibujar con el mismo largo (marcar un favorito), no se pierde lo que ya se veía.
    batch.entries.length === entries.length ? batch.shown - 1 : -1
  );
  if (state.view === 'explorer') {
    const table = makeTable(entries);
    const body = table.querySelector('tbody');
    library.replaceChildren(table);
    paintInBatches(entries, (part) => body.append(...tableRows(part)), keep + 1);
  } else {
    library.replaceChildren();
    paintInBatches(entries, (part) => library.append(...part.map(posterFor)), keep + 1);
  }
  const active =
    library.querySelector('.tile[data-key="' + CSS.escape(state.selectedKey) + '"]') || library.querySelector('.tile');
  if (active) selectTile(active, false);
  const tile = focused?.key && library.querySelector('.tile[data-key="' + CSS.escape(focused.key) + '"]');
  if (tile) (focused.action ? tile.querySelector('[data-action="' + focused.action + '"]') : tile)?.focus();
  const openList = state.list && (state.lists || []).find((item) => item.id === state.list);
  const total = openList
    ? GMLCatalog.collapseDuplicates(GMLCatalog.listGames(openList, state.games)).length
    : collectionTotal();
  document.querySelector('#counter').textContent =
    entries.length === total
      ? entries.length + (entries.length === 1 ? ' juego' : ' juegos')
      : entries.length + ' de ' + total + ' juegos';
  document.querySelector('#empty-state').classList.toggle('hidden', entries.length > 0);
  renderActiveFilters();
  renderFacets();
  pruneCoverLoads();
}

// Total de la colección elegida (sin búsqueda ni filtros): sólo cambia con la biblioteca, el alcance o la colección.
let totalMemo = null;
function collectionTotal() {
  const collection = activeCollection();
  if (totalMemo?.games !== state.games || totalMemo.scope !== state.installation || totalMemo.collection !== collection)
    totalMemo = {
      games: state.games,
      scope: state.installation,
      collection,
      value: GMLCatalog.collapseDuplicates(
        GMLCatalog.filterGames(state.games, { scope: state.installation, collection })
      ).length
    };
  return totalMemo.value;
}

export const hasArcade = () => state.games.some((game) => game.platform === 'Arcade');

// Sin juegos de Arcade no hay colecciones que elegir: se muestran todos.
export function activeCollection() {
  return hasArcade() ? state.collection : 'all';
}

export function renderCollection() {
  const control = document.querySelector('#collection');
  control.classList.toggle('hidden', !hasArcade());
  control.querySelectorAll('[data-collection]').forEach((button) => {
    const value = button.dataset.collection;
    button.setAttribute('aria-pressed', String(value === state.collection));
    button.querySelector('.count').textContent = GMLCatalog.collapseDuplicates(
      GMLCatalog.filterGames(state.games, { collection: value })
    ).length;
  });
}

export function renderScope() {
  renderCollection();
  const unique = (games) => GMLCatalog.collapseDuplicates(games).length;
  const inCollection = GMLCatalog.filterGames(state.games, { collection: activeCollection() });
  const installed = inCollection.filter((game) => game.installed !== false);
  const scope = document.querySelector('#scope');
  // Sin juegos de la cuenta fuera de esta PC el selector no aporta nada y se oculta (Arcade: todo está instalado).
  scope.classList.toggle('hidden', installed.length === inCollection.length);
  scope.querySelectorAll('[data-scope]').forEach((button) => {
    const active = button.dataset.scope === state.installation;
    button.setAttribute('aria-pressed', String(active));
    button.querySelector('.count').textContent = button.dataset.scope ? unique(installed) : unique(inCollection);
  });
}

export function renderFilters() {
  renderScope();
  renderFacets();
}

// Panel de filtros: cada faceta muestra sus opciones con la cantidad de juegos que quedarían al elegirla.
export function renderFacets() {
  const panel = document.querySelector('#facet-groups');
  // Con el panel cerrado no se cuentan las opciones (es lo más costoso de cada tecla): se cuentan al abrirlo.
  if (!panel || document.querySelector('#filter-panel').classList.contains('hidden')) return;
  const counts = GMLCatalog.facetCounts(state.games, {
    query: state.query,
    scope: state.installation,
    collection: activeCollection(),
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

export function renderActiveFilters() {
  const labels = [];
  const list = state.list && (state.lists || []).find((item) => item.id === state.list);
  if (state.list && !list) state.list = null;
  if (list) labels.push(['Lista: ' + list.name, () => (state.list = null)]);
  if (state.query)
    labels.push(['“' + state.query + '”', () => (document.querySelector('#search').value = state.query = '')]);
  if (state.favorite) labels.push(['Favoritos', () => (state.favorite = false)]);
  const facetLabels = {
    length: Object.fromEntries(GMLCatalog.facets.length.options),
    played: Object.fromEntries(GMLCatalog.facets.played.options),
    rating: Object.fromEntries(GMLCatalog.facets.rating.options),
    decade: Object.fromEntries(GMLCatalog.facets.decade.options),
    players: Object.fromEntries(GMLCatalog.facets.players.options)
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
export function clearFilters() {
  state.list = null;
  state.query = '';
  state.favorite = false;
  state.filters = { store: [], genre: [], length: [], played: [], rating: [], decade: [], players: [], tag: [] };
  document.querySelector('#search').value = '';
  document.querySelector('#favorites-only').setAttribute('aria-pressed', 'false');
  renderLibrary();
}

export function setFiltersOpen(open) {
  document.querySelector('#filter-panel').classList.toggle('hidden', !open);
  document.querySelector('#library-page').classList.toggle('filters-open', open);
  document.querySelector('#toggle-filters').setAttribute('aria-expanded', String(open));
  remember('gml-filters-open', open ? 'yes' : 'no');
  if (open) renderFacets();
}

export function syncViewButtons() {
  document.querySelectorAll('#views button').forEach((item) => {
    const active = item.dataset.view === state.view;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
}

// Enlaces de eventos y estado inicial; se llama una vez desde main.js.
export function setup() {
  // Fin lleva al último juego: antes se dibujan los que faltan (fase de captura, antes que bindTiles).
  library.addEventListener('keydown', (event) => event.key === 'End' && showAllTiles(), true);
  bindTiles(library);
  // Barra fija de la Biblioteca: su alto ubica el panel de filtros y el foco; al despegarse toma fondo y borde.
  (() => {
    const toolbar = document.querySelector('#library-page .library-toolbar');
    if (!toolbar) return;
    const measure = () =>
      document.documentElement.style.setProperty('--library-toolbar-h', toolbar.offsetHeight + 'px');
    new ResizeObserver(measure).observe(toolbar);
    const update = () =>
      toolbar.classList.toggle(
        'stuck',
        state.page === 'library' && toolbar.getBoundingClientRect().top <= 0.5 && scrollY > 0
      );
    addEventListener('scroll', update, { passive: true });
  })();
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
  document.querySelectorAll('#collection [data-collection]').forEach((button) => {
    button.onclick = () => {
      state.collection = button.dataset.collection;
      remember('gml-collection', state.collection);
      renderScope();
      renderLibrary();
    };
  });
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
}
