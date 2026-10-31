// Búsqueda, filtros por facetas, orden y agrupación de duplicados de la Biblioteca.
// Funciones puras sobre la lista de juegos; se usan en la interfaz y en las pruebas (globalThis.GMLCatalog).
(function (root) {
  const HOUR = 3600;
  const time = (value) => {
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const lastPlayed = (game) => Math.max(time(game.lastLaunchedAt), time(game.steam && game.steam.lastPlayedAt));
  const isArcade = (game) => game.platform === 'Arcade';
  // Horas según Steam o, para lo que abre el propio launcher (Arcade), según las sesiones que midió.
  const hoursPlayed = (game) => {
    if (game.steam && Number.isFinite(game.steam.playtimeHours)) return game.steam.playtimeHours;
    if (Number.isFinite(game.playSeconds) && game.playSeconds > 0) return game.playSeconds / HOUR;
    return isArcade(game) ? 0 : null;
  };
  const rating = (game) => (game.meta && Number.isFinite(game.meta.rating) ? game.meta.rating : null);
  const length = (game) => {
    const seconds = game.meta && game.meta.timeToBeat && game.meta.timeToBeat.normally;
    return Number.isFinite(seconds) && seconds > 0 ? seconds / HOUR : null;
  };
  const playable = (game) => game.installed !== false && Boolean(game.launch && game.launch.available);
  const normalize = (text) =>
    String(text || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  // Título comparable entre tiendas: sin mayúsculas, tildes, marcas ni signos. Se recuerda por nombre.
  const titleKeys = new Map();
  function titleKey(name) {
    let key = titleKeys.get(name);
    if (key === undefined) {
      key = normalize(name)
        .replace(/[®™©]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      if (titleKeys.size > 50000) titleKeys.clear();
      titleKeys.set(name, key);
    }
    return key;
  }

  // Facetas: cada una devuelve los valores de un juego. Dentro de una faceta las opciones se suman (o);
  // entre facetas se combinan (y).
  const facets = {
    store: { label: 'Tienda', values: (game) => [game.platform] },
    genre: { label: 'Género', values: (game) => (game.meta && game.meta.genres) || [] },
    length: {
      label: 'Duración',
      options: [
        ['short', 'Menos de 8 h'],
        ['medium', 'De 8 a 25 h'],
        ['long', 'Más de 25 h']
      ],
      values: (game) => {
        const hours = length(game);
        if (hours == null) return [];
        return [hours <= 8 ? 'short' : hours <= 25 ? 'medium' : 'long'];
      }
    },
    played: {
      label: 'Tiempo jugado',
      options: [
        ['never', 'Nunca jugado'],
        ['some', 'Menos de 10 h'],
        ['lots', '10 h o más']
      ],
      values: (game) => {
        const hours = hoursPlayed(game);
        if (hours == null) return lastPlayed(game) ? [] : ['never'];
        if (hours === 0 && !game.lastLaunchedAt) return ['never'];
        return [hours < 10 ? 'some' : 'lots'];
      }
    },
    rating: {
      label: 'Valoración',
      options: [
        ['90', '90 o más'],
        ['80', '80 o más'],
        ['70', '70 o más']
      ],
      // Umbrales acumulativos: un juego con 92 cumple los tres.
      values: (game) => {
        const value = rating(game);
        return value == null ? [] : ['90', '80', '70'].filter((threshold) => value >= Number(threshold));
      }
    },
    decade: {
      label: 'Década',
      options: [
        ['1970', 'Años 70'],
        ['1980', 'Años 80'],
        ['1990', 'Años 90'],
        ['2000', 'Años 2000'],
        ['2010', 'Años 2010'],
        ['2020', 'Años 2020']
      ],
      values: (game) => {
        const year = game.meta && Number(game.meta.year);
        return Number.isFinite(year) && year > 1900 ? [String(Math.floor(year / 10) * 10)] : [];
      }
    },
    // Jugadores al mismo tiempo: un dato que MAME conoce de cada máquina de arcade.
    players: {
      label: 'Jugadores',
      options: [
        ['1', 'Un jugador'],
        ['2', 'Dos jugadores'],
        ['3', 'Tres o más']
      ],
      values: (game) => {
        const players = game.arcade && game.arcade.players;
        if (!players) return [];
        return players >= 3 ? ['3'] : players === 2 ? ['2'] : ['1'];
      }
    },
    tag: { label: 'Etiqueta', values: (game) => (Array.isArray(game.tags) ? game.tags : []) }
  };

  // Índice de búsqueda (F6): el texto normalizado de cada juego se arma una vez y se reutiliza en cada tecla.
  // Si cambian el nombre o las etiquetas (editar el juego), se vuelve a armar.
  const haystacks = new WeakMap();
  function haystackOf(game) {
    const cached = haystacks.get(game);
    if (cached && cached.name === game.name && cached.tags === game.tags) return cached.text;
    const text = normalize(
      [
        game.name,
        game.originalName,
        game.platform,
        ...(Array.isArray(game.tags) ? game.tags : []),
        ...((game.meta && game.meta.genres) || []),
        ...((game.meta && game.meta.developers) || []),
        game.arcade && game.arcade.description,
        game.arcade && game.arcade.series
      ].join(' ')
    );
    haystacks.set(game, { name: game.name, tags: game.tags, text });
    return text;
  }
  const queryWords = (query) => normalize(query).split(/\s+/).filter(Boolean);
  function matchesQuery(game, words) {
    if (!words.length) return true;
    const haystack = haystackOf(game);
    return words.every((word) => haystack.includes(word));
  }
  function matchesFacets(game, filters, skip) {
    for (const [id, facet] of Object.entries(facets)) {
      const selected = filters[id] || [];
      if (id === skip || !selected.length) continue;
      const values = facet.values(game);
      if (!selected.some((value) => values.includes(value))) return false;
    }
    return true;
  }
  function matchesScope(game, scope) {
    return scope !== 'installed' || game.installed !== false;
  }
  // Colección: los juegos de PC (todas las tiendas), los de Arcade o todos juntos.
  function matchesCollection(game, collection) {
    if (collection === 'pc') return !isArcade(game);
    if (collection === 'arcade') return isArcade(game);
    return true;
  }
  function filterGames(games, { query = '', scope = '', collection = 'all', filters = {}, favorite = false } = {}) {
    const words = queryWords(query);
    return games.filter(
      (game) =>
        matchesCollection(game, collection) &&
        matchesScope(game, scope) &&
        (!favorite || game.favorite) &&
        matchesQuery(game, words) &&
        matchesFacets(game, filters)
    );
  }
  // Conteo de cada opción con el resto de los filtros aplicados: muestra cuántos juegos quedarían al elegirla.
  function facetCounts(games, { query = '', scope = '', collection = 'all', filters = {}, favorite = false } = {}) {
    const words = queryWords(query);
    const base = games.filter(
      (game) =>
        matchesCollection(game, collection) &&
        matchesScope(game, scope) &&
        (!favorite || game.favorite) &&
        matchesQuery(game, words)
    );
    const result = {};
    for (const [id, facet] of Object.entries(facets)) {
      const counts = new Map();
      for (const game of base) {
        if (!matchesFacets(game, filters, id)) continue;
        for (const value of new Set(facet.values(game))) counts.set(value, (counts.get(value) || 0) + 1);
      }
      const options = facet.options
        ? facet.options.map(([value, label]) => ({ value, label, count: counts.get(value) || 0 }))
        : [...counts]
            .map(([value, count]) => ({ value, label: value, count }))
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'));
      result[id] = { label: facet.label, options };
    }
    return result;
  }

  const byName = (a, b) => a.name.localeCompare(b.name, 'es');
  // Los valores desconocidos van siempre al final, en cualquier dirección.
  const numeric = (value, direction) => (a, b) => {
    const first = value(a),
      second = value(b);
    if (first == null || second == null) return first == null ? (second == null ? byName(a, b) : 1) : -1;
    return (first - second) * direction || byName(a, b);
  };
  const statusRank = (game) => (playable(game) ? 0 : game.installed === false ? 2 : 1);
  const sorters = {
    name: (direction) => (a, b) => byName(a, b) * direction,
    platform: (direction) => (a, b) => a.platform.localeCompare(b.platform, 'es') * direction || byName(a, b),
    status: (direction) => (a, b) => (statusRank(a) - statusRank(b)) * direction || byName(a, b),
    recent: (direction) => numeric((game) => lastPlayed(game) || null, -direction),
    hours: (direction) => numeric(hoursPlayed, -direction),
    rating: (direction) => numeric(rating, -direction),
    length: (direction) => numeric(length, direction)
  };
  // direction 'asc' es el orden natural de cada criterio: A–Z, más reciente, más horas, mejor valorado, más corto.
  function sortGames(games, sort = 'name', direction = 'asc') {
    const sorter = (sorters[sort] || sorters.name)(direction === 'desc' ? -1 : 1);
    return [...games].sort(sorter);
  }

  // Un juego comprado en varias tiendas se muestra una vez. Queda adelante la copia que se puede jugar ya;
  // las demás viajan en `alsoOn`.
  function collapseDuplicates(games) {
    const groups = new Map();
    for (const game of games) {
      // Un arcade y un juego de PC con el mismo nombre son juegos distintos: no se agrupan.
      const key = isArcade(game) ? 'arcade:' + game.key : titleKey(game.name);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(game);
    }
    const primaries = new Map();
    for (const group of groups.values()) {
      const ordered = [...group].sort(
        (a, b) => statusRank(a) - statusRank(b) || (a.platform === 'Steam' ? -1 : b.platform === 'Steam' ? 1 : 0)
      );
      primaries.set(ordered[0], ordered.slice(1));
    }
    return games.filter((game) => primaries.has(game)).map((game) => ({ game, alsoOn: primaries.get(game) }));
  }

  // Juegos de una lista propia: los elegidos (en el orden en que se agregaron) o, en una lista automática,
  // los que cumplen su regla, ordenados y sin duplicados entre tiendas.
  function listGames(list, games) {
    if (!list) return [];
    if (list.kind === 'manual') {
      const byKey = new Map(games.map((game) => [game.key, game]));
      return (list.games || []).map((key) => byKey.get(key)).filter(Boolean);
    }
    const rule = list.rule || {};
    return collapseDuplicates(sortGames(filterGames(games, rule), rule.sort, rule.direction)).map(
      (entry) => entry.game
    );
  }

  root.GMLCatalog = {
    listGames,
    facets,
    titleKey,
    lastPlayed,
    hoursPlayed,
    rating,
    length,
    isArcade,
    matchesCollection,
    filterGames,
    facetCounts,
    sortGames,
    collapseDuplicates
  };
})(globalThis);
