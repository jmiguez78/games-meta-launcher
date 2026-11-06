// Contenido de la ficha de un juego: pestañas, descripción, IGDB, Arcade y movimientos.
import { request, tagsOf } from './api.js';
import { statusText } from './art.js';
import { icon } from './icons.js';
import { playGame } from './launch.js';
import { state } from './state.js';
import { loadSteamGameTab, steamPlain } from './steam.js';
import { loadCapturesTab } from './captures.js';

export function metaSection(meta) {
  const section = document.createElement('section');
  section.className = 'game-meta';
  const facts = [
    meta.year,
    (meta.developers || []).join(', '),
    meta.rating ? 'Valoración ' + meta.rating + '/100' : ''
  ].filter(Boolean);
  if (facts.length) {
    const line = document.createElement('p');
    line.className = 'meta-facts';
    line.textContent = facts.join(' · ');
    section.append(line);
  }
  if (meta.genres && meta.genres.length) {
    const genres = document.createElement('div');
    genres.className = 'tag-list meta-genres';
    meta.genres.forEach((genre) => {
      const label = document.createElement('span');
      label.textContent = genre;
      genres.append(label);
    });
    section.append(genres);
  }
  if (meta.summary) {
    const summary = document.createElement('p');
    summary.className = 'meta-summary';
    summary.textContent = meta.summary;
    section.append(summary);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'text-button';
    toggle.textContent = 'Leer más';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.onclick = () => {
      const expanded = summary.classList.toggle('expanded');
      toggle.textContent = expanded ? 'Leer menos' : 'Leer más';
      toggle.setAttribute('aria-expanded', String(expanded));
    };
    section.append(toggle);
  }
  if (metadataUrl(meta.url)) {
    const link = document.createElement('a');
    link.className = 'meta-source';
    link.href = meta.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Datos de IGDB.com';
    section.append(link);
  }
  return section;
}

