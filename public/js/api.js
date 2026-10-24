// Pedidos a la API local y utilidades de texto.

export async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la acción.');
  return data;
}

export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );
}

export function tagsOf(game) {
  return Array.isArray(game.tags) ? game.tags : [];
}

export const plural = (count, one, many) => count.toLocaleString('es-AR') + ' ' + (count === 1 ? one : many);

export function normalize(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
