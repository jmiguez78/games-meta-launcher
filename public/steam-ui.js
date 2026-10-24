// Interfaz de Steam: las respuestas se presentan como texto; nunca se inserta HTML de la tienda.
const steamHours = (value) =>
  value == null
    ? 'Sin información'
    : value > 0 && value < 0.05
      ? 'Menos de 0,1 h'
      : new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value) + ' h';
function steamText(parent, tag, value, className = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = String(value ?? '');
  parent.append(element);
  return element;
}
function steamPlain(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[\/?[^\]]+\]/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
function steamFacts(parent, rows) {
  const list = document.createElement('dl');
  list.className = 'detail-tech';
  for (const [label, value] of rows) {
    if (value == null || value === '') continue;
    steamText(list, 'dt', label);
    steamText(list, 'dd', value);
  }
  parent.append(list);
}
function steamActivityFacts(game) {
  const section = document.createElement('section');
  section.className = 'detail-section';
  steamText(section, 'h3', 'Tu actividad en Steam');
  steamFacts(section, [
    ['En tu cuenta', game.ownership === 'owned' ? 'Sí' : 'Sin verificar'],
    ['Instalación en esta PC', game.installed === false ? 'No instalado' : 'Instalado'],
    ['Tiempo total', steamHours(game.steam.playtimeHours)],
    ['Últimas dos semanas', steamHours(game.steam.recentHours)],
    [
      'Última actividad en Steam',
      game.steam.lastPlayedAt ? new Date(game.steam.lastPlayedAt).toLocaleDateString('es-AR') : null
    ]
  ]);
  return section;
}
function steamAction(parent, label, action) {
  const button = steamText(parent, 'button', label, 'button');
  button.type = 'button';
  button.onclick = action;
  return button;
}
function steamEnvelopeNote(parent, envelope) {
  if (envelope?.error) steamText(parent, 'p', envelope.error, 'helper-text');
  if (envelope?.updatedAt)
    steamText(
      parent,
      'p',
      (envelope.stale ? 'Datos guardados · ' : 'Actualizado · ') + new Date(envelope.updatedAt).toLocaleString('es-AR'),
      'helper-text'
    );
}
async function installSteamGame(game) {
  try {
    await request('/api/install/' + encodeURIComponent(game.key), { method: 'POST' });
    notify('Steam recibió la solicitud de instalación de ' + game.name + '. Actualizá el inventario cuando termine.', {
      type: 'success'
    });
  } catch (error) {
    notifyError(error, () => installSteamGame(game));
  }
}
function steamShowGame(appid) {
  const game = state.games.find((row) => row.platform === 'Steam' && String(row.id) === String(appid));
  if (game) openGamePage(game);
}
function steamGameCard(parent, item) {
  if (typeof item === 'number' || typeof item === 'string') item = { appid: item };
  const appid = item.appid ?? item.app_id;
  const local = state.games.find((row) => row.platform === 'Steam' && String(row.id) === String(appid));
  const card = document.createElement('article');
  card.className = 'steam-result-card surface-card';
  steamText(
    card,
    'h3',
    item.name ||
      item.title ||
      local?.name ||
      item.personaname ||
      item.persona_name ||
      (item.steamid ? 'Amigo de Steam' : 'Juego de Steam ' + (appid || ''))
  );
  const details = [];
  if (local) details.push(local.installed === false ? 'No instalado' : 'Instalado');
  const hours = item.playtimeHours ?? item.playtime_hours ?? local?.steam?.playtimeHours;
  if (hours != null) details.push(steamHours(hours) + ' en total');
  if (item.recentHours > 0) details.push(steamHours(item.recentHours) + ' en dos semanas');
  if (item.playtime_hours_a != null) details.push('Vos: ' + steamHours(item.playtime_hours_a));
  if (item.playtime_hours_b != null) details.push('Otro perfil: ' + steamHours(item.playtime_hours_b));
  if (item.discount_pct > 0) details.push('-' + item.discount_pct + ' %');
  if (item.price) {
    const price = typeof item.price === 'object' ? item.price : { final: item.price };
    details.push(
      [
        price.final ?? price.formatted ?? price.final_formatted,
        String(price.final ?? price.formatted ?? price.final_formatted ?? '').includes(price.currency)
          ? ''
          : price.currency,
        price.discount_percent ? '-' + price.discount_percent + '%' : ''
      ]
        .filter(Boolean)
        .join(' ')
    );
  }
  if (item.gameextrainfo || item.game_name || item.current_game)
    details.push('Jugando: ' + (item.gameextrainfo || item.game_name || item.current_game));
  if (item.online_state || item.status || item.state)
    details.push(String(item.online_state || item.status || item.state));
  if (item.in_game)
    details.push(
      'En juego: ' + (typeof item.in_game === 'object' ? item.in_game.name || item.in_game.appid : item.in_game)
    );
  if (details.length) steamText(card, 'p', details.join(' · '), 'helper-text');
  if (item.tags?.length) steamText(card, 'p', item.tags.slice(0, 5).join(' · '), 'helper-text');
  const rating = item.review_percent ?? item.review_percentage ?? item.positive_percent;
  if (rating != null) steamText(card, 'p', rating + '% de reseñas positivas', 'helper-text');
  if (item.steamid) steamText(card, 'p', 'SteamID64: ' + item.steamid, 'helper-text');
  if (local) steamAction(card, 'Ver ficha', () => steamShowGame(appid));
  if (/^\d+$/.test(String(appid)))
    card.append(metadataLink('Ver en Steam', 'https://store.steampowered.com/app/' + appid));
  if (Array.isArray(item.owners)) {
    steamText(
      card,
      'p',
      item.owners.length
        ? item.owners.map((owner) => owner.name || owner.personaname || owner.steamid).join(', ')
        : 'No se encontraron amigos con este juego entre los perfiles consultados.'
    );
  }
  parent.append(card);
}
function renderSteamCollection(parent, envelope) {
  parent.replaceChildren();
  steamEnvelopeNote(parent, envelope);
  const data = envelope?.data;
  if (!data || data.found === false) {
    steamText(
      parent,
      'p',
      'Esta información no está disponible. Revisá la privacidad del perfil o volvé a intentarlo.',
      'detail-empty'
    );
    return;
  }
  const rows = Array.isArray(data)
    ? data
    : data.items ||
      data.games ||
      data.friends ||
      data.recommendations ||
      data.common_games ||
      data.shared_games ||
      data.matches ||
      data.appids ||
      data.results ||
      [];
  const total = data.total ?? data.count ?? data.game_count ?? data.common_count ?? data.shared_count;
  if (total != null)
    steamText(
      parent,
      'p',
      total + ' resultados' + (Array.isArray(rows) && rows.length < total ? ' · mostrando ' + rows.length : ''),
      'helper-text'
    );
  if (data.friends_checked != null)
    steamText(
      parent,
      'p',
      'Se consultaron ' + data.friends_checked + ' amigos; los perfiles privados pueden no aportar datos.',
      'helper-text'
    );
  if (!Array.isArray(rows) || !rows.length) {
    steamText(parent, 'p', 'No hay resultados disponibles para esta consulta.', 'detail-empty');
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'steam-card-grid';
  rows.forEach((row) => steamGameCard(grid, row));
  parent.append(grid);
}
async function syncSteamAccount() {
  const notice = notify('Sincronizando tu biblioteca de Steam…', { type: 'loading' });
  const button = document.querySelector('#steam-sync');
  button.disabled = true;
  try {
    await request('/api/steam/sync', { method: 'POST' });
    let settings;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      settings = await request('/api/integrations/steam');
    } while (settings.running);
    if (settings.error) throw new Error(settings.error);
    await load();
    notice.update('Steam sincronizado: ' + settings.total + ' juegos en tu cuenta.', { type: 'success' });
    await loadSteamSettings();
  } catch (error) {
    notice.update(error.message, { type: 'error', action: { label: 'Reintentar', run: syncSteamAccount } });
  } finally {
    button.disabled = false;
  }
}
async function loadSteamSettings() {
  try {
    const settings = await request('/api/integrations/steam');
    document.querySelector('#steam-account-id').value = settings.steamId;
    document.querySelector('#steam-api-key').placeholder = settings.configured ? 'Clave guardada de forma cifrada' : '';
    document.querySelector('#steam-import-local').hidden = !settings.localConnectionAvailable;
    document.querySelector('#steam-disconnect').hidden = !settings.configured;
    document.querySelector('#steam-sync').disabled = !settings.configured || settings.running;
    document.querySelector('#steam-settings-status').textContent = settings.configured
      ? 'Cuenta conectada · ' +
        settings.total +
        ' juegos sincronizados. Sus datos enriquecen la biblioteca y las fichas.' +
        (settings.updatedAt
          ? ' Última sincronización: ' + new Date(settings.updatedAt).toLocaleString('es-AR') + '.'
          : '') +
        (settings.stale ? ' Datos pendientes de actualizar.' : '') +
        (settings.error ? ' ' + settings.error : '')
      : 'Sin conectar.';
  } catch (error) {
    document.querySelector('#steam-settings-status').textContent = error.message;
  }
}
async function loadSteamGameTab(root, game, kind, force = false) {
  if (root.dataset.loaded && !force) return;
  root.dataset.loaded = 'true';
  root.replaceChildren();
  // Esqueleto con la forma del contenido mientras responde Steam.
  steamText(root, 'p', 'Consultando Steam…', 'visually-hidden');
  for (const width of ['long', 'long', 'short', 'long', 'short'])
    steamText(root, 'span', '', 'skeleton skeleton-line' + (width === 'short' ? ' short' : ''));
  root.setAttribute('aria-busy', 'true');
  try {
    const envelope = await request(
      '/api/steam/games/' +
        encodeURIComponent(game.id) +
        '/' +
        (kind === 'achievements' ? 'achievements' : 'details') +
        (force ? '?refresh=1' : '')
    );
    root.replaceChildren();
    const actions = steamText(root, 'div', '', 'button-row');
    steamAction(actions, 'Actualizar datos de Steam', () => loadSteamGameTab(root, game, kind, true));
    if (kind === 'achievements') {
      steamEnvelopeNote(root, envelope);
      const data = envelope.data;
      if (!data.accessible)
        steamText(
          root,
          'p',
          'Steam no publica tus logros para este juego, o todavía no hay estadísticas personales. Se muestran las definiciones disponibles.',
          'helper-text'
        );
      steamText(
        root,
        'h3',
        data.accessible
          ? data.unlocked +
              ' de ' +
              data.total +
              ' logros · ' +
              (data.total ? Math.round((data.unlocked / data.total) * 100) : 0) +
              ' %'
          : data.total + ' logros disponibles'
      );
      const filter = document.createElement('select');
      filter.setAttribute('aria-label', 'Filtrar logros');
      [
        ['all', 'Todos los logros'],
        ['pending', 'Pendientes'],
        ['unlocked', 'Desbloqueados']
      ].forEach(([value, label]) => filter.add(new Option(label, value)));
      root.append(filter);
      const list = steamText(root, 'div', '', 'steam-achievements');
      const render = () => {
        list.replaceChildren();
        const rows = data.achievements.filter(
          (row) =>
            filter.value === 'all' || (filter.value === 'pending' ? row.unlocked === false : row.unlocked === true)
        );
        for (const row of rows) {
          const card = steamText(list, 'article', '', 'steam-result-card');
          steamText(card, 'h4', row.name);
          steamText(card, 'p', row.description);
          steamText(
            card,
            'p',
            (row.unlocked === null ? 'Progreso no disponible' : row.unlocked ? 'Desbloqueado' : 'Pendiente') +
              (row.rarity != null
                ? ' · ' +
                  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(row.rarity) +
                  ' % de jugadores'
                : '') +
              (row.unlockedAt ? ' · ' + new Date(row.unlockedAt).toLocaleDateString('es-AR') : ''),
            'helper-text'
          );
        }
        if (!rows.length) steamText(list, 'p', 'No hay logros disponibles con este filtro.', 'helper-text');
      };
      filter.onchange = render;
      render();
    } else {
      const store = envelope.store?.data;
      steamEnvelopeNote(root, envelope.store);
      if (store) {
        steamText(root, 'h3', store.name || game.name);
        steamText(root, 'p', steamPlain(store.short_description));
        steamFacts(root, [
          [
            'Precio actual',
            [
              store.price?.final,
              String(store.price?.final ?? '').includes(store.price?.currency) ? '' : store.price?.currency,
              store.price?.discount_percent ? '-' + store.price.discount_percent + '%' : ''
            ]
              .filter(Boolean)
              .join(' ')
          ],
          ['Reseñas recibidas', store.recommendations],
          ['Metacritic', store.metacritic],
          ['Idiomas', steamPlain(store.supported_languages)],
          [
            'Mando',
            store.controller_support === 'full' ? 'Compatibilidad total' : store.controller_support || 'Sin información'
          ],
          ['Sistemas nativos', (store.platforms || []).join(', ')],
          ['Categorías', (store.categories || []).join(', ')],
          ['Requisitos mínimos', steamPlain(store.pc_requirements_min)],
          ['DLC publicados (no confirma compra)', store.dlc_total],
          ['Lanzamiento', store.release_date]
        ]);
        root.append(metadataLink('Abrir la tienda de Steam', 'https://store.steampowered.com/app/' + game.id));
      } else steamText(root, 'p', envelope.store?.error || 'La ficha de la tienda no está disponible.', 'helper-text');
      const compatibility = envelope.compatibility?.data?.items?.[0];
      if (compatibility) {
        steamText(root, 'h3', 'Compatibilidad y comunidad');
        steamFacts(root, [
          ['Steam Deck', steamCompatibility(compatibility.steam_deck)],
          ['SteamOS', steamCompatibility(compatibility.steam_os)],
          ['Etiquetas', (compatibility.tags || []).join(', ')],
          ['Reseñas positivas', compatibility.review_percent != null ? compatibility.review_percent + ' %' : null]
        ]);
      }
      const reviews = envelope.reviews?.data;
      if (reviews) {
        const summary = reviews.query_summary || reviews;
        steamText(root, 'h3', 'Reseñas de usuarios');
        steamFacts(root, [
          ['Valoración', summary.review_score_desc || summary.score_description || summary.summary],
          ['Total de reseñas', summary.total_reviews],
          ['Positivas', summary.total_positive],
          ['Negativas', summary.total_negative]
        ]);
        for (const review of (reviews.reviews || []).slice(0, 5)) {
          const entry = steamText(root, 'details', '', 'detail-section');
          steamText(
            entry,
            'summary',
            (review.voted_up === false ? 'No recomendado' : 'Recomendado') + ' · Leer reseña'
          );
          steamText(entry, 'p', steamPlain(review.review || review.text));
        }
      }
      if (!reviews && envelope.reviews?.error)
        steamText(
          root,
          'p',
          'Las reseñas individuales no están disponibles en Steam en este momento. Podés consultar la valoración y su evolución.',
          'helper-text'
        );
      const history = envelope.reviewHistory?.data;
      if (history) {
        steamText(root, 'h3', 'Evolución de las reseñas');
        const rows = history.recent || history.history || [];
        const buckets = Array.isArray(rows) ? rows : rows.rollups || [];
        const table = steamText(root, 'table', '', 'data-table steam-history');
        const head = steamText(table, 'thead', '');
        const tr = steamText(head, 'tr', '');
        ['Período', 'Positivas', 'Negativas'].forEach((label) => steamText(tr, 'th', label));
        const body = steamText(table, 'tbody', '');
        for (const row of buckets.slice(-12)) {
          const line = steamText(body, 'tr', '');
          const date = typeof row.date === 'number' ? new Date(row.date * 1000) : new Date(row.date + 'T12:00:00');
          steamText(line, 'td', Number.isFinite(date.getTime()) ? date.toLocaleDateString('es-AR') : 'Período');
          steamText(line, 'td', row.recommendations_up ?? row.up ?? row.positive ?? '—');
          steamText(line, 'td', row.recommendations_down ?? row.down ?? row.negative ?? '—');
        }
        if (!buckets.length) steamText(root, 'p', 'Sin períodos de reseñas disponibles.', 'helper-text');
      }
      const news = envelope.news?.data?.items || [];
      if (news.length) {
        steamText(root, 'h3', 'Novedades y actualizaciones');
        for (const item of news) {
          const entry = steamText(root, 'article', '', 'detail-section');
          entry.append(metadataLink(item.title || 'Novedad', item.url));
          steamText(
            entry,
            'p',
            steamPlain(item.contents || item.excerpt || item.content || item.summary).slice(0, 700)
          );
        }
      }
      const owners = steamText(root, 'section', '', 'detail-section');
      steamText(owners, 'h3', 'Para jugar juntos');
      steamAction(owners, 'Buscar amigos con este juego', async () => {
        const target = steamText(owners, 'div', 'Consultando perfiles públicos…');
        try {
          renderSteamCollection(target, await request('/api/steam/owners?appid=' + game.id));
        } catch (error) {
          target.textContent = error.message;
        }
      });
    }
  } catch (error) {
    root.replaceChildren();
    steamText(root, 'p', error.message, 'form-error');
    steamAction(root, 'Reintentar', () => loadSteamGameTab(root, game, kind, true));
  } finally {
    root.setAttribute('aria-busy', 'false');
  }
}
function steamCompatibility(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value.label || value.description || value.status || value.category || null;
  return (
    {
      0: 'Sin información',
      1: 'No compatible',
      2: 'Jugable',
      3: 'Verificado',
      verified: 'Verificado',
      playable: 'Jugable',
      unsupported: 'No compatible',
      unknown: 'Sin información'
    }[value] || String(value)
  );
}
function initializeSteamUI() {
  document.querySelector('#steam-sync').onclick = syncSteamAccount;
  document.querySelector('#steam-form').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const key = document.querySelector('#steam-api-key');
    const id = document.querySelector('#steam-account-id');
    const errors = [];
    if (!/^[a-f0-9]{32}$/i.test(key.value.trim()))
      errors.push([key, 'Ingresá una clave de 32 caracteres hexadecimales.']);
    if (!/^765\d{14}$/.test(id.value.trim())) errors.push([id, 'Ingresá tu SteamID64 de 17 dígitos.']);
    if (!showFormErrors(form, errors)) return;
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    try {
      await request('/api/integrations/steam', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey: key.value.trim(), steamId: id.value.trim() })
      });
      key.value = '';
      await syncSteamAccount();
    } catch (error) {
      document.querySelector('#steam-form-error').textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
  document.querySelector('#steam-import-local').onclick = async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await request('/api/steam/import-local', { method: 'POST' });
      await syncSteamAccount();
    } catch (error) {
      notifyError(error);
    } finally {
      button.disabled = false;
    }
  };
  document.querySelector('#steam-disconnect').onclick = async () => {
    try {
      await request('/api/integrations/steam', { method: 'DELETE' });
      await load();
      await loadSteamSettings();
      notify('Steam desconectado. Se conserva la caché local para una futura reconexión.', { type: 'success' });
    } catch (error) {
      notifyError(error);
    }
  };
}
