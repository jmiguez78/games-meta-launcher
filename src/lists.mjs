// Listas propias (F9): manuales (los juegos que elegís) o automáticas (una búsqueda guardada: colección, texto,
// filtros y orden de la Biblioteca). Viven en preferences.json, viajan con el respaldo y pueden aparecer como
// filas en Inicio. Los juegos de una lista automática se calculan en la interfaz con las mismas reglas de la
// Biblioteca (public/catalog.js).
import crypto from 'node:crypto';
import { badRequest, notFound } from './http.mjs';

export const MAX_LISTS = 50;
const MAX_GAMES = 2000;
const FACETS = ['store', 'genre', 'length', 'played', 'rating', 'decade', 'players', 'tag'];
const SORTS = ['name', 'platform', 'status', 'recent', 'hours', 'rating', 'length'];

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Regla de una lista automática: sólo campos y valores conocidos.
export function cleanRule(rule = {}) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) throw badRequest('Regla de lista no válida.');
  const filters = {};
  for (const id of FACETS) {
    const values = rule.filters?.[id];
    if (Array.isArray(values) && values.length)
      filters[id] = [
        ...new Set(values.filter((value) => typeof value === 'string').map((value) => value.slice(0, 80)))
      ].slice(0, 30);
  }
  return {
    query: text(rule.query, 100),
    collection: ['pc', 'arcade', 'all'].includes(rule.collection) ? rule.collection : 'all',
    scope: rule.scope === 'installed' ? 'installed' : '',
    favorite: rule.favorite === true,
    filters,
    sort: SORTS.includes(rule.sort) ? rule.sort : 'name',
    direction: rule.direction === 'desc' ? 'desc' : 'asc'
  };
}

// Listas tal como se guardan, descartando lo que no tenga forma válida (por ejemplo, de un respaldo editado).
export function cleanLists(lists) {
  if (!Array.isArray(lists)) return [];
  const seen = new Set();
  const result = [];
  for (const list of lists) {
    if (!list || typeof list !== 'object' || typeof list.id !== 'string' || seen.has(list.id)) continue;
    const name = text(list.name, 60);
    if (!name || !['manual', 'auto'].includes(list.kind)) continue;
    seen.add(list.id);
    let rule = null;
    try {
      rule = list.kind === 'auto' ? cleanRule(list.rule) : null;
    } catch {
      continue;
    }
    result.push({
      id: list.id.slice(0, 40),
      name,
      kind: list.kind,
      home: list.home !== false,
      ...(rule
        ? { rule }
        : { games: [...new Set((list.games ?? []).filter((key) => typeof key === 'string'))].slice(0, MAX_GAMES) }),
      createdAt: typeof list.createdAt === 'string' ? list.createdAt : new Date().toISOString()
    });
    if (result.length >= MAX_LISTS) break;
  }
  return result;
}

export function createLists(updatePreferences) {
  const change = (fn) => updatePreferences((prefs) => fn((prefs.lists = cleanLists(prefs.lists))));
  const find = (lists, id) => {
    const list = lists.find((item) => item.id === id);
    if (!list) throw notFound('Esa lista ya no existe.');
    return list;
  };
  const nameOf = (value) => {
    const name = text(value, 60);
    if (!name) throw badRequest('Poné un nombre para la lista.');
    return name;
  };
  return {
    async create(input) {
      const kind = input.kind === 'auto' ? 'auto' : 'manual';
      const list = {
        id: crypto.randomUUID().slice(0, 8),
        name: nameOf(input.name),
        kind,
        home: input.home !== false,
        ...(kind === 'auto'
          ? { rule: cleanRule(input.rule) }
          : {
              games: Array.isArray(input.games)
                ? input.games.filter((key) => typeof key === 'string').slice(0, MAX_GAMES)
                : []
            }),
        createdAt: new Date().toISOString()
      };
      await change((lists) => {
        if (lists.length >= MAX_LISTS) throw badRequest(`Podés tener hasta ${MAX_LISTS} listas.`);
        lists.push(list);
      });
      return list;
    },
    async update(id, input) {
      let updated;
      await change((lists) => {
        const list = find(lists, id);
        if ('name' in input) list.name = nameOf(input.name);
        if ('home' in input) list.home = input.home === true;
        if ('rule' in input && list.kind === 'auto') list.rule = cleanRule(input.rule);
        updated = { ...list };
      });
      return updated;
    },
    async remove(id) {
      await change((lists) => {
        find(lists, id);
        lists.splice(
          lists.findIndex((list) => list.id === id),
          1
        );
      });
    },
    // Agrega o quita un juego de una lista manual.
    async setMember(id, key, member) {
      if (typeof key !== 'string' || !key || key.length > 300) throw badRequest('Falta el juego.');
      let updated;
      await change((lists) => {
        const list = find(lists, id);
        if (list.kind !== 'manual') throw badRequest('Las listas automáticas se arman solas.');
        const games = list.games.filter((item) => item !== key);
        if (member) {
          if (games.length >= MAX_GAMES) throw badRequest('La lista llegó al máximo de juegos.');
          games.push(key);
        }
        list.games = games;
        updated = { ...list };
      });
      return updated;
    }
  };
}
