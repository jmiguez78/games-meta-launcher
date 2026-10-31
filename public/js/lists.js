// Listas propias (F9): manuales o automáticas (una búsqueda guardada). Filas en Inicio, filtro en la Biblioteca,
// «Listas» en la página de cada juego y un diálogo para administrarlas.
import { plural, request } from './api.js';
import { notify, notifyError, setFormError } from './feedback.js';
import { renderHome } from './home.js';
import { icon } from './icons.js';
import { activeCollection, renderLibrary } from './library.js';
import { showPage } from './main.js';
import { state } from './state.js';

const managerDialog = document.querySelector('#lists-dialog');
const pickerDialog = document.querySelector('#list-picker');
const json = (method, body) => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
});

export const listById = (id) => (state.lists || []).find((list) => list.id === id);
export const gamesOf = (list) => GMLCatalog.listGames(list, state.games);
export const manualLists = () => (state.lists || []).filter((list) => list.kind === 'manual');

// Ideas de listas automáticas, armadas con los mismos filtros de la Biblioteca.
export const LIST_IDEAS = [
  {
    name: 'Cortos sin estrenar',
    rule: { collection: 'pc', scope: 'installed', filters: { length: ['short'], played: ['never'] }, sort: 'length' }
  },
  {
    name: 'Para el finde',
    rule: {
      collection: 'pc',
      scope: 'installed',
      filters: { length: ['short', 'medium'], rating: ['80'] },
      sort: 'rating'
    }
  },
  { name: 'Arcade de a dos', rule: { collection: 'arcade', filters: { players: ['2'] }, sort: 'rating' } }
];

// Filas de Inicio de las listas marcadas «En Inicio».
export function listShelves(limit = 20) {
  return (state.lists || [])
    .filter((list) => list.home)
    .map((list) => {
      const games = gamesOf(list);
      return {
        id: 'list-' + list.id,
        listId: list.id,
        title: list.name,
        subtitle:
          (list.kind === 'auto' ? 'Lista automática · ' : 'Tu lista · ') + plural(games.length, 'juego', 'juegos'),
        empty:
          list.kind === 'auto'
            ? 'Ningún juego cumple esta lista por ahora.'
            : 'Agregá juegos desde su página, con el botón «Listas».',
        games: games.slice(0, limit)
      };
    });
}

// Abre la Biblioteca mostrando sólo los juegos de la lista.
export function openList(id) {
  state.list = id;
  showPage('library', { focus: false });
  renderLibrary();
}

function upsert(list) {
  const lists = [...(state.lists || [])];
  const index = lists.findIndex((item) => item.id === list.id);
  if (index >= 0) lists[index] = list;
  else lists.push(list);
  state.lists = lists;
}
function refresh() {
  renderHome();
  if (state.page === 'library') renderLibrary();
  if (managerDialog.open) renderManager();
  if (pickerDialog.open) renderPicker();
}

export async function createList(body) {
  const list = await request('/api/lists', json('POST', body));
  upsert(list);
  refresh();
  return list;
}
async function updateList(id, body) {
  upsert(await request('/api/lists/' + encodeURIComponent(id), json('PUT', body)));
  refresh();
}
async function deleteList(list) {
  await request('/api/lists/' + encodeURIComponent(list.id), { method: 'DELETE' });
  state.lists = state.lists.filter((item) => item.id !== list.id);
  if (state.list === list.id) state.list = null;
  refresh();
  notify('Se borró la lista «' + list.name + '».', {
    type: 'success',
    action: {
      label: 'Deshacer',
      run: () => createList(list).catch(notifyError)
    }
  });
}
export async function setMember(list, game, member) {
  upsert(await request('/api/lists/' + encodeURIComponent(list.id) + '/games', json('PUT', { key: game.key, member })));
  refresh();
}

// La búsqueda actual de la Biblioteca como regla de lista automática.
export function currentRule() {
  return {
    query: state.query,
    collection: activeCollection(),
    scope: state.installation,
    favorite: state.favorite,
    filters: Object.fromEntries(Object.entries(state.filters).filter(([, values]) => values.length)),
    sort: state.sort,
    direction: state.direction
  };
}
const hasSearch = () =>
  Boolean(state.query.trim() || state.favorite || Object.values(state.filters).some((values) => values.length));

