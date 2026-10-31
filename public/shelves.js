// Selección de juegos para Inicio: la imagen principal y las filas por intención.
// Funciones puras sobre la lista de juegos; se usan en la interfaz y en las pruebas (globalThis.GMLShelves).
(function (root) {
  const DAY = 24 * 60 * 60 * 1000;
  const SHORT_SESSION_SECONDS = 8 * 60 * 60;
  const SHELF_LIMIT = 15;

  const playable = (game) => game.installed !== false && Boolean(game.launch && game.launch.available);
  const time = (value) => {
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
  };
  // Última vez que se jugó, desde la aplicación o según Steam.
  function lastPlayed(game) {
    return Math.max(time(game.lastLaunchedAt), time(game.steam && game.steam.lastPlayedAt));
  }
  const rating = (game) => (game.meta && Number.isFinite(game.meta.rating) ? game.meta.rating : null);
  const normalLength = (game) => {
    const seconds = game.meta && game.meta.timeToBeat && game.meta.timeToBeat.normally;
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  };
  const byName = (a, b) => a.name.localeCompare(b.name, 'es');

  function recentlyPlayed(games) {
    return games
      .filter((game) => playable(game) && lastPlayed(game) > 0)
      .sort((a, b) => lastPlayed(b) - lastPlayed(a) || byName(a, b));
  }

  // Hasta cinco juegos para la imagen principal, cada uno con el motivo por el que aparece.
  function heroCandidates(games) {
    const picks = [];
    const add = (game, reason) => {
      if (game && picks.length < 5 && !picks.some((item) => item.game.key === game.key)) picks.push({ game, reason });
    };
    recentlyPlayed(games).forEach((game) => add(game, 'recent'));
    games
      .filter((game) => game.favorite && playable(game))
      .sort(byName)
      .forEach((game) => add(game, 'favorite'));
    games
      .filter((game) => playable(game) && rating(game) != null)
      .sort((a, b) => rating(b) - rating(a) || byName(a, b))
      .forEach((game) => add(game, 'rated'));
    games
      .filter((game) => playable(game) && game.platform !== 'Arcade')
      .sort(byName)
      .forEach((game) => add(game, 'ready'));
    return picks;
  }

  // Filas de Inicio en orden; las vacías no se devuelven, salvo Favoritos, que invita a marcar juegos.
  // Clásicos del arcade: los mejor rankeados de la colección, en un orden que cambia cada día para
  // que la fila invite a descubrir y no muestre siempre los mismos quince.
  function arcadeClassics(games, now = Date.now()) {
    const day = Math.floor(now / DAY);
    const mix = (key) => {
      let hash = 2166136261;
      for (let index = 0; index < key.length; index += 1) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
      // Mezcla con el día (finalizador de MurmurHash3): cada día da otro orden, estable durante ese día.
      hash ^= Math.imul(day, 2654435761);
      hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
      hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
      return (hash ^ (hash >>> 16)) >>> 0;
    };
    return games
      .filter((game) => game.platform === 'Arcade' && playable(game) && game.arcade && game.arcade.score >= 80)
      .sort((a, b) => b.arcade.score - a.arcade.score || mix(a.key) - mix(b.key));
  }
  function homeShelves(games, { exclude = [], now = Date.now() } = {}) {
    const skip = new Set(exclude);
    const limit = (list) => list.filter((game) => !skip.has(game.key)).slice(0, SHELF_LIMIT);
    const shelves = [
      {
        id: 'continue',
        title: 'Continuar',
        subtitle: 'Lo último que jugaste, en Steam o desde acá.',
        games: limit(recentlyPlayed(games))
      },
      {
        id: 'favorites',
        title: 'Favoritos',
        subtitle: '',
        empty: 'Marcá un juego con la estrella, o con la tecla F, y va a aparecer acá.',
        games: limit(games.filter((game) => game.favorite).sort(byName))
      },
      {
        id: 'unplayed',
        title: 'Instalados sin estrenar',
        subtitle: 'Sin horas registradas en Steam.',
        games: limit(
          games
            .filter((game) => playable(game) && game.steam && game.steam.playtimeHours === 0 && !game.lastLaunchedAt)
            .sort((a, b) => (rating(b) ?? -1) - (rating(a) ?? -1) || byName(a, b))
        )
      },
      {
        id: 'short',
        title: 'Para una sesión corta',
        subtitle: 'Se terminan en menos de 8 horas, según IGDB.',
        games: limit(
          games
            .filter((game) => playable(game) && normalLength(game) && normalLength(game) <= SHORT_SESSION_SECONDS)
            .sort((a, b) => normalLength(a) - normalLength(b) || byName(a, b))
        )
      },
      {
        id: 'rated',
        title: 'Lo mejor valorado de tu colección',
        subtitle: 'Según la crítica reunida por IGDB.',
        games: limit(
          games
            .filter((game) => playable(game) && rating(game) >= 80)
            .sort((a, b) => rating(b) - rating(a) || byName(a, b))
        )
      },
      {
        id: 'arcade',
        title: 'Clásicos del arcade',
        subtitle: 'Los mejor rankeados por la comunidad de MAME. Cambian cada día.',
        games: limit(arcadeClassics(games, now))
      },
      {
        id: 'install',
        title: 'Para instalar',
        subtitle: 'Muy valorados, en tu cuenta de Steam y todavía sin instalar.',
        games: limit(
          games
            .filter((game) => game.installed === false && game.ownership === 'owned' && rating(game) >= 80)
            .sort((a, b) => rating(b) - rating(a) || byName(a, b))
        )
      }
    ];
    return shelves.filter((shelf) => shelf.games.length || shelf.id === 'favorites');
  }

  // «Hoy», «Ayer», «Hace 5 días», «Hace 3 semanas» o la fecha, para fechas pasadas.
  function relativeDay(value, now = Date.now()) {
    const moment = time(value);
    if (!moment) return '';
    const startOf = (stamp) => {
      const date = new Date(stamp);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    };
    const days = Math.round((startOf(now) - startOf(moment)) / DAY);
    if (days <= 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return 'Hace ' + days + ' días';
    if (days < 30) return 'Hace ' + Math.floor(days / 7) + (days < 14 ? ' semana' : ' semanas');
    return new Date(moment).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  // «recién», «hace 12 min», «hace 3 h», «hace 2 días»: para la última sincronización.
  function relativeTime(value, now = Date.now()) {
    const moment = time(value);
    if (!moment) return '';
    const minutes = Math.max(0, Math.round((now - moment) / 60000));
    if (minutes < 1) return 'recién';
    if (minutes < 60) return 'hace ' + minutes + ' min';
    const hours = Math.round(minutes / 60);
    if (hours < 24) return 'hace ' + hours + ' h';
    const days = Math.round(hours / 24);
    return days === 1 ? 'hace 1 día' : 'hace ' + days + ' días';
  }
  // Horas jugadas: las de Steam si es de Steam; si no, las que midió el launcher.
  function playedHours(game) {
    if (game.steam && Number.isFinite(game.steam.playtimeHours)) return game.steam.playtimeHours;
    return Number.isFinite(game.playSeconds) && game.playSeconds > 0 ? game.playSeconds / 3600 : 0;
  }
  function hours(value) {
    if (!Number.isFinite(value) || value <= 0) return '';
    if (value < 1) return Math.max(1, Math.round(value * 60)) + ' min';
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value) + ' h';
  }

  // Modo sala: la biblioteca en filas de hasta `perRow` juegos, agrupadas por letra inicial (los números y
  // signos van juntos en «#»). Cada fila conoce su letra para saltar de una a otra con el mando.
  function initialOf(name) {
    const letter = String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^(the|a|an)\s+/i, '')
      .charAt(0)
      .toUpperCase();
    return /[A-Z]/.test(letter) ? letter : '#';
  }
  function libraryRows(games, perRow = 7) {
    const bare = (name) => String(name || '').replace(/^(the|a|an)\s+/i, '');
    const sorted = [...games].sort(
      (a, b) =>
        (initialOf(a.name) === '#' ? 0 : 1) - (initialOf(b.name) === '#' ? 0 : 1) ||
        bare(a.name).localeCompare(bare(b.name), 'es')
    );
    const groups = new Map();
    for (const game of sorted) {
      const letter = initialOf(game.name);
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter).push(game);
    }
    const rows = [];
    for (const [letter, list] of groups)
      for (let index = 0; index < list.length; index += perRow)
        rows.push({
          id: 'letter-' + letter + '-' + index,
          letter,
          title: index === 0 ? letter : '',
          games: list.slice(index, index + perRow)
        });
    return rows;
  }

  root.GMLShelves = {
    lastPlayed,
    heroCandidates,
    homeShelves,
    relativeDay,
    relativeTime,
    hours,
    playedHours,
    playable,
    libraryRows,
    initialOf
  };
})(globalThis);
