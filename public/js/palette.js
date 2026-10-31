// Paleta de comandos (Control+K).
import { normalize, tagsOf } from './api.js';
import { applyCover, coverInfo, pruneCoverLoads } from './art.js';
import { playOrReview } from './cards.js';
import { showGame } from './game-page.js';
import { quickGames } from './home.js';
import { icon } from './icons.js';
import { clearFilters, renderLibrary } from './library.js';
import { pageMeta, showPage } from './main.js';
import { exportPreferences } from './settings.js';
import { openList, openManager } from './lists.js';
import { state } from './state.js';

// Paleta de comandos (Control+K): combobox con lista agrupada y aria-activedescendant.
// El foco queda siempre en el campo; las flechas mueven la opción activa y Enter la ejecuta.
export const palette = document.querySelector('#palette');

export const paletteInput = document.querySelector('#palette-input');

export const paletteList = document.querySelector('#palette-list');

export let paletteItems = [];

export let paletteActive = 0;

export function paletteCommands() {
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
  const lists = (state.lists || []).map((list) => ({
    group: 'Tus listas',
    label: 'Ver lista «' + list.name + '»',
    icon: 'list',
    keywords: 'lista ' + list.name,
    run: () => openList(list.id)
  }));
  const actions = [
    {
      group: 'Acciones',
      label: 'Administrar tus listas',
      icon: 'list',
      keywords: 'listas crear nueva automática colección',
      run: openManager
    },
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
    {
      group: 'Acciones',
      label: 'Modo sala',
      icon: 'monitor',
      keywords: 'sala tv televisor sillón mando completa pantalla grande',
      hint: 'F11',
      run: () => GMLGamepad.toggleBigScreen()
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
  return [...sections, ...actions, ...lists];
}

export function gameCommand(game, group) {
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
export function paletteMatches(query) {
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

export function renderPalette() {
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

export function setPaletteActive(index) {
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
export function runPaletteItem(index, alternate) {
  const item = paletteItems[index];
  if (!item) return;
  palette.close();
  (alternate && item.alternate ? item.alternate : item.run)();
}

export function openPalette() {
  if (document.querySelector('dialog[open]')) return;
  paletteInput.value = '';
  renderPalette();
  palette.showModal();
  paletteInput.focus();
}

// Enlaces de eventos y estado inicial; se llama una vez desde main.js.
export function setup() {
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
}
