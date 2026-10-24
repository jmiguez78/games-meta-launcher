// Enrutador declarativo de la API local: cada ruta es método + patrón + función. Los errores de quien llama
// (datos inválidos, algo que falta configurar, un recurso inexistente) responden 4xx con un mensaje en español;
// sólo los errores inesperados responden 500 y quedan en el registro.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const badRequest = (message) => new HttpError(400, message);
export const notFound = (message = 'No encontrado.') => new HttpError(404, message);
// La acción no se puede hacer todavía: falta conectar o configurar algo.
export const conflict = (message) => new HttpError(409, message);
export const tooLarge = (message) => new HttpError(413, message);
export const notImplemented = (message) => new HttpError(501, message);
// Un servicio externo (Steam, Twitch, IGDB) no respondió bien.
export const badGateway = (message) => new HttpError(502, message);

const JSON_TYPE = 'application/json; charset=utf-8';
const BASE_HEADERS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

export function send(res, status, body, type = JSON_TYPE, headers = {}) {
  res.writeHead(status, { 'content-type': type, ...BASE_HEADERS, ...headers });
  res.end(body);
}
export const sendJson = (res, status, value) =>
  send(res, status, typeof value === 'string' ? value : JSON.stringify(value));

// Respuesta con código distinto de 200 (202 Aceptado, 204 Sin contenido…).
const STATUS = Symbol('status');
export const withStatus = (status, value) => ({ [STATUS]: status, value });
// La función ya respondió por su cuenta (imágenes, archivos).
export const HANDLED = Symbol('respondido');

// Cuerpo JSON de la solicitud: un objeto; si no lo es, 400. Más grande que el límite, 413.
export async function readBody(req, limit = 8_000_000) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > limit) throw tooLarge('Archivo o solicitud demasiado grande.');
  }
  if (!text.trim()) return {};
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw badRequest('La solicitud no es JSON válido.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw badRequest('Se esperaba un objeto JSON.');
  return value;
}

// Validaciones breves para los cuerpos de las solicitudes.
export const check = {
  string(value, message, { max = 4000, allowEmpty = false } = {}) {
    if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > max) throw badRequest(message);
    return value.trim();
  },
  oneOf(value, options, message) {
    if (!options.includes(value)) throw badRequest(message);
    return value;
  },
  boolean(value, message) {
    if (typeof value !== 'boolean') throw badRequest(message);
    return value;
  }
};

// Patrón «/api/steam/games/:appid(\d+)/:kind(details|achievements)» → expresión regular con nombres.
function compile(pattern) {
  const names = [];
  const source = pattern
    .split('/')
    .map((segment) => {
      const match = segment.match(/^:(\w+)(?:\((.+)\))?$/);
      if (!match) return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      names.push(match[1]);
      return `(${match[2] ?? '[^/]+'})`;
    })
    .join('/');
  return { regex: new RegExp(`^${source}$`), names };
}

export function createRouter() {
  const routes = [];
  const router = {
    routes,
    add(method, pattern, handler) {
      routes.push({ method, pattern, handler, ...compile(pattern) });
      return router;
    },
    get: (pattern, handler) => router.add('GET', pattern, handler),
    post: (pattern, handler) => router.add('POST', pattern, handler),
    put: (pattern, handler) => router.add('PUT', pattern, handler),
    delete: (pattern, handler) => router.add('DELETE', pattern, handler),
    // true si alguna ruta respondió (o el camino existe con otro método: 405).
    async handle(req, res, url) {
      const matches = routes
        .map((route) => ({ route, found: route.regex.exec(url.pathname) }))
        .filter((item) => item.found);
      if (!matches.length) return false;
      const hit = matches.find((item) => item.route.method === req.method);
      if (!hit) {
        const allow = [...new Set(matches.map((item) => item.route.method))].join(', ');
        send(res, 405, JSON.stringify({ error: 'Método no permitido para esta ruta.' }), JSON_TYPE, { allow });
        return true;
      }
      const params = {};
      hit.route.names.forEach((name, index) => {
        try {
          params[name] = decodeURIComponent(hit.found[index + 1]);
        } catch {
          throw badRequest('Dirección mal formada.');
        }
      });
      const result = await hit.route.handler({
        req,
        res,
        url,
        params,
        query: url.searchParams,
        body: () => readBody(req)
      });
      if (result === HANDLED) return true;
      if (result && typeof result === 'object' && STATUS in result) {
        if (result[STATUS] === 204) send(res, 204, '');
        else sendJson(res, result[STATUS], result.value);
      } else sendJson(res, 200, result ?? { ok: true });
      return true;
    }
  };
  return router;
}
