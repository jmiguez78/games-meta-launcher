// Tus capturas: pestaña de la ficha, fila «Tus últimas capturas» en Inicio y carpetas en Configuración.
// Imágenes y videos, leídos de donde los guarda cada programa (Steam, MAME, Xbox Game Bar, NVIDIA); ver screenshots.mjs.
import { request } from './api.js';
import { openMediaViewer } from './details.js';
import { notifyError } from './feedback.js';
import { icon } from './icons.js';

const PAGE = 60;
const sourceList = (items) =>
  new Intl.ListFormat('es', { type: 'conjunction' }).format([...new Set(items.map((item) => item.source))]);
const fileUrl = (item, thumb) => '/api/screenshots/file/' + item.id + (thumb && item.thumb ? '?thumb=1' : '');
const videoUrl = (item) => '/api/screenshots/video/' + item.id;
const isVideo = (item) => item.kind === 'video';
const sizeText = (bytes) =>
  bytes >= 1e9
    ? (bytes / 1e9).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' GB'
    : Math.max(1, Math.round(bytes / 1e6)).toLocaleString('es-AR') + ' MB';
const durationText = (seconds) => {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, '0');
  return hours ? hours + ':' + String(minutes).padStart(2, '0') + ':' + rest : minutes + ':' + rest;
};
// «5 capturas y 2 videos», «1 video»…
export function countText(images, videos) {
  const parts = [];
  if (images) parts.push(images === 1 ? '1 captura' : images.toLocaleString('es-AR') + ' capturas');
  if (videos) parts.push(videos === 1 ? '1 video' : videos.toLocaleString('es-AR') + ' videos');
  return parts.join(' y ') || 'Sin capturas';
}
// Miniatura de un video: el navegador lee sólo el comienzo del archivo y muestra un cuadro del primer segundo.
// Se pide recién cuando la miniatura está a la vista, para no abrir decenas de videos de varios GB a la vez.
const videoObserver =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            videoObserver.unobserve(entry.target);
            entry.target.src = entry.target.dataset.src;
          }),
        { rootMargin: '200px' }
      )
    : null;
const dateText = (value) => new Date(value).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });

export async function revealCapture(item) {
  try {
    await request('/api/screenshots/file/' + item.id + '/open', { method: 'POST' });
  } catch (error) {
    notifyError(error);
  }
}

// Lo que necesita el visor: la imagen completa, su descripción y cómo abrir su carpeta.
export function capturePictures(items, withName = false) {
  return items.map((item) => ({
    ...(isVideo(item) ? { video: videoUrl(item) } : { src: fileUrl(item, false) }),
    label: (withName && item.name ? item.name + ' · ' : '') + item.source + ' · ' + dateText(item.takenAt),
    reveal: () => revealCapture(item)
  }));
}

export function captureThumbnail(item, index, pictures, title, withName = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'capture-thumbnail';
  button.dataset.capture = item.id;
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute(
    'aria-label',
    (isVideo(item) ? 'Ver video ' : 'Ampliar captura ') +
      (withName && item.name ? 'de ' + item.name + ' ' : '') +
      'del ' +
      dateText(item.takenAt)
  );
  button.onclick = () => openMediaViewer(pictures, index, title, button);
  const caption = document.createElement('span');
  caption.className = 'capture-caption';
  caption.textContent = (withName && item.name ? item.name + ' · ' : '') + dateText(item.takenAt);
  const broken = () => button.classList.add('broken');
  if (isVideo(item)) {
    button.classList.add('is-video');
    const preview = document.createElement('video');
    preview.muted = true;
    preview.preload = 'metadata';
    preview.setAttribute('aria-hidden', 'true');
    preview.tabIndex = -1;
    preview.dataset.src = videoUrl(item) + '#t=1';
    const badge = document.createElement('span');
    badge.className = 'capture-badge';
    badge.innerHTML = icon('play', true) + '<span>' + sizeText(item.size) + '</span>';
    preview.onloadedmetadata = () => {
      if (Number.isFinite(preview.duration)) badge.lastChild.textContent = durationText(preview.duration);
    };
    preview.onerror = broken;
    if (videoObserver) videoObserver.observe(preview);
    else preview.src = preview.dataset.src;
    button.append(preview, badge, caption);
    return button;
  }
  const img = document.createElement('img');
  img.src = fileUrl(item, true);
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.onerror = () => {
    img.hidden = true;
    broken();
  };
  button.append(img, caption);
  return button;
}

const EMPTY_TEXT =
  'Todavía no hay capturas ni videos tuyos de este juego. Sacá capturas con F12 en Steam o en MAME, o con el botón ' +
  'de captura del mando o Win + Alt + ImprPant (Xbox Game Bar); los videos de Game Bar (Win + Alt + G) también ' +
  'aparecen acá. Si las guardás en otra carpeta, agregala en Configuración → Tus capturas.';

