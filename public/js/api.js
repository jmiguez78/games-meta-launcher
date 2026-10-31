// Pedidos a la API local y utilidades de texto.

// Sin conexión con el servidor, una respuesta vacía (204) o un error que no es JSON se informan en palabras.
export async function request(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('No se pudo conectar con el launcher. Revisá que la aplicación siga abierta y volvé a intentarlo.');
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) throw new Error(data?.error || 'No se pudo completar la acción (error ' + response.status + ').');
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
