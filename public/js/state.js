// Estado de la interfaz y preferencias de este equipo (vista, filtros abiertos).

export const state = {
  games: [],
  query: '',
  favorite: false,
  // Facetas de la Biblioteca (ver catalog.js): dentro de cada una las opciones se suman.
  filters: { store: [], genre: [], length: [], played: [], rating: [], decade: [], players: [], tag: [] },
  sort: 'name',
  direction: 'asc',
  view: remembered('gml-library-view', 'icons', ['icons', 'explorer']),
  detailTab: 'summary',
  // Alcance de la Biblioteca: 'installed' (por defecto) o '' para toda la cuenta.
  installation: 'installed',
  // Colección: 'pc' (por defecto), 'arcade' o 'all'. Sin juegos de Arcade el selector no se muestra.
  collection: remembered('gml-collection', 'pc', ['pc', 'arcade', 'all']),
  selectedKey: '',
  page: 'home'
};

// Preferencias de interfaz de este equipo (vista y filtros abiertos); sin almacenamiento se usan los valores por defecto.
export function remembered(key, fallback, allowed) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function remember(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento local no se recuerda */
  }
}
