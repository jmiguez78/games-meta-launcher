// Configuración: tema, ventana, Arcade, IGDB, tarea nocturna y respaldo.
import { plural, request } from './api.js';
import { notify, notifyError, setFormError, showFormErrors } from './feedback.js';
import { load } from './main.js';
import { state } from './state.js';
import { showCredentialFields } from './steam.js';

export async function exportPreferences() {
  try {
    const data = await request('/api/preferences/export');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    link.download = 'games-meta-launcher-preferencias.json';
    link.click();
    URL.revokeObjectURL(link.href);
    notify('Respaldo preparado.', { type: 'success' });
  } catch (error) {
    notifyError(error, exportPreferences);
  }
}

// Diagnóstico: versión, archivos de datos y registro, para adjuntar cuando algo falla.
export async function exportDiagnostics() {
  try {
    const data = await request('/api/diagnostics');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    link.download = 'games-meta-launcher-diagnostico-' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    URL.revokeObjectURL(link.href);
    notify('Diagnóstico preparado.', { type: 'success' });
  } catch (error) {
    notifyError(error, exportDiagnostics);
  }
}

export function restorePreferences(data) {
  return request('/api/preferences/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data)
  });
}

// Antes de restaurar se guarda una copia de lo actual para poder deshacer.
export async function importPreferences(file) {
  const notice = notify('Restaurando respaldo…', { type: 'loading' });
  try {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error('El archivo no es un respaldo de Games Meta Launcher.');
    }
    const previous = await request('/api/preferences/export');
    await restorePreferences(data);
    await load();
    notice.update('Preferencias restauradas.', {
      type: 'success',
      action: {
        label: 'Deshacer',
        run: async () => {
          try {
            await restorePreferences(previous);
            await load();
            notify('Se recuperaron tus preferencias anteriores.', { type: 'success' });
          } catch (error) {
            notifyError(error);
          }
        }
      }
    });
  } catch (error) {
    notice.update(error.message || 'No se pudo restaurar el respaldo.', { type: 'error' });
  }
}

export async function loadSchedule() {
  try {
    const data = await request('/api/schedule');
    const status = document.querySelector('#schedule-status');
    if (!data.supported) {
      status.textContent = 'La tarea programada sólo está disponible en Windows.';
      return;
    }
    if (!data.configured) {
      status.textContent = 'No hay una tarea creada. Guardá un horario para activarla.';
      return;
    }
    document.querySelector('#schedule-time').value = data.time || '03:00';
    status.textContent = data.enabled
      ? 'Activa. Se ejecuta todos los días a las ' + (data.time || '03:00') + '.'
      : 'La tarea existe, pero está desactivada.';
  } catch (error) {
    document.querySelector('#schedule-status').textContent = error.message;
  }
}

// Con «Sistema» no se fija atributo y el CSS sigue prefers-color-scheme.
export function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    const active = button.dataset.themeOption === theme;
    button.setAttribute('aria-pressed', String(active));
  });
}

export async function loadSettings() {
  try {
    const settings = await request('/api/settings');
    applyTheme(settings.theme);
    document.querySelector('#minimize-on-launch').checked = settings.minimizeOnLaunch !== false;
  } catch {
    applyTheme('dark');
  }
}

export let igdbPoll;

export function describeIgdbStatus(settings, status) {
  if (status.running) return 'Buscando información… ' + status.done + ' de ' + status.total + ' juegos.';
  if (status.error) return status.error;
  if (status.finishedAt)
    return 'Listo: se encontró información de ' + status.matched + ' de ' + status.total + ' juegos.';
  return settings.configured
    ? 'Conectado. Usá «Actualizar información» cuando agregues juegos.'
    : 'Sin conectar. Creá una aplicación en Twitch y pegá acá sus credenciales.';
}

export async function loadIgdb() {
  try {
    const [settings, status] = await Promise.all([request('/api/integrations/igdb'), request('/api/metadata/status')]);
    document.querySelector('#igdb-client-id').value = settings.clientId;
    document.querySelector('#igdb-secret').placeholder = settings.configured ? 'Guardado de forma segura' : '';
    document.querySelector('#igdb-refresh').hidden = !settings.configured;
    document.querySelector('#igdb-refresh').disabled = status.running;
    document.querySelector('#igdb-remove').classList.toggle('hidden', !settings.configured);
    showCredentialFields('igdb', settings.configured);
    document.querySelector('#igdb-status').textContent = describeIgdbStatus(settings, status);
    document.querySelector('#igdb-status').classList.toggle('connected', Boolean(settings.configured));
    clearTimeout(igdbPoll);
    if (status.running) igdbPoll = setTimeout(loadIgdb, 1000);
    else if (status.finishedAt && status.finishedAt !== state.metadataLoadedAt) {
      state.metadataLoadedAt = status.finishedAt;
      await load();
    }
  } catch (error) {
    document.querySelector('#igdb-status').textContent = error.message;
  }
}