// ── Administrar listas ──
function renderManager() {
  const holder = document.querySelector('#lists-manage');
  const lists = state.lists || [];
  document.querySelector('#lists-empty').hidden = lists.length > 0;
  holder.replaceChildren(
    ...lists.map((list) => {
      const item = document.createElement('li');
      item.className = 'list-row';
      item.innerHTML =
        '<button type="button" class="list-open"><strong></strong><small></small></button>' +
        '<label class="switch list-home"><input type="checkbox" role="switch" /><span class="switch-track" aria-hidden="true"></span><span>En Inicio</span></label>' +
        '<button type="button" class="icon-btn" data-list-action="rename"></button>' +
        '<button type="button" class="icon-btn" data-list-action="delete"></button>';
      item.querySelector('strong').textContent = list.name;
      item.querySelector('small').textContent =
        (list.kind === 'auto' ? 'Automática' : 'Tuya') + ' · ' + plural(gamesOf(list).length, 'juego', 'juegos');
      item.querySelector('.list-open').setAttribute('aria-label', 'Ver «' + list.name + '» en la Biblioteca');
      item.querySelector('.list-open').onclick = () => {
        managerDialog.close();
        openList(list.id);
      };
      const home = item.querySelector('input');
      home.checked = list.home;
      home.setAttribute('aria-label', 'Mostrar «' + list.name + '» en Inicio');
      home.onchange = () => updateList(list.id, { home: home.checked }).catch(notifyError);
      const rename = item.querySelector('[data-list-action=rename]');
      rename.innerHTML = icon('pencil');
      rename.setAttribute('aria-label', 'Cambiar el nombre de «' + list.name + '»');
      rename.onclick = () => startRename(item, list);
      const remove = item.querySelector('[data-list-action=delete]');
      remove.innerHTML = icon('x');
      remove.setAttribute('aria-label', 'Borrar «' + list.name + '»');
      remove.onclick = () => deleteList(list).catch(notifyError);
      return item;
    })
  );
  document.querySelector('#list-from-search').disabled = !hasSearch();
  document.querySelector('#list-from-search').title = hasSearch()
    ? 'Crea una lista automática con la búsqueda y los filtros de la Biblioteca'
    : 'Buscá o filtrá en la Biblioteca para guardar esa búsqueda';
  const ideas = document.querySelector('#list-ideas');
  const missing = LIST_IDEAS.filter((idea) => !lists.some((list) => list.name === idea.name));
  ideas.closest('.list-ideas').hidden = !missing.length;
  ideas.replaceChildren(
    ...missing.map((idea) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button small';
      button.textContent = idea.name;
      button.onclick = () => createList({ name: idea.name, kind: 'auto', rule: idea.rule }).catch(notifyError);
      return button;
    })
  );
}
function startRename(item, list) {
  const open = item.querySelector('.list-open');
  const input = document.createElement('input');
  input.className = 'list-rename';
  input.value = list.name;
  input.maxLength = 60;
  input.setAttribute('aria-label', 'Nuevo nombre de la lista');
  open.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = async (save) => {
    if (done) return;
    done = true;
    if (save && input.value.trim() && input.value.trim() !== list.name)
      await updateList(list.id, { name: input.value }).catch(notifyError);
    else renderManager();
  };
  input.onkeydown = (event) => {
    if (event.key === 'Enter') finish(true);
    if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  };
  input.onblur = () => finish(true);
}
export function openManager() {
  renderManager();
  setFormError(document.querySelector('#list-create'), '');
  managerDialog.showModal();
}

// ── Listas de un juego ──
let pickerGame = null;
function renderPicker() {
  const options = document.querySelector('#list-picker-options');
  const lists = manualLists();
  document.querySelector('#list-picker-empty').hidden = lists.length > 0;
  options.hidden = !lists.length;
  options.querySelectorAll('label').forEach((label) => label.remove());
  for (const list of lists) {
    const label = document.createElement('label');
    label.className = 'list-check';
    label.innerHTML = '<input type="checkbox" /><span></span>';
    label.querySelector('span').textContent = list.name;
    const input = label.querySelector('input');
    input.checked = list.games.includes(pickerGame.key);
    input.onchange = () =>
      setMember(list, pickerGame, input.checked).catch((error) => {
        input.checked = !input.checked;
        notifyError(error);
      });
    options.append(label);
  }
}
export function openPicker(game) {
  pickerGame = game;
  document.querySelector('#list-picker-title').textContent = 'Listas · ' + game.name;
  renderPicker();
  setFormError(document.querySelector('#list-picker-create'), '');
  pickerDialog.showModal();
}

export function setup() {
  state.list = null;
  for (const dialog of [managerDialog, pickerDialog])
    dialog.querySelectorAll('[data-close]').forEach((button) => (button.onclick = () => dialog.close()));
  document.querySelector('#open-lists').onclick = openManager;
  document.querySelector('#list-create').onsubmit = async (event) => {
    event.preventDefault();
    const input = document.querySelector('#list-name');
    try {
      await createList({ name: input.value, kind: 'manual' });
      input.value = '';
    } catch (error) {
      setFormError(event.currentTarget, error.message);
    }
  };
  document.querySelector('#list-from-search').onclick = async () => {
    const input = document.querySelector('#list-name');
    const name = input.value.trim() || state.query.trim() || 'Mi búsqueda';
    try {
      const list = await createList({ name, kind: 'auto', rule: currentRule() });
      input.value = '';
      notify('Lista automática «' + list.name + '» creada: ' + plural(gamesOf(list).length, 'juego', 'juegos') + '.', {
        type: 'success'
      });
    } catch (error) {
      setFormError(document.querySelector('#list-create'), error.message);
    }
  };
  document.querySelector('#list-picker-create').onsubmit = async (event) => {
    event.preventDefault();
    const input = document.querySelector('#list-picker-name');
    const form = event.currentTarget;
    try {
      const list = await createList({ name: input.value, kind: 'manual', games: [pickerGame.key] });
      input.value = '';
      notify(pickerGame.name + ' se agregó a «' + list.name + '».', { type: 'success' });
    } catch (error) {
      setFormError(form, error.message);
    }
  };
}
