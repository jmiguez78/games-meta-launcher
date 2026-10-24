// Información de juegos de Arcade desde Wikipedia y Wikidata.
// Para cada juego: se busca el artículo en la Wikipedia en inglés (donde casi todos los arcades tienen uno), se
// confirma en Wikidata que sea un videojuego del año correcto y de ahí salen el identificador de IGDB (P5794)
// y el artículo en español, del que se toma la introducción.
const USER_AGENT = 'GamesMetaLauncher/0.24 (lanzador personal; https://github.com)';
const VIDEO_GAME = new Set(['Q7889', 'Q4393107', 'Q865493', 'Q1755420']);
const MAX_EXTRACT = 1800;

const normalize = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*\((?:\d{4}\s+)?(?:arcade\s+|video\s+)*(?:video\s+)?game\)\s*$/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// ¿El artículo corresponde al juego? El título debe coincidir, ignorando «(video game)» y signos.
export function titleMatches(article, title) {
  const a = normalize(article);
  const b = normalize(title);
  if (!a || !b) return false;
  // Se acepta un artículo más general («Street Fighter II» para la Champion Edition), nunca una secuela.
  return a === b || b.startsWith(a + ' ');
}

// Año de la primera fecha de publicación (P577) de una entidad de Wikidata.
export function releaseYears(entity) {
  return (entity?.claims?.P577 ?? [])
    .map((claim) => claim?.mainsnak?.datavalue?.value?.time)
    .map((time) => Number(String(time ?? '').match(/^[+-]?(\d{4})/)?.[1]))
    .filter(Number.isFinite);
}
const claimIds = (entity, property) =>
  (entity?.claims?.[property] ?? []).map((claim) => claim?.mainsnak?.datavalue?.value?.id).filter(Boolean);
const claimStrings = (entity, property) =>
  (entity?.claims?.[property] ?? [])
    .map((claim) => claim?.mainsnak?.datavalue?.value)
    .filter((value) => typeof value === 'string');

// Acepta la entidad si es un videojuego y, cuando hay año, si alguna fecha está a menos de tres años.
export function acceptEntity(entity, year) {
  if (!claimIds(entity, 'P31').some((id) => VIDEO_GAME.has(id))) return false;
  const years = releaseYears(entity);
  return !year || !years.length || years.some((value) => Math.abs(value - year) <= 2);
}

export function createWiki({ fetchImpl = globalThis.fetch } = {}) {
  async function get(url) {
    const response = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Wikipedia respondió ${response.status}`);
    return response.json();
  }
  const api = (host, params) =>
    `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;

  async function spanishExtract(title) {
    const data = await get(
      api('es.wikipedia.org', {
        action: 'query',
        prop: 'extracts',
        exintro: '1',
        explaintext: '1',
        redirects: '1',
        titles: title
      })
    );
    const page = data?.query?.pages?.[0];
    let text = String(page?.extract ?? '').trim();
    if (!text) return null;
    if (text.length > MAX_EXTRACT)
      text = text.slice(0, text.lastIndexOf('. ', MAX_EXTRACT) + 1) || text.slice(0, MAX_EXTRACT);
    return {
      title: page.title,
      url: `https://es.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      extract: text
    };
  }

  // { wikidata, igdbSlug, es: { title, url, extract } } o null si no hay una coincidencia confiable.
  async function lookup({ title, year, manufacturer }) {
    const search = await get(
      api('en.wikipedia.org', {
        action: 'query',
        list: 'search',
        srsearch: `${title} ${manufacturer ?? ''} arcade video game`.replace(/\s+/g, ' ').trim(),
        srlimit: '6'
      })
    );
    const candidates = (search?.query?.search ?? [])
      .map((item) => item.title)
      .filter((name) => titleMatches(name, title));
    if (!candidates.length) return null;
    const pages = await get(
      api('en.wikipedia.org', {
        action: 'query',
        prop: 'pageprops',
        ppprop: 'wikibase_item',
        redirects: '1',
        titles: candidates.join('|')
      })
    );
    const byTitle = new Map((pages?.query?.pages ?? []).map((page) => [page.title, page.pageprops?.wikibase_item]));
    const redirects = new Map((pages?.query?.redirects ?? []).map((item) => [item.from, item.to]));
    const ordered = candidates.map((name) => byTitle.get(redirects.get(name) ?? name)).filter(Boolean);
    if (!ordered.length) return null;
    const entities = await get(
      `https://www.wikidata.org/w/api.php?${new URLSearchParams({
        action: 'wbgetentities',
        format: 'json',
        ids: [...new Set(ordered)].join('|'),
        props: 'claims|sitelinks',
        sitefilter: 'eswiki'
      })}`
    );
    const id = ordered.find((item) => acceptEntity(entities?.entities?.[item], year));
    if (!id) return null;
    const entity = entities.entities[id];
    const slug = claimStrings(entity, 'P5794').find((value) => /^[a-z0-9-]+$/.test(value)) ?? null;
    const esTitle = entity.sitelinks?.eswiki?.title;
    return { wikidata: id, igdbSlug: slug, es: esTitle ? await spanishExtract(esTitle) : null };
  }
  return { lookup };
}
