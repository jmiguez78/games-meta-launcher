// Mando y pantalla grande. El mando se traduce a las mismas teclas que ya entiende la aplicación:
// cruceta o palanca = flechas, A = elegir (sobre un juego abre su página), B = Escape, X = F (favorito),
// Y = buscar (Control+K),
// LB / RB = sección anterior o siguiente, Menú = pantalla grande.
// Donde ninguna pantalla usa las flechas, el foco se mueve al elemento más cercano en esa dirección.
(function (root) {
  // Elige, entre rectángulos candidatos, el más cercano en la dirección pedida (navegación espacial).
  // Se descartan los que no están del lado correcto; se premia la alineación con el eje del movimiento.
  function pickNeighbor(from, candidates, direction) {
    const center = (rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    const origin = center(from);
    let best = null;
    let bestScore = Infinity;
    candidates.forEach((rect, index) => {
      const point = center(rect);
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const along = { right: dx, left: -dx, down: dy, up: -dy }[direction];
      const across = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
      if (along <= 1) return;
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = index;
      }
    });
    return best;
  }
  root.GMLGamepad = { pickNeighbor };
  if (typeof document === 'undefined') return;

  const BUTTONS = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, menu: 9, up: 12, down: 13, left: 14, right: 15 };
  const FIRST_REPEAT = 380;
  const REPEAT = 130;
  const held = new Map();
  let polling = false;
  let announced = false;

  const focusables = () => {
    const scope = document.querySelector('dialog[open]') || document;
    return [
      ...scope.querySelectorAll(
        'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), .tile'
      )
    ].filter((element) => {
      if (element.disabled || element.closest('[hidden], .hidden, [inert]')) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  };
  function key(name) {
    const target =
      document.activeElement && document.activeElement !== document.body ? document.activeElement : document;
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  }
  function ensureFocus() {
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return true;
    // Sin foco, se empieza por el juego elegido de la pantalla actual, o por su primer control.
    const page = document.querySelector('.page:not(.hidden)') || document;
    const start = page.querySelector('.tile.selected, .tile, .hero-play, button, a[href]');
    start?.focus();
    return false;
  }
  function move(direction) {
    if (!ensureFocus()) return;
    const names = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
    if (key(names[direction])) return;
    const active = document.activeElement;
    const candidates = focusables().filter((element) => element !== active && !active.contains(element));
    const index = pickNeighbor(
      active.getBoundingClientRect(),
      candidates.map((element) => element.getBoundingClientRect()),
      direction
    );
    if (index == null) return;
    const next = candidates[index];
    // Al entrar a una colección se usa su juego elegido, para no perder la posición.
    const collection = next.closest('[data-tiles]');
    const target =
      collection && !collection.contains(active) ? collection.querySelector('.tile.selected') || next : next;
    target.focus();
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function press(button) {
    if (button === 'a') {
      if (!ensureFocus()) return;
      const active = document.activeElement;
      // Sobre un juego, A abre su página (como Espacio): jugar queda a un segundo A, sin lanzamientos por error.
      if (active.classList.contains('tile') && !active.closest('table')) key(' ');
      else if (!key('Enter') && active.matches('button, a[href], summary, input[type=checkbox], label')) active.click();
    } else if (button === 'b') {
      if (!key('Escape')) {
        const dialog = document.querySelector('dialog[open]');
        if (dialog) dialog.close();
      }
    } else if (button === 'x') {
      if (ensureFocus()) key('f');
    } else if (button === 'y') {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true })
      );
    } else if (button === 'lb' || button === 'rb') {
      const pages = [...document.querySelectorAll('.nav-item[data-page]:not(.hidden)')];
      const current = pages.findIndex((item) => item.classList.contains('active'));
      const next = pages[(current + (button === 'rb' ? 1 : -1) + pages.length) % pages.length];
      next?.click();
      requestAnimationFrame(() => ensureFocus());
    } else if (button === 'menu') toggleBigScreen();
    else move(button);
  }
  function poll() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    if (!pads.length) {
      polling = false;
      held.clear();
      return;
    }
    const pad = pads[0];
    const now = performance.now();
    const pressed = (index) => Boolean(pad.buttons[index]?.pressed);
    const stick = {
      left: pad.axes[0] < -0.5,
      right: pad.axes[0] > 0.5,
      up: pad.axes[1] < -0.5,
      down: pad.axes[1] > 0.5
    };
    for (const [name, index] of Object.entries(BUTTONS)) {
      const down = pressed(index) || Boolean(stick[name]);
      const since = held.get(name);
      if (down && since == null) {
        held.set(name, { start: now, last: now });
        document.body.classList.add('gamepad-active');
        press(name);
      } else if (down && ['up', 'down', 'left', 'right'].includes(name)) {
        // Mantener una dirección repite el movimiento, primero con una pausa y después más rápido.
        if (now - since.start > FIRST_REPEAT && now - since.last > REPEAT) {
          since.last = now;
          press(name);
        }
      } else if (!down && since != null) held.delete(name);
    }
    requestAnimationFrame(poll);
  }
  function startPolling() {
    if (polling) return;
    polling = true;
    requestAnimationFrame(poll);
  }
  window.addEventListener('gamepadconnected', () => {
    startPolling();
    if (!announced && typeof notify === 'function') {
      announced = true;
      notify('Mando conectado. A elige, B vuelve, Y busca y Menú cambia a pantalla grande.', { type: 'info' });
    }
  });
  // El puntero o el teclado vuelven a la presentación normal del foco.
  window.addEventListener('pointermove', () => document.body.classList.remove('gamepad-active'), { passive: true });

  // Pantalla grande: todo más grande y la ventana a pantalla completa, para jugar desde el sillón.
  function setBigScreen(on) {
    document.body.classList.toggle('big-screen', on);
    try {
      localStorage.setItem('gml-big-screen', on ? 'yes' : 'no');
    } catch {
      /* sin almacenamiento local no se recuerda */
    }
    if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    document.querySelectorAll('[data-big-screen]').forEach((control) => {
      control.setAttribute('aria-pressed', String(on));
      if (control.type === 'checkbox') control.checked = on;
    });
  }
  function toggleBigScreen() {
    setBigScreen(!document.body.classList.contains('big-screen'));
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'F11') {
      event.preventDefault();
      toggleBigScreen();
    }
  });
  document.addEventListener('fullscreenchange', () => {
    // Si se sale de la pantalla completa con Escape o desde Windows, se vuelve al tamaño normal.
    if (!document.fullscreenElement && document.body.classList.contains('big-screen')) setBigScreen(false);
  });
  root.GMLGamepad.setBigScreen = setBigScreen;
  root.GMLGamepad.toggleBigScreen = toggleBigScreen;
  try {
    if (localStorage.getItem('gml-big-screen') === 'yes') document.body.classList.add('big-screen');
  } catch {
    /* sin almacenamiento local se empieza en tamaño normal */
  }
  if (navigator.getGamepads && [...navigator.getGamepads()].some(Boolean)) startPolling();
})(globalThis);
