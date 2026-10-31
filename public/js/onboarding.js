// Primeros pasos (F1): una tarjeta en Inicio con tres pasos (tus juegos, conectar Steam e IGDB, sumar Arcade)
// hasta completarlos o descartarla. Se actualiza sola con los eventos del servidor.
import { plural, request } from './api.js';
import { notify, notifyError } from './feedback.js';
import { icon } from './icons.js';
import { showPage } from './main.js';
import { state } from './state.js';

const STORE_ORDER = ['Steam', 'Epic Games', 'GOG Galaxy', 'Xbox / Microsoft Store', 'EA app', 'Ubisoft Connect'];

// Los tres pasos a partir de la respuesta de /api/onboarding.
export function onboardingSteps(data) {
  const counts = STORE_ORDER.filter((store) => data.library.byPlatform[store]).map(
    (store) => store + ' ' + data.library.byPlatform[store]
  );
  const total = Object.values(data.library.byPlatform).reduce((sum, count) => sum + count, 0);
  const scanning = data.scan.running || data.scan.queued;
  const games = {
    id: 'games',
    title: 'Tus juegos',
    done: !scanning && total > 0,
    text: scanning
      ? 'Revisando tus tiendas… ' + data.scan.done + ' de ' + data.scan.total + '.'
      : total
        ? 'Encontramos ' + plural(total, 'juego instalado', 'juegos instalados') + ': ' + counts.join(' · ') + '.'
        : 'Todavía no encontramos juegos instalados en Steam, Epic, GOG, Xbox, EA ni Ubisoft.',
    action:
      !scanning && !total ? { label: 'Buscar de nuevo', run: () => document.querySelector('#refresh').click() } : null
  };
  const missing = [!data.steam.configured && 'Steam', !data.igdb.configured && 'IGDB'].filter(Boolean);
  const accounts = {
    id: 'accounts',
    title: 'Conectá Steam e IGDB',
    done: !missing.length,
    text: missing.length
      ? 'Steam suma toda tu cuenta, las horas y los logros; IGDB, descripciones, géneros y duración. Falta: ' +
        missing.join(' y ') +
        '.'
      : 'Steam e IGDB conectados.',
    action: missing.length ? { label: 'Conectar', target: missing[0] === 'Steam' ? '#steam-form' : '#igdb-form' } : null
  };
  const arcade = {
    id: 'arcade',
    title: 'Sumá tus arcades',
    done: data.arcade.configured,
    text: data.arcade.configured
      ? plural(data.arcade.games, 'juego de Arcade', 'juegos de Arcade') + ' en tu biblioteca.'
      : 'Opcional: si tenés MAME, indicá dónde está mame.exe y se suman los juegos que arrancan.',
    action: data.arcade.configured ? null : { label: 'Configurar Arcade', target: '#mame-form' }
  };
  return [games, accounts, arcade];
}

// Claves guardadas en otra PC (portable) o con otro usuario de Windows: se avisa una vez por apertura.
let reconnectWarned = false;
function warnReconnect(names = []) {
  if (reconnectWarned || !names.length) return;
  reconnectWarned = true;
  notify(
    'Esta PC no puede abrir la conexión guardada de ' +
      names.join(' y ') +
      ' (las claves se cifran para cada usuario de Windows). Volvé a conectarla en Configuración.',
    {
      type: 'info',
      action: { label: 'Ir a Configuración', run: () => goTo(names[0] === 'Steam' ? '#steam-form' : '#igdb-form') }
    }
  );
}

function goTo(target) {
  showPage('settings', { focus: false });
  const form = document.querySelector(target);
  form?.closest('.settings-row')?.scrollIntoView({ block: 'center' });
  form?.querySelector('input:not([type=checkbox]), button')?.focus({ preventScroll: true });
}

export async function loadOnboarding() {
  const card = document.querySelector('#onboarding');
  try {
    const data = await request('/api/onboarding');
    warnReconnect(data.needsReconnect);
    const steps = onboardingSteps(data);
    const complete = steps.every((step) => step.done);
    card.hidden = data.dismissed || complete;
    if (card.hidden) return;
    const done = steps.filter((step) => step.done).length;
    document.querySelector('#onboarding-summary').textContent = done + ' de 3 listos.';
    const list = document.querySelector('#onboarding-steps');
    list.replaceChildren(
      ...steps.map((step, index) => {
        const item = document.createElement('li');
        item.className = 'onboarding-step' + (step.done ? ' done' : '');
        item.innerHTML =
          '<span class="onboarding-mark" aria-hidden="true"></span><div><h3></h3><p></p></div><span class="onboarding-action"></span>';
        item.querySelector('.onboarding-mark').innerHTML = step.done ? icon('check') : String(index + 1);
        item.querySelector('h3').textContent = step.title;
        if (step.done)
          item.querySelector('h3').insertAdjacentHTML('beforeend', '<span class="visually-hidden"> (listo)</span>');
        item.querySelector('p').textContent = step.text;
        if (step.action) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'button small';
          button.textContent = step.action.label;
          button.onclick = step.action.run || (() => goTo(step.action.target));
          item.querySelector('.onboarding-action').append(button);
        }
        return item;
      })
    );
  } catch {
    // Sin respuesta no se muestra la tarjeta: no es imprescindible.
    card.hidden = true;
  }
}

async function dismiss() {
  try {
    await request('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ onboardingDismissed: true })
    });
    document.querySelector('#onboarding').hidden = true;
    notify('Listo. Lo que falta conectar sigue disponible en Configuración.', { type: 'success' });
  } catch (error) {
    notifyError(error);
  }
}

export function setup() {
  document.querySelector('#onboarding-dismiss').onclick = dismiss;
  window.addEventListener('gml-library', loadOnboarding);
  // Mientras se buscan juegos, el paso 1 muestra el avance.
  let timer = 0;
  window.addEventListener('gml-tasks', (event) => {
    if (timer || state.page !== 'home' || !event.detail.some((task) => task.id === 'scan')) return;
    timer = setTimeout(() => {
      timer = 0;
      loadOnboarding();
    }, 700);
  });
}