// Pestaña «Tus capturas»: se carga al abrirla y se puede actualizar sin salir de la ficha.
export async function loadCapturesTab(body, game, { refresh = false } = {}) {
  if (body.dataset.loaded === game.key && !refresh) return;
  body.dataset.loaded = game.key;
  body.setAttribute('aria-busy', 'true');
  if (!body.childElementCount) body.innerHTML = '<p class="detail-empty">Buscando tus capturas…</p>';
  let data;
  try {
    data = await request('/api/screenshots/game/' + encodeURIComponent(game.key) + (refresh ? '?refresh=1' : ''));
  } catch (error) {
    delete body.dataset.loaded;
    body.setAttribute('aria-busy', 'false');
    body.innerHTML = '<p class="detail-empty"></p>';
    body.querySelector('p').textContent = error.message;
    return;
  }
  body.setAttribute('aria-busy', 'false');
  body.replaceChildren();
  const toolbar = document.createElement('div');
  toolbar.className = 'capture-toolbar';
  const summary = document.createElement('p');
  summary.className = 'capture-summary';
  summary.setAttribute('role', 'status');
  const refreshButton = document.createElement('button');
  refreshButton.type = 'button';
  refreshButton.className = 'button';
  refreshButton.innerHTML = icon('refresh') + ' Buscar de nuevo';
  refreshButton.onclick = () => loadCapturesTab(body, game, { refresh: true });
  toolbar.append(summary);
  if (data.items.length) {
    const sources = sourceList(data.items);
    summary.textContent =
      countText(data.images ?? data.total, data.videos ?? 0) +
      ' · ' +
      sources +
      ' · la última del ' +
      dateText(data.items[0].takenAt);
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'button';
    open.innerHTML = icon('folder') + ' Abrir carpeta';
    open.title = data.items[0].folder;
    open.onclick = () => revealCapture(data.items[0]);
    toolbar.append(open);
  } else summary.textContent = EMPTY_TEXT;
  toolbar.append(refreshButton);
  body.append(toolbar);
  if (!data.items.length) return;
  const grid = document.createElement('div');
  grid.className = 'capture-grid';
  const pictures = capturePictures(data.items);
  let shown = 0;
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'text-button capture-more';
  const showMore = () => {
    const next = data.items.slice(shown, shown + PAGE);
    next.forEach((item, offset) => grid.append(captureThumbnail(item, shown + offset, pictures, game.name)));
    shown += next.length;
    more.hidden = shown >= data.items.length;
    more.textContent = 'Ver más (' + (data.items.length - shown).toLocaleString('es-AR') + ')';
  };
  more.onclick = showMore;
  showMore();
  body.append(grid, more);
}

// Fila de Inicio: las últimas capturas de todos los juegos. Se pide como mucho una vez por minuto.
let recent = { at: 0, items: [] };
export async function renderCaptureShelf(host, visible = true) {
  if (!host) return;
  if (!visible) {
    host.hidden = true;
    return;
  }
  if (Date.now() - recent.at > 60_000) {
    try {
      recent = { at: Date.now(), items: (await request('/api/screenshots/recent?limit=16&kind=image')).items };
    } catch {
      recent = { at: Date.now(), items: [] };
    }
  }
  host.hidden = !recent.items.length;
  if (!recent.items.length) return host.replaceChildren();
  host.className = 'shelf capture-shelf';
  host.setAttribute('aria-labelledby', 'shelf-captures');
  host.innerHTML =
    '<header class="shelf-heading"><div><h2 id="shelf-captures">Tus últimas capturas</h2>' +
    '<p></p></div></header>' +
    '<div class="capture-track"></div>';
  host.querySelector('.shelf-heading p').textContent =
    'De ' + sourceList(recent.items) + ', de la más nueva a la más vieja.';
  const track = host.querySelector('.capture-track');
  const pictures = capturePictures(recent.items, true);
  recent.items.forEach((item, index) =>
    track.append(captureThumbnail(item, index, pictures, 'Tus últimas capturas', true))
  );
}

// Configuración: carpetas que se revisan (con cuántas capturas encontró cada una) y carpetas propias.
export async function loadCaptureFolders({ refresh = false } = {}) {
  const list = document.querySelector('#capture-folders');
  const input = document.querySelector('#capture-extra');
  if (!list) return;
  try {
    const { folders } = await request('/api/screenshots/folders' + (refresh ? '?refresh=1' : ''));
    renderFolders(list, folders);
    input.value = folders
      .filter((item) => item.custom)
      .map((item) => item.dir)
      .join('\n');
  } catch (error) {
    list.textContent = error.message;
  }
}
function renderFolders(list, folders) {
  list.replaceChildren(
    ...folders
      .filter((item) => item.exists || item.custom)
      .map((item) => {
        const row = document.createElement('li');
        const name = document.createElement('strong');
        name.textContent = item.label;
        const detail = document.createElement('span');
        detail.className = 'helper-text';
        detail.textContent =
          item.dir +
          ' · ' +
          (item.exists ? countText(item.count - (item.videos ?? 0), item.videos ?? 0) : 'la carpeta no existe');
        row.append(name, detail);
        return row;
      })
  );
  if (!list.childElementCount)
    list.innerHTML = '<li class="helper-text">No se encontró ninguna carpeta de capturas.</li>';
}
export function setupCaptureSettings() {
  const form = document.querySelector('#capture-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = form.querySelector('.form-error');
    error.textContent = '';
    const folders = form
      .querySelector('#capture-extra')
      .value.split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    try {
      const saved = await request('/api/screenshots/folders', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ folders })
      });
      renderFolders(document.querySelector('#capture-folders'), saved.folders);
      recent.at = 0;
    } catch (failure) {
      error.textContent = failure.message;
    }
  });
}
