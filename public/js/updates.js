// Aviso de versión nueva: unos segundos después de abrir se consulta (el servidor lo hace como mucho una vez por
// día) y, si hay una versión publicada más nueva, se avisa una sola vez por versión.
import { request } from './api.js';
import { notify } from './feedback.js';

const SEEN_KEY = 'gml-update-seen';
const remembered = () => {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
};
const remember = (version) => {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    /* sin almacenamiento: se vuelve a avisar en la próxima apertura */
  }
};
const openRelease = (url) => url && window.open(url, '_blank', 'noopener');

export function describeUpdates(info) {
  if (!info?.enabled) return 'Versión ' + (info?.current ?? '') + '.';
  if (info.newer) return 'Versión ' + info.current + '. Hay una versión nueva: ' + info.latest + '.';
  if (info.available) return 'Versión ' + info.current + '. Estás al día.';
  if (info.error) return 'Versión ' + info.current + '. No se pudo consultar si hay una versión nueva.';
  return 'Versión ' + info.current + '. ' + (info.reason ?? '');
}

export async function loadUpdates({ force = false } = {}) {
  const status = document.querySelector('#update-status');
  const button = document.querySelector('#check-updates');
  try {
    const info = await request('/api/updates' + (force ? '?refresh=1' : ''));
    if (status) status.textContent = describeUpdates(info);
    if (button) {
      button.hidden = !info.enabled;
      button.textContent = info.newer ? 'Ver novedades' : 'Buscar actualizaciones';
      button.onclick = info.newer ? () => openRelease(info.url) : () => loadUpdates({ force: true });
    }
    return info;
  } catch {
    if (status) status.textContent = 'No se pudo consultar la versión.';
    return null;
  }
}

export function setup() {
  setTimeout(async () => {
    const info = await loadUpdates();
    if (!info?.newer || remembered() === info.latest) return;
    remember(info.latest);
    notify('Hay una versión nueva de Viciódromo: ' + info.latest + '.', {
      action: info.url ? { label: 'Ver novedades', run: () => openRelease(info.url) } : undefined
    });
  }, 8000);
}