export function metadataUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function metadataLink(label, url) {
  const link = document.createElement(metadataUrl(url) ? 'a' : 'span');
  link.textContent = label;
  if (link.tagName === 'A') {
    link.href = metadataUrl(url);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return link;
}

export let mediaSession = null;

export function openMediaViewer(pictures, index, title, trigger) {
  let viewer = document.querySelector('#media-viewer');
  if (!viewer) {
    viewer = document.createElement('dialog');
    viewer.id = 'media-viewer';
    viewer.className = 'media-viewer';
    viewer.setAttribute('aria-labelledby', 'media-viewer-title');
    viewer.innerHTML =
      '<header class="media-viewer-header"><div>' +
      '<h2 id="media-viewer-title"></h2></div><button type="button" class="icon-btn" aria-label="Cerrar galería">' +
      icon('x') +
      '</button></header><figure><img alt="Imagen de la galería" referrerpolicy="no-referrer" />' +
      '<video controls playsinline preload="metadata" hidden></video>' +
      '<figcaption id="media-viewer-status" role="status"></figcaption></figure>' +
      '<footer class="media-viewer-footer"><button type="button" class="button" data-gallery="previous">Anterior</button>' +
      '<span class="media-position" aria-live="polite"></span><button type="button" class="button" data-gallery="next">Siguiente</button>' +
      '<button type="button" class="button" data-gallery="retry" hidden>Reintentar imagen</button>' +
      '<button type="button" class="button" data-gallery="folder" hidden>' +
      icon('folder') +
      ' Mostrar en la carpeta</button></footer>';
    viewer.querySelector('.icon-btn').onclick = () => viewer.close();
    viewer.querySelector('[data-gallery=previous]').onclick = () => showMediaImage(-1);
    viewer.querySelector('[data-gallery=next]').onclick = () => showMediaImage(1);
    viewer.querySelector('[data-gallery=retry]').onclick = () => showMediaImage(0);
    viewer.querySelector('[data-gallery=folder]').onclick = () => {
      const picture = mediaSession?.pictures[mediaSession.index];
      if (picture?.reveal) picture.reveal();
    };
    viewer.addEventListener('keydown', (event) => {
      // La galería conserva el foco y no activa atajos de la biblioteca que queda detrás.
      event.stopPropagation();
      // Con el foco en el reproductor, las flechas adelantan o atrasan el video.
      if (event.target.closest('video')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showMediaImage(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    viewer.addEventListener('close', () => {
      const opener = mediaSession?.trigger;
      mediaSession = null;
      viewer.querySelector('img').removeAttribute('src');
      stopViewerVideo(viewer);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    });
    document.body.append(viewer);
  }
  mediaSession = { pictures, index, title, trigger };
  viewer.querySelector('h2').textContent = title;
  showMediaImage(0);
  viewer.showModal();
}

function stopViewerVideo(viewer) {
  const video = viewer.querySelector('video');
  if (!video.getAttribute('src')) return;
  video.pause();
  video.removeAttribute('src');
  video.load();
}

export function showMediaImage(direction) {
  if (!mediaSession) return;
  const viewer = document.querySelector('#media-viewer');
  const session = mediaSession;
  session.index = (session.index + direction + session.pictures.length) % session.pictures.length;
  const picture = session.pictures[session.index];
  const img = viewer.querySelector('img');
  const status = viewer.querySelector('figcaption');
  const retry = viewer.querySelector('[data-gallery=retry]');
  const figure = viewer.querySelector('figure');
  const video = viewer.querySelector('video');
  stopViewerVideo(viewer);
  video.hidden = true;
  status.textContent = picture.video ? 'Cargando video…' : 'Cargando imagen…';
  figure.setAttribute('aria-busy', 'true');
  retry.hidden = true;
  img.hidden = true;
  img.alt = picture.label + ' de ' + session.title;
  viewer.querySelector('.media-position').textContent = session.index + 1 + ' / ' + session.pictures.length;
  viewer.querySelectorAll('[data-gallery=previous], [data-gallery=next]').forEach((button) => {
    button.disabled = session.pictures.length < 2;
  });
  img.onload = () => {
    img.hidden = false;
    figure.setAttribute('aria-busy', 'false');
    status.textContent = picture.label + ' · Usá las flechas para recorrer o Esc para cerrar.';
  };
  img.onerror = () => {
    figure.setAttribute('aria-busy', 'false');
    status.textContent = picture.src
      ? 'No se pudo abrir la captura: puede que se haya movido o borrado.'
      : 'No se pudo cargar la imagen. Revisá tu conexión y reintentá.';
    retry.hidden = false;
  };
  // Capturas propias (src local, con su carpeta) o imágenes de IGDB (id).
  viewer.querySelector('[data-gallery=folder]').hidden = !picture.reveal;
  if (picture.video) {
    img.removeAttribute('src');
    video.setAttribute('aria-label', picture.label + ' de ' + session.title);
    video.onloadedmetadata = () => {
      video.hidden = false;
      figure.setAttribute('aria-busy', 'false');
      status.textContent = picture.label + ' · Espacio reproduce o pausa; Anterior y Siguiente recorren la galería.';
    };
    video.onerror = () => {
      figure.setAttribute('aria-busy', 'false');
      status.textContent =
        'No se pudo abrir el video: puede que se haya movido, borrado o que su formato no se pueda ver acá.';
      retry.hidden = false;
    };
    video.src = picture.video;
    return;
  }
  img.referrerPolicy = 'no-referrer';
  img.src = picture.src || 'https://images.igdb.com/igdb/image/upload/t_1080p/' + picture.id + '.jpg';
}

export function appendExtendedMetadata(section, meta, mediaSection) {
  const addSection = (title, populate, target = section) => {
    const details = document.createElement('details');
    details.className = 'detail-section metadata-section';
    const heading = document.createElement('summary');
    heading.textContent = title;
    const body = document.createElement('div');
    body.className = 'metadata-content';
    populate(body);
    if (!body.childElementCount) return;
    details.append(heading, body);
    details.open = title === 'Acerca del juego' || target === mediaSection;
    target.append(details);
  };
  const factList = (body, rows) => {
    const dl = document.createElement('dl');
    dl.className = 'detail-tech';
    rows.forEach(([label, value]) => {
      if (!value) return;
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      dl.append(dt, dd);
    });
    if (dl.childElementCount) body.append(dl);
  };
  const list = (body, items) => {
    if (!items.length) return;
    const ul = document.createElement('ul');
    items.forEach((item) => {
      const li = document.createElement('li');
      if (typeof item === 'string') li.textContent = item;
      else li.append(item);
      ul.append(li);
    });
    body.append(ul);
  };
  const date = (value) =>
    value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '';
  addSection('Acerca del juego', (body) => {
    factList(body, [
      ['Título en IGDB', meta.title],
      ['Tipo', meta.type],
      ['Estado', meta.status],
      ['Edición', meta.versionTitle],
      ['Primer lanzamiento', date(meta.firstReleaseDate)],
      ['Géneros', (meta.genres || []).join(', ')],
      ['Temáticas', (meta.themes || []).join(', ')],
      ['Modos de juego', (meta.modes || []).join(', ')],
      ['Perspectiva', (meta.perspectives || []).join(', ')],
      ['Plataformas', (meta.platforms || []).join(', ')],
      ['Motor', (meta.engines || []).join(', ')],
      ['Colecciones', (meta.collections || []).join(', ')],
      ['Franquicias', (meta.franchises || []).join(', ')],
      ['Palabras clave', (meta.keywords || []).join(', ')],
      [
        'Otros nombres',
        (meta.alternativeNames || [])
          .map((item) => item.name + (item.comment ? ' (' + item.comment + ')' : ''))
          .join('; ')
      ]
    ]);
  });
  if (meta.storyline)
    addSection('Historia · puede contener spoilers', (body) => {
      const p = document.createElement('p');
      p.textContent = meta.storyline;
      body.append(p);
    });
  addSection('Compañías', (body) => {
    const roles = {
      developer: 'Desarrollo',
      publisher: 'Publicación',
      porting: 'Adaptación',
      supporting: 'Colaboración'
    };
    list(
      body,
      (meta.companies || []).map((item) => item.name + ' · ' + item.roles.map((role) => roles[role] || role).join(', '))
    );
  });
  addSection('Valoraciones y duración', (body) => {
    const ratings = meta.ratings || {};
    const duration = (seconds) =>
      Number.isFinite(seconds) && seconds > 0
        ? new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(seconds / 3600) + ' h'
        : '';
    factList(body, [
      ...[
        ['critics', 'Crítica'],
        ['users', 'Comunidad IGDB'],
        ['total', 'Combinada']
      ].map(([key, label]) => [
        label,
        ratings[key]?.value != null ? ratings[key].value + '/100 · ' + ratings[key].count + ' valoraciones' : ''
      ]),
      ['Duración rápida estimada', duration(meta.timeToBeat?.hastily)],
      ['Duración habitual estimada', duration(meta.timeToBeat?.normally)],
      ['Completar al 100 %', duration(meta.timeToBeat?.completely)],
      ['Muestras de duración', meta.timeToBeat?.count ? String(meta.timeToBeat.count) : '']
    ]);
  });
  addSection('Idiomas', (body) => {
    const languages = new Map();
    const supports = { Audio: 'Audio', Subtitles: 'Subtítulos', Interface: 'Interfaz' };
    (meta.languages || []).forEach((item) => {
      const label = item.nativeName || item.name;
      const values = languages.get(label) || new Set();
      if (item.support) values.add(supports[item.support] || item.support);
      languages.set(label, values);
    });
    list(
      body,
      [...languages].map(([name, values]) => name + (values.size ? ' · ' + [...values].join(', ') : ''))
    );
  });
  addSection('Multijugador por plataforma', (body) => {
    (meta.multiplayer || []).forEach((item) => {
      const title = document.createElement('h4');
      title.textContent = item.platform || 'Plataforma sin especificar';
      body.append(title);
      const features = [
        ['campaigncoop', 'Campaña cooperativa'],
        ['dropin', 'Entrada y salida durante la partida'],
        ['lancoop', 'Cooperativo por LAN'],
        ['offlinecoop', 'Cooperativo local'],
        ['onlinecoop', 'Cooperativo en línea'],
        ['splitscreen', 'Pantalla dividida local'],
        ['splitscreenonline', 'Pantalla dividida en línea']
      ];
      list(
        body,
        features.filter(([key]) => item[key]).map(([, label]) => label)
      );
      factList(
        body,
        [
          ['offlinemax', 'Máximo local'],
          ['onlinemax', 'Máximo en línea'],
          ['offlinecoopmax', 'Máximo cooperativo local'],
          ['onlinecoopmax', 'Máximo cooperativo en línea']
        ].map(([key, label]) => [label, item[key] > 0 ? item[key] + ' jugadores' : ''])
      );
    });
  });
  addSection('Clasificaciones de edad', (body) => {
    list(
      body,
      (meta.ageRatings || []).map(
        (item) =>
          item.organization +
          ' ' +
          item.rating +
          (item.descriptions.length ? ' · ' + item.descriptions.join(', ') : '') +
          (item.synopsis ? ' — ' + item.synopsis : '')
      )
    );
  });
  addSection('Lanzamientos por plataforma y región', (body) => {
    list(
      body,
      (meta.releases || []).map((item) =>
        [item.platform, item.region, item.label || date(item.date), item.status].filter(Boolean).join(' · ')
      )
    );
  });
  addSection(
    'Capturas e ilustraciones',
    (body) => {
      const gallery = document.createElement('div');
      gallery.className = 'metadata-gallery';
      const pictures = [
        ...(meta.screenshots || []).map((id) => ({ id, label: 'Captura' })),
        ...(meta.artworks || []).map((id) => ({ id, label: 'Ilustración' }))
      ].filter(({ id }, index, all) => /^[a-z0-9]+$/i.test(id) && all.findIndex((item) => item.id === id) === index);
      pictures.forEach(({ id, label }, index) => {
        const base = 'https://images.igdb.com/igdb/image/upload/';
        const link = document.createElement('button');
        link.type = 'button';
        link.className = 'gallery-thumbnail';
        link.setAttribute('aria-label', 'Ampliar ' + label.toLowerCase() + ' ' + (index + 1) + ' de ' + meta.title);
        link.setAttribute('aria-haspopup', 'dialog');
        link.onclick = () => openMediaViewer(pictures, index, meta.title, link);
        const img = document.createElement('img');
        img.src = base + 't_screenshot_med/' + id + '.jpg';
        img.alt = label + ' de ' + meta.title + ' (' + (index + 1) + ')';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => {
          img.hidden = true;
          link.textContent = img.alt + ' · Ampliar imagen';
        };
        link.replaceChildren(img);
        gallery.append(link);
      });
      if (!gallery.childElementCount) return;
      // Tira desplazable con flechas, como las filas de Inicio: se ven sólo si hay más capturas de las que entran.
      const strip = document.createElement('div');
      strip.className = 'gallery-strip';
      const arrows = [-1, 1].map((direction) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'icon-btn gallery-arrow ' + (direction < 0 ? 'previous' : 'next');
        button.innerHTML = icon(direction < 0 ? 'chevronLeft' : 'chevronRight');
        button.setAttribute('aria-label', direction < 0 ? 'Capturas anteriores' : 'Más capturas');
        button.onclick = () =>
          gallery.scrollBy({
            left: direction * gallery.clientWidth * 0.85,
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
          });
        return button;
      });
      const update = () => {
        const overflow = gallery.scrollWidth > gallery.clientWidth + 4;
        arrows[0].hidden = !overflow || gallery.scrollLeft <= 4;
        arrows[1].hidden = !overflow || gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 4;
      };
      gallery.addEventListener('scroll', update, { passive: true });
      new ResizeObserver(update).observe(gallery);
      strip.append(arrows[0], gallery, arrows[1]);
      body.append(strip);
    },
    mediaSection
  );
  addSection(
    'Videos y enlaces',
    (body) => {
      list(body, [
        ...(meta.videos || []).map((item) => metadataLink(item.name, item.url)),
        ...(meta.websites || []).map((item) => metadataLink(item.label, item.url))
      ]);
    },
    mediaSection
  );
  addSection('Ediciones y juegos relacionados', (body) => {
    const labels = {
      parent_game: 'Juego base',
      version_parent: 'Edición base',
      dlcs: 'DLC',
      expansions: 'Expansiones',
      standalone_expansions: 'Expansiones independientes',
      remakes: 'Remakes',
      remasters: 'Remasterizaciones',
      ports: 'Adaptaciones',
      expanded_games: 'Versiones ampliadas',
      bundles: 'Paquetes',
      similar_games: 'Juegos similares'
    };
    Object.entries(meta.related || {}).forEach(([key, games]) => {
      if (!games.length) return;
      const heading = document.createElement('h4');
      heading.textContent = labels[key] || key;
      body.append(heading);
      list(
        body,
        games.map((game) => metadataLink(game.name, game.url))
      );
    });
  });
  if (meta.fetchedAt) {
    const updated = document.createElement('p');
    updated.className = 'meta-source';
    updated.textContent =
      'Información descargada: ' +
      date(meta.fetchedAt) +
      (meta.sourceUpdatedAt ? ' · Actualizada en IGDB: ' + date(meta.sourceUpdatedAt) : '');
    section.append(updated);
  }
}

// Descripción del juego: en español desde la tienda de Steam cuando existe; si no, la de IGDB (en inglés).
export const steamDescriptions = new Map();

export function steamDescription(game) {
  if (game.platform !== 'Steam' || !/^\d+$/.test(game.id)) return Promise.resolve('');
  if (!steamDescriptions.has(game.id))
    steamDescriptions.set(
      game.id,
      request('/api/steam/games/' + encodeURIComponent(game.id) + '/details')
        .then((envelope) => steamPlain(envelope.store?.data?.short_description || ''))
        .catch(() => '')
    );
  return steamDescriptions.get(game.id);
}

export function descriptionSection(game) {
  const section = document.createElement('section');
  section.className = 'game-description';
  section.setAttribute('aria-busy', 'true');
  section.innerHTML =
    '<span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line"></span>' +
    '<span class="skeleton skeleton-line short"></span>';
  const english = game.meta?.summary || '';
  // Se espera la versión en español un momento; si no llega, se muestra la de IGDB y se reemplaza al llegar.
  let settled = false;
  const show = (text, source) => {
    settled = true;
    section.setAttribute('aria-busy', 'false');
    section.replaceChildren();
    if (!text) {
      section.remove();
      return;
    }
    const paragraph = document.createElement('p');
    paragraph.className = 'meta-summary';
    paragraph.textContent = text;
    const note = document.createElement('p');
    note.className = 'meta-source';
    note.textContent = source;
    section.append(paragraph);
    if (text.length > 420) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'text-button';
      toggle.textContent = 'Leer más';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.onclick = () => {
        const expanded = paragraph.classList.toggle('expanded');
        toggle.textContent = expanded ? 'Leer menos' : 'Leer más';
        toggle.setAttribute('aria-expanded', String(expanded));
      };
      section.append(toggle);
    }
    section.append(note);
  };
  const wiki = game.arcade && game.arcade.wiki;
  if (wiki && wiki.extract) {
    show(wiki.extract, 'Introducción del artículo «' + wiki.title + '» de Wikipedia en español.');
    const source = section.querySelector('.meta-source');
    if (source && /^https:\/\/es\.wikipedia\.org\//.test(wiki.url)) {
      const link = document.createElement('a');
      link.href = wiki.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Leer en Wikipedia';
      source.append(' ', link);
    }
    return section;
  }
  const fallback = () => show(english, 'Descripción de IGDB, disponible sólo en inglés.');
  const timer = setTimeout(() => !settled && fallback(), 1500);
  steamDescription(game).then((spanish) => {
    clearTimeout(timer);
    if (spanish) show(spanish, 'Descripción de la tienda de Steam.');
    else if (!settled) fallback();
  });
  return section;
}

export const launchKinds = {
  uri: 'Mediante el launcher de la tienda',
  file: 'Archivo ejecutable',
  appsFolder: 'Aplicación de Microsoft Store',
  mame: 'Con MAME, desde tu carpeta de MAME'
};

// Datos técnicos de la instalación, aparte del resumen: sólo hacen falta para resolver problemas.
export function installationSection(game) {
  const details = document.createElement('details');
  details.className = 'detail-section launch-details';
  details.innerHTML = '<summary>Instalación</summary><dl class="detail-tech"></dl>';
  const list = details.querySelector('dl');
  [
    ['Estado', statusText(game)],
    ['Unidad', game.drive],
    ['Ubicación', game.location],
    ['Cómo se inicia', game.launch ? launchKinds[game.launch.type] || game.launch.type : ''],
    ['Nombre en la tienda', game.originalName],
    ['Set de MAME', game.arcade ? game.id : ''],
    ['Detección', game.evidence]
  ].forEach(([label, value]) => {
    if (!value) return;
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    list.append(term, description);
  });
  return details;
}

export function personalSection(game) {
  const section = document.createElement('section');
  section.className = 'detail-section personal-notes';
  section.innerHTML = '<h3>Tus notas</h3><p class="notes"></p><div class="tag-list personal-tags"></div>';
  section.querySelector('.notes').textContent =
    game.notes || 'Todavía no escribiste notas. Usá Editar para agregarlas.';
  tagsOf(game).forEach((tag) => {
    const label = document.createElement('span');
    label.textContent = '#' + tag;
    section.querySelector('.personal-tags').append(label);
  });
  return section;
}

// Pestañas de la ficha (Resumen, Información, Multimedia, Tus capturas y, en Steam, Steam y Logros).
// Se usan en la vista Ficha de la Biblioteca y en la página de cada juego.
export function gameTabs(game, { summaryExtras = [], prefix = 'detail' } = {}) {
  const tabs = document.createElement('div');
  tabs.className = 'detail-tabs';
  const tablist = document.createElement('div');
  tablist.className = 'detail-tablist';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Secciones de la ficha');
  const content = new Map();
  tabs.append(tablist);
  [
    ['summary', 'Resumen'],
    ['information', 'Información'],
    ['media', 'Multimedia'],
    ['captures', 'Tus capturas'],
    ...(game.platform === 'Steam'
      ? [
          ['steam', 'Steam'],
          ['achievements', 'Logros']
        ]
      : [])
  ].forEach(([key, label]) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = prefix + '-tab-' + key;
    tab.textContent = label;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', prefix + '-panel-' + key);
    tab.dataset.tab = key;
    const body = document.createElement('section');
    body.id = prefix + '-panel-' + key;
    body.className = 'detail-tabpanel';
    body.setAttribute('role', 'tabpanel');
    body.setAttribute('aria-labelledby', tab.id);
    body.tabIndex = 0;
    content.set(key, body);
    tab.onclick = () => selectDetailTab(key);
    tablist.append(tab);
    tabs.append(body);
  });
  const selectDetailTab = (key, focus = false) => {
    state.detailTab = key;
    tablist.querySelectorAll('[role=tab]').forEach((tab) => {
      const active = tab.dataset.tab === key;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      content.get(tab.dataset.tab).hidden = !active;
      if (active && focus) tab.focus({ preventScroll: true });
    });
    if (key === 'steam' || key === 'achievements') loadSteamGameTab(content.get(key), game, key);
    if (key === 'captures') loadCapturesTab(content.get(key), game);
  };
  tablist.addEventListener('keydown', (event) => {
    const keys = [...content.keys()];
    const index = keys.indexOf(event.target.dataset.tab);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? keys.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
    selectDetailTab(keys[next], true);
  });
  const overview = content.get('summary');
  const information = content.get('information');
  const media = content.get('media');
  overview.append(descriptionSection(game));
  if (game.meta) overview.append(metaSection({ ...game.meta, summary: '' }));
  overview.append(...summaryExtras, personalSection(game), installationSection(game));
  if (game.arcade) appendArcadeDetails(game, information, media);
  if (game.meta && (!game.arcade || game.meta.igdbId)) appendExtendedMetadata(information, game.meta, media);
  [
    [
      information,
      'Todavía no hay información ampliada de este juego. Actualizá la información de IGDB en Configuración.'
    ],
    [media, 'IGDB todavía no tiene imágenes, videos ni enlaces disponibles para este juego.']
  ].forEach(([body, message]) => {
    if (body.childElementCount) return;
    const empty = document.createElement('p');
    empty.className = 'detail-empty';
    empty.textContent = message;
    body.append(empty);
  });
  selectDetailTab(content.has(state.detailTab) ? state.detailTab : 'summary');
  return tabs;
}

// Arcade: datos de la máquina según MAME, sus versiones regionales y las imágenes del juego.
export const arcadeControls = {
  joy: 'Palanca',
  stick: 'Palanca analógica',
  trackball: 'Trackball',
  dial: 'Perilla',
  paddle: 'Paleta',
  lightgun: 'Pistola',
  pedal: 'Pedal',
  doublejoy: 'Doble palanca',
  positional: 'Volante',
  mouse: 'Mouse',
  keypad: 'Teclado numérico',
  keyboard: 'Teclado',
  mahjong: 'Panel de mahjong',
  hanafuda: 'Panel de hanafuda',
  gambling: 'Panel de apuestas'
};

export const emulationText = {
  good: 'Completa',
  imperfect: 'Jugable, con fallos menores de imagen o sonido'
};

export function appendArcadeDetails(game, information, media) {
  const arcade = game.arcade;
  const section = (title, open = true) => {
    const details = document.createElement('details');
    details.className = 'detail-section metadata-section';
    details.open = open;
    details.innerHTML = '<summary></summary><div class="metadata-content"></div>';
    details.querySelector('summary').textContent = title;
    return details;
  };
  const about = section('Acerca de la máquina');
  const list = document.createElement('dl');
  list.className = 'detail-tech';
  [
    ['Nombre en MAME', arcade.description],
    ['Fabricante', arcade.manufacturer],
    ['Año', arcade.year],
    ['Saga', arcade.series],
    ['Categoría', arcade.category],
    ['Jugadores', arcade.players ? String(arcade.players) : ''],
    ['Controles', (arcade.controls || []).map((item) => arcadeControls[item] || item).join(', ')],
    ['Pantalla', arcade.vertical ? 'Vertical' : 'Horizontal'],
    ['Emulación', emulationText[arcade.emulation] || ''],
    // Sólo se muestra para los juegos que abre el MAME alternativo.
    ['Emulador', arcade.engine === 'legacy' && arcade.mameVersion ? `MAME ${arcade.mameVersion} (alternativo)` : '']
  ].forEach(([label, value]) => {
    if (!value) return;
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    list.append(term, description);
  });
  about.querySelector('.metadata-content').append(list);
  information.append(about);
  if (arcade.versions && arcade.versions.length) {
    const versions = section('Versiones (' + arcade.versions.length + ')');
    const items = document.createElement('ul');
    items.className = 'arcade-versions';
    arcade.versions.forEach((version) => {
      const item = document.createElement('li');
      item.innerHTML = '<span class="version-name"></span><button type="button" class="button small"></button>';
      item.querySelector('.version-name').textContent = version.label;
      item.querySelector('.version-name').title = version.description;
      const button = item.querySelector('button');
      button.innerHTML = icon('play') + '<span>Jugar</span>';
      button.setAttribute('aria-label', 'Jugar ' + version.description);
      button.onclick = () => playGame(game, version.id);
      item.append(button);
      items.append(item);
    });
    versions.querySelector('.metadata-content').append(items);
    information.append(versions);
  }
  if (arcade.commands) information.append(movesSection(game));
  // Imágenes de libretro-thumbnails: pantalla de título y juego, en pixel art nítido.
  const gallery = document.createElement('div');
  gallery.className = 'arcade-shots';
  const base = 'https://raw.githubusercontent.com/libretro-thumbnails/MAME/master/';
  const file = encodeURIComponent(arcade.description.replace(/[&*/:`<>?\\|"]/g, '_')) + '.png';
  [
    ['Named_Titles', 'Pantalla de título'],
    ['Named_Snaps', 'En juego']
  ].forEach(([folder, label]) => {
    const figure = document.createElement('figure');
    figure.innerHTML = '<img loading="lazy" referrerpolicy="no-referrer" /><figcaption></figcaption>';
    const img = figure.querySelector('img');
    img.src = base + folder + '/' + file;
    img.alt = label + ' de ' + game.name;
    img.onerror = () => figure.remove();
    figure.querySelector('figcaption').textContent = label;
    gallery.append(figure);
  });
  const shots = section('Imágenes');
  shots.querySelector('.metadata-content').append(gallery);
  media.append(shots);
}

// Movimientos (command.dat): se piden al abrir la sección. Cada personaje o sección es un grupo plegable.
export const moveKinds = { agarre: 'Agarre', mando: 'Golpe de mando', especial: 'Especial' };

export function movesSection(game) {
  const details = document.createElement('details');
  details.className = 'detail-section metadata-section moves';
  details.innerHTML = '<summary>Movimientos</summary><div class="metadata-content"></div>';
  const body = details.querySelector('.metadata-content');
  let loaded = false;
  details.addEventListener('toggle', async () => {
    if (!details.open || loaded) return;
    loaded = true;
    body.innerHTML = '<span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line short"></span>';
    try {
      const { sections } = await request('/api/arcade/' + encodeURIComponent(game.id) + '/commands');
      body.replaceChildren(
        ...sections.map((item, index) => {
          const group = document.createElement('details');
          group.className = 'move-group';
          group.open = index < 2;
          group.innerHTML = '<summary></summary><dl class="move-list"></dl>';
          group.querySelector('summary').textContent = item.title;
          const list = group.querySelector('dl');
          item.rows.forEach((row) => {
            const term = document.createElement('dt');
            term.textContent = row.label;
            if (row.kind) {
              const badge = document.createElement('span');
              badge.className = 'move-kind ' + row.kind;
              badge.textContent = moveKinds[row.kind];
              term.prepend(badge);
            }
            const value = document.createElement('dd');
            value.textContent = row.command;
            list.append(term, value);
          });
          item.notes.forEach((note) => {
            const paragraph = document.createElement('p');
            paragraph.className = 'move-note';
            paragraph.textContent = note;
            group.append(paragraph);
          });
          return group;
        })
      );
      const credit = document.createElement('p');
      credit.className = 'meta-source';
      credit.textContent = 'Comandos de command.dat, de Fabricio Coroquer y AntoPISA (progetto-SNAPS).';
      body.append(credit);
    } catch (error) {
      body.textContent = error.message;
      loaded = false;
    }
  });
  return details;
}
