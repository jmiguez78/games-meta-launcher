// Eventos del servidor (B7): la fila de tareas en segundo plano, la biblioteca cambiada y las sesiones medidas.
// Reemplaza a los sondeos: la interfaz se entera sola cuando termina una búsqueda o se cierra un juego.
import { notify } from './feedback.js';
import { load } from './main.js';
import { state } from './state.js';

const phaseText = {
  start: 'preparando',
  stores: 'revisando tiendas',
  version: 'consultando la versión',
  zips: 'leyendo archivos',
  listxml: 'leyendo máquinas',
  verify: 'verificando',
  details: 'sumando detalles',
  info: 'buscando descripciones'
};

// «Arcade (MAME): leyendo archivos 45 de 150 · 2 más en fila».
export function describeTasks(tasks) {
  const running = tasks.find((task) => task.state === 'running');
  if (!running) return '';
  const detail = running.detail || {};
  const step = [phaseText[detail.phase], detail.total ? detail.done + ' de ' + detail.total : '']
    .filter(Boolean)
    .join(' ');
  const queued = tasks.length - 1;
  return running.label + (step ? ': ' + step : '…') + (queued ? ' · ' + queued + ' más en fila' : '');
}

function renderTasks() {
  const status = document.querySelector('#task-status');
  const text = describeTasks(state.tasks);
  status.textContent = text;
  status.hidden = !text;
}

// Varios avisos seguidos (termina Arcade, después Wikipedia) piden la biblioteca una sola vez.
let reloadTimer;
function reloadSoon() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => load(), 400);
}

export function minutesText(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return minutes + ' min';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours + ' h' + (rest ? ' ' + rest + ' min' : '');
}

export function setup() {
  state.tasks = [];
  if (typeof EventSource !== 'function') return;
  // EventSource se reconecta solo si el servidor se reinicia.
  const source = new EventSource('/api/events');
  source.addEventListener('tasks', (event) => {
    state.tasks = JSON.parse(event.data);
    renderTasks();
    window.dispatchEvent(new CustomEvent('gml-tasks', { detail: state.tasks }));
  });
  source.addEventListener('library', reloadSoon);
  source.addEventListener('session', (event) => {
    const session = JSON.parse(event.data);
    notify('Sesión de ' + minutesText(session.seconds) + ' en ' + session.name + '.', { type: 'success' });
    window.dispatchEvent(new CustomEvent('gml-session', { detail: session }));
  });
}
