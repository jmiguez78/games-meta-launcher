// «Tu actividad» (F8): tiempo jugado por semana, más jugados, racha y últimas sesiones.
// Las sesiones las mide el launcher al abrir un juego; Steam suma lo suyo (también lo jugado fuera de acá).
import { plural, request } from './api.js';
import { applyCover, coverInfo } from './art.js';
import { minutesText } from './events.js';
import { notifyError } from './feedback.js';
import { openGamePage } from './game-page.js';
import { state } from './state.js';

const SVG = 'http://www.w3.org/2000/svg';
const hoursText = (seconds) => (seconds > 0 ? GMLShelves.hours(seconds / 3600) || minutesText(seconds) : '0 h');
const shortDate = (day) =>
  new Date(day + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '');

function tiles(data) {
  const holder = document.querySelector('#activity-summary');
  holder.replaceChildren();
  [
    ['Esta semana', hoursText(data.thisWeekSeconds), 'medido por el launcher'],
    ['Últimas dos semanas', hoursText(data.recentSeconds), 'con las horas que informa Steam'],
    [
      'Racha',
      plural(data.streak.current, 'día', 'días'),
      data.streak.best > data.streak.current ? 'la mejor: ' + plural(data.streak.best, 'día', 'días') : 'tu mejor racha'
    ],
    ['Sesiones medidas', data.sessions.toLocaleString('es-AR'), plural(data.measuredGames, 'juego', 'juegos')]
  ].forEach(([label, value, hint]) => {
    const tile = document.createElement('article');
    tile.className = 'stat';
    tile.innerHTML = '<span></span><strong></strong><small></small>';
    tile.querySelector('span').textContent = label;
    tile.querySelector('strong').textContent = value;
    tile.querySelector('small').textContent = hint;
    holder.append(tile);
  });
}

// Barras por semana: una sola serie (sin leyenda), escala con dos o tres líneas guía, valor al pasar el mouse
// o el foco por cada semana, y la misma información en una tabla para lectores de pantalla.
// El dibujo usa el ancho real del contenedor: textos y barras a escala 1:1.
export const CHART_PAD = { top: 12, right: 8, bottom: 28, left: 40 };
export function weeklyChart(weeks, width = 720) {
  const height = 220;
  const pad = CHART_PAD;
  const maxHours = Math.max(1, ...weeks.map((week) => week.seconds / 3600));
  const step = maxHours <= 4 ? 1 : maxHours <= 10 ? 2 : maxHours <= 25 ? 5 : 10;
  const top = Math.ceil(maxHours / step) * step;
  const plotH = height - pad.top - pad.bottom;
  const slot = (width - pad.left - pad.right) / weeks.length;
  const barW = Math.min(36, slot - 6);
  const y = (hours) => pad.top + plotH - (hours / top) * plotH;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'week-chart');
  svg.setAttribute('aria-hidden', 'true');
  const add = (parent, name, attrs, text) => {
    const node = document.createElementNS(SVG, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text != null) node.textContent = text;
    parent.append(node);
    return node;
  };
  for (let value = 0; value <= top; value += step) {
    add(svg, 'line', { class: 'grid', x1: pad.left, x2: width - pad.right, y1: y(value), y2: y(value) });
    add(svg, 'text', { class: 'tick', x: pad.left - 8, y: y(value) + 4, 'text-anchor': 'end' }, value + ' h');
  }
  weeks.forEach((week, index) => {
    const hours = week.seconds / 3600;
    const x = pad.left + slot * index + (slot - barW) / 2;
    const h = Math.max(0, y(0) - y(hours));
    if (h > 0) {
      // Extremo de datos redondeado (4px) y apoyado en la base.
      const r = Math.min(4, h, barW / 2);
      const base = y(0);
      add(svg, 'path', {
        class: 'bar' + (index === weeks.length - 1 ? ' current' : ''),
        d: `M${x},${base}V${base - h + r}Q${x},${base - h} ${x + r},${base - h}H${x + barW - r}Q${x + barW},${base - h} ${x + barW},${base - h + r}V${base}Z`
      });
    }
    if (index % 2 === weeks.length % 2 || index === weeks.length - 1)
      add(
        svg,
        'text',
        { class: 'tick', x: x + barW / 2, y: height - 8, 'text-anchor': 'middle' },
        index === weeks.length - 1 ? 'Esta' : shortDate(week.start)
      );
  });
  return svg;
}

