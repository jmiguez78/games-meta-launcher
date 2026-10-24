// Editar un juego: preferencias, lanzamiento personalizado y portada propia.
import { request, tagsOf } from './api.js';
import { posterCache } from './cards.js';
import { clearFieldError, notify, setFormError, showFormErrors, undoPreference } from './feedback.js';
import { gamePage, renderGameAside } from './game-page.js';
import { renderHome } from './home.js';
import { renderFilters, renderLibrary } from './library.js';
import { state } from './state.js';

export const editor = document.querySelector('#editor');

export let editing = null;

export async function updatePreference(game, patch) {
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

export function editGame(game) {
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

export const launchPlaceholders = {
  '': 'Se usa la detección automática',
  uri: 'steam://rungameid/1234',
  file: 'C:\\Juegos\\MiJuego\\juego.exe',
  appsFolder: 'Paquete_abc123!App'
};

// Con detección automática la ruta no se usa: se deshabilita para que no parezca obligatoria.
export function syncLaunchTarget() {
  const type = document.querySelector('#launch-type').value;
  const target = document.querySelector('#launch-target');
  target.disabled = !type;
  target.placeholder = launchPlaceholders[type];
  if (!type) clearFieldError(target);
}

export function editorErrors() {
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

export async function uploadCover(game, file) {
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

// Enlaces de eventos y estado inicial; se llama una vez desde main.js.
export function setup() {
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
}