// Arcade (MAME): ruta del ejecutable, estado de la indexación y resultado de la verificación.
export let mamePoll;

export function describeMame(info) {
  const status = info.status || {};
  if (status.running) {
    const phases = {
      start: 'Preparando…',
      version: 'Consultando la versión de MAME…',
      zips: 'Leyendo tus archivos… ' + status.done + ' de ' + status.total,
      listxml: 'Leyendo la descripción de las máquinas de MAME (la primera vez tarda un poco)…',
      verify: 'Verificando cada juego…',
      details: 'Sumando géneros, sagas y ranking…',
      info: 'Buscando descripciones en Wikipedia… ' + status.done + ' de ' + status.total
    };
    return phases[status.phase] || 'Buscando juegos…';
  }
  if (status.error) return status.error;
  if (!info.configured) return 'Sin configurar. Indicá dónde está mame.exe.';
  if (!info.stats) return 'Configurado. Todavía no se buscaron juegos.';
  const stats = info.stats;
  const broken = (stats.missing || 0) + (stats.device || 0) + (stats.disk || 0);
  const parts = [
    'MAME ' + info.version + ': ' + plural(info.visible, 'juego listo', 'juegos listos') + '.',
    info.adult && !info.showAdult
      ? plural(
          info.adult,
          'juego para adultos o de casino queda oculto.',
          'juegos para adultos o de casino quedan ocultos.'
        )
      : '',
    broken
      ? plural(broken, 'set no arranca', 'sets no arrancan') +
        ' con esta versión: ' +
        [
          stats.missing && stats.missing.toLocaleString('es-AR') + ' incompletos',
          stats.device && stats.device.toLocaleString('es-AR') + ' sin archivos de dispositivo',
          stats.disk && stats.disk.toLocaleString('es-AR') + ' necesitan disco CHD'
        ]
          .filter(Boolean)
          .join(', ') +
        '.'
      : '',
    stats.unknown ? plural(stats.unknown, 'archivo no es', 'archivos no son') + ' de esta versión de MAME.' : '',
    supportNote(info.support)
  ];
  return parts.filter(Boolean).join(' ');
}

// Categorías, ranking y sagas: si no se pudieron descargar, se dice por qué y qué se usó en su lugar.
export function supportNote(support) {
  if (!support) return '';
  const names = { catver: 'categorías', bestgames: 'ranking', series: 'sagas' };
  const failed = Object.entries(support).filter(([, item]) => item.error);
  if (!failed.length) return '';
  const missing = failed.filter(([, item]) => item.source === 'missing');
  return (
    'No se pudo descargar ' +
    failed.map(([name]) => 'la lista de ' + names[name]).join(', ') +
    ' (' +
    failed[0][1].error +
    '). ' +
    (missing.length
      ? 'Sin categorías, los juegos de casino y mahjong no se pueden ocultar.'
      : 'Se usó la copia guardada o la incluida en la aplicación.')
  );
}

export async function loadMame() {
  try {
    const info = await request('/api/integrations/mame');
    const input = document.querySelector('#mame-exe');
    if (document.activeElement !== input) input.value = info.exe || '';
    document.querySelector('#mame-adult').checked = info.showAdult;
    document.querySelector('#mame-scan').hidden = !info.configured;
    document.querySelector('#mame-scan').disabled = Boolean(info.status?.running);
    document.querySelector('#mame-save').disabled = Boolean(info.status?.running);
    const status = document.querySelector('#mame-status');
    status.textContent = describeMame(info);
    status.classList.toggle('connected', Boolean(info.stats?.games));
    clearTimeout(mamePoll);
    if (info.status?.running) mamePoll = setTimeout(loadMame, 800);
    else if (info.status?.finishedAt && info.status.finishedAt !== state.mameLoadedAt) {
      state.mameLoadedAt = info.status.finishedAt;
      await load();
    }
  } catch (error) {
    document.querySelector('#mame-status').textContent = error.message;
  }
}

// Mismo formato que valida el servidor: entre 10 y 64 letras y números.
export function igdbErrors(clientId, secret) {
  const credential = /^[a-z0-9]{10,64}$/i;
  const errors = [];
  if (!clientId.value.trim()) errors.push([clientId, 'Pegá el ID de cliente de tu aplicación de Twitch.']);
  else if (!credential.test(clientId.value.trim()))
    errors.push([clientId, 'El ID de cliente tiene entre 10 y 64 letras y números, sin espacios ni símbolos.']);
  if (!secret.value.trim())
    errors.push([
      secret,
      secret.placeholder
        ? 'Para volver a conectar, pegá el secreto otra vez.'
        : 'Pegá el secreto de tu aplicación de Twitch.'
    ]);
  else if (!credential.test(secret.value.trim()))
    errors.push([secret, 'El secreto tiene entre 10 y 64 letras y números, sin espacios ni símbolos.']);
  return errors;
}