function chart(data) {
  const holder = document.querySelector('#activity-chart');
  // El aviso se toma antes de vaciar el gráfico (en la segunda carga ya vive adentro).
  const tip = document.querySelector('#activity-tip');
  holder.replaceChildren(weeklyChart(data.weeks, Math.max(320, holder.clientWidth || 720)));
  // Zonas de foco y mouse más anchas que la barra: cada semana entera.
  const hits = document.createElement('div');
  hits.className = 'week-hits';
  Object.assign(hits.style, {
    top: CHART_PAD.top + 'px',
    right: CHART_PAD.right + 'px',
    bottom: CHART_PAD.bottom + 'px',
    left: CHART_PAD.left + 'px'
  });
  tip.hidden = true;
  data.weeks.forEach((week, index) => {
    const zone = document.createElement('button');
    zone.type = 'button';
    zone.className = 'week-hit';
    const label =
      (index === data.weeks.length - 1 ? 'Esta semana' : 'Semana del ' + shortDate(week.start)) +
      ': ' +
      hoursText(week.seconds) +
      (week.sessions ? ', ' + plural(week.sessions, 'sesión', 'sesiones') : '');
    zone.setAttribute('aria-label', label);
    const show = () => {
      tip.textContent = label;
      tip.hidden = false;
      const box = zone.getBoundingClientRect();
      const parent = holder.getBoundingClientRect();
      tip.style.left = Math.min(parent.width - 180, Math.max(0, box.left - parent.left + box.width / 2 - 90)) + 'px';
    };
    const hide = () => (tip.hidden = true);
    zone.onmouseenter = show;
    zone.onfocus = show;
    zone.onmouseleave = hide;
    zone.onblur = hide;
    hits.append(zone);
  });
  // El aviso vive dentro del gráfico: se posiciona sobre la semana señalada.
  holder.append(hits, tip);
  const table = document.querySelector('#activity-table tbody');
  table.replaceChildren(
    ...data.weeks.map((week) => {
      const row = document.createElement('tr');
      row.innerHTML = '<th scope="row"></th><td></td><td></td>';
      row.querySelector('th').textContent = shortDate(week.start);
      row.querySelectorAll('td')[0].textContent = hoursText(week.seconds);
      row.querySelectorAll('td')[1].textContent = week.sessions;
      return row;
    })
  );
}

function gameFor(key) {
  return state.games.find((game) => game.key === key);
}

function topList(data) {
  const list = document.querySelector('#activity-top');
  list.replaceChildren();
  const max = data.top[0]?.seconds || 1;
  for (const item of data.top) {
    const game = gameFor(item.key);
    const row = document.createElement('li');
    row.innerHTML =
      '<button type="button" class="activity-row"><span class="activity-cover cover"><span class="cover-initial"></span></span>' +
      '<span class="activity-name"><strong></strong><small></small></span>' +
      '<span class="activity-meter" aria-hidden="true"><span></span></span><span class="activity-value"></span></button>';
    row.querySelector('strong').textContent = item.name;
    row.querySelector('small').textContent =
      item.platform + (item.recentSeconds ? ' · ' + hoursText(item.recentSeconds) + ' en dos semanas' : '');
    row.querySelector('.activity-meter span').style.width = (item.seconds / max) * 100 + '%';
    row.querySelector('.activity-value').textContent = hoursText(item.seconds);
    const button = row.querySelector('button');
    if (game) {
      applyCover(row.querySelector('.activity-cover'), game, coverInfo(game));
      button.onclick = () => openGamePage(game, button);
    } else button.disabled = true;
    list.append(row);
  }
  document.querySelector('#activity-top-empty').hidden = data.top.length > 0;
}

function recentList(data) {
  const list = document.querySelector('#activity-recent');
  list.replaceChildren();
  for (const item of data.recent) {
    const game = gameFor(item.key);
    const row = document.createElement('li');
    row.innerHTML =
      '<button type="button" class="activity-row"><span class="activity-name"><strong></strong><small></small></span>' +
      '<span class="activity-value"></span></button>';
    row.querySelector('strong').textContent = item.name;
    const when = new Date(item.start);
    row.querySelector('small').textContent =
      GMLShelves.relativeDay(item.start) +
      ', ' +
      when.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) +
      (item.platform ? ' · ' + item.platform : '');
    row.querySelector('.activity-value').textContent = minutesText(item.seconds);
    const button = row.querySelector('button');
    if (game) button.onclick = () => openGamePage(game, button);
    else button.disabled = true;
    list.append(row);
  }
  document.querySelector('#activity-recent-empty').hidden = data.recent.length > 0;
}

let lastData = null;
export async function loadActivity() {
  try {
    const data = await request('/api/activity?now=' + Date.now());
    lastData = data;
    tiles(data);
    chart(data);
    topList(data);
    recentList(data);
  } catch (error) {
    notifyError(error, loadActivity);
  }
}

export function setup() {
  // Al cambiar el tamaño de la ventana, el gráfico se vuelve a dibujar a su nuevo ancho.
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.page === 'activity' && lastData) chart(lastData);
    }, 150);
  });
  window.addEventListener('gml-session', () => {
    if (state.page === 'activity') loadActivity();
  });
}
