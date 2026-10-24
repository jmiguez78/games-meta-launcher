// Avisos, mensajes para lectores de pantalla y errores de formulario.
import { updatePreference } from './editor.js';
import { icon } from './icons.js';
import { state } from './state.js';

export const dialog = document.querySelector('#notice');

export const toasts = document.querySelector('#toasts');

export function say(message) {
  dialog.querySelector('p').textContent = message;
  dialog.showModal();
}

// Avisos apilados que no interrumpen. type: info, success, error o loading; action: { label, run }.
// Éxitos e información se cierran solos y se pausan con el puntero o el foco encima (WCAG 2.2.1);
// errores y cargas quedan hasta que el usuario los cierra o la operación termina con update().
export const toastIcons = { info: 'info', success: 'check', error: 'alert', loading: 'refresh' };

export function notify(message, options = {}) {
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

export function notifyError(error, retry) {
  return notify(error.message || 'No se pudo completar la acción.', {
    type: 'error',
    action: retry && { label: 'Reintentar', run: retry }
  });
}

// Deshace un cambio de preferencias sobre la versión vigente del juego (load() reemplaza los objetos).
export function undoPreference(game, patch, message) {
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
export function setFieldError(input, message) {
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

export function clearFieldError(input) {
  const id = input.id + '-error';
  document.getElementById(id)?.remove();
  input.removeAttribute('aria-invalid');
  const described = (input.getAttribute('aria-describedby') || '').split(' ').filter((item) => item && item !== id);
  if (described.length) input.setAttribute('aria-describedby', described.join(' '));
  else input.removeAttribute('aria-describedby');
}

export function setFormError(form, message) {
  form.querySelector('.form-error').textContent = message;
}

// errors: lista de [campo, mensaje]. Devuelve true si el formulario es válido.
export function showFormErrors(form, errors) {
  form.querySelectorAll('[aria-invalid]').forEach(clearFieldError);
  setFormError(form, '');
  errors.forEach(([input, message]) => setFieldError(input, message));
  errors[0]?.[0].focus();
  return errors.length === 0;
}

// Enlaces de eventos y estado inicial; se llama una vez desde main.js.
export function setup() {
  ['input', 'change'].forEach((type) =>
    document.addEventListener(type, (event) => {
      if (event.target.getAttribute?.('aria-invalid')) clearFieldError(event.target);
    })
  );
  dialog.querySelector('button').onclick = () => dialog.close();
}