// Enlaces de eventos y estado inicial; se llama una vez desde main.js.
export function setup() {
  document.querySelector('#big-screen').onchange = (event) => GMLGamepad.setBigScreen(event.currentTarget.checked);
  document.querySelector('#minimize-on-launch').onchange = async (event) => {
    const input = event.currentTarget;
    try {
      await request('/api/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ minimizeOnLaunch: input.checked })
      });
      notify(
        input.checked
          ? 'La ventana se va a minimizar al iniciar un juego.'
          : 'La ventana va a quedar abierta al iniciar un juego.',
        {
          type: 'success'
        }
      );
    } catch (error) {
      input.checked = !input.checked;
      notifyError(error);
    }
  };
  document.querySelector('#mame-form').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = document.querySelector('#mame-exe');
    const value = input.value.trim().replace(/^"|"$/g, '');
    if (
      !showFormErrors(
        form,
        /mame[^\\/]*\.exe$/i.test(value)
          ? []
          : [[input, 'Pegá la ruta completa de mame.exe, por ejemplo K:\\Juegos\\MAME64\\mame.exe.']]
      )
    )
      return;
    try {
      await request('/api/integrations/mame', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ exe: value })
      });
      notify('Buscando tus juegos de Arcade. La primera vez puede tardar unos minutos.', { type: 'success' });
      await loadMame();
    } catch (error) {
      setFormError(form, error.message);
    }
  };
  document.querySelector('#mame-scan').onclick = async () => {
    try {
      await request('/api/mame/scan', { method: 'POST' });
      await loadMame();
    } catch (error) {
      notifyError(error);
    }
  };
  document.querySelector('#mame-adult').onchange = async (event) => {
    const input = event.currentTarget;
    try {
      await request('/api/integrations/mame', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ showAdult: input.checked })
      });
      await load();
    } catch (error) {
      input.checked = !input.checked;
      notifyError(error);
    }
  };
  document.querySelector('#export-preferences').onclick = exportPreferences;
  document.querySelector('#export-diagnostics').onclick = exportDiagnostics;
  document.querySelector('#import-preferences').onchange = (event) => {
    const file = event.target.files[0];
    if (file) importPreferences(file);
    event.target.value = '';
  };
  document.querySelector('#schedule-form').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const time = document.querySelector('#schedule-time');
    if (!showFormErrors(form, time.value ? [] : [[time, 'Elegí la hora en que se actualiza la biblioteca.']])) return;
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      await request('/api/schedule', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ time: time.value })
      });
      await loadSchedule();
      notify('Horario de indexación guardado.', { type: 'success' });
    } catch (error) {
      setFormError(form, error.message);
    } finally {
      button.disabled = false;
    }
  };
  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    button.onclick = async () => {
      const theme = button.dataset.themeOption;
      applyTheme(theme);
      try {
        await request('/api/settings', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ theme })
        });
      } catch (error) {
        notifyError(error, () => button.click());
      }
    };
  });
  document.querySelector('#igdb-form').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const clientId = document.querySelector('#igdb-client-id');
    const secret = document.querySelector('#igdb-secret');
    if (!showFormErrors(form, igdbErrors(clientId, secret))) return;
    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    try {
      await request('/api/integrations/igdb', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: clientId.value, clientSecret: secret.value })
      });
      secret.value = '';
      delete form.dataset.editing;
      notify('IGDB conectado. Buscando información de tus juegos…', { type: 'success' });
      await loadIgdb();
    } catch (error) {
      setFormError(form, error.message);
    } finally {
      button.disabled = false;
    }
  };
  document.querySelector('#igdb-change').onclick = () => {
    document.querySelector('#igdb-form').dataset.editing = 'true';
    showCredentialFields('igdb', true);
    document.querySelector('#igdb-client-id').focus();
  };
  document.querySelector('#igdb-refresh').onclick = async () => {
    try {
      await request('/api/metadata/refresh', { method: 'POST' });
      await loadIgdb();
    } catch (error) {
      notifyError(error);
    }
  };
  document.querySelector('#igdb-remove').onclick = async () => {
    try {
      await request('/api/integrations/igdb', { method: 'DELETE' });
      notify('IGDB desconectado. La información ya descargada se conserva.', { type: 'success' });
      await loadIgdb();
    } catch (error) {
      notifyError(error);
    }
  };
}
