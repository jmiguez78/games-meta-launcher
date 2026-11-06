// Aviso de versión nueva: consulta la última publicación del repositorio en GitHub (como mucho una vez por día)
// y la compara con la versión instalada. Sin repositorio configurado, sin conexión o con un repositorio privado,
// simplemente no avisa.
const DAY = 24 * 60 * 60 * 1000;

export function parseVersion(value) {
  const match = String(value ?? '').match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}
export function isNewer(candidate, current) {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] > b[index];
  return false;
}

export function createUpdates({ current, repository, fetchImpl = globalThis.fetch, now = () => Date.now() }) {
  let cached = null;
  let pending = null;
  const valid = typeof repository === 'string' && /^[\w.-]+\/[\w.-]+$/.test(repository);

  async function query() {
    const response = await fetchImpl(`https://api.github.com/repos/${repository}/releases/latest`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'Viciodromo' },
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 404) return { available: false, reason: 'Todavía no hay versiones publicadas.' };
    if (!response.ok) throw new Error(`GitHub respondió ${response.status}`);
    const release = await response.json();
    const latest = String(release.tag_name ?? '').replace(/^v/, '');
    return {
      available: true,
      latest,
      newer: isNewer(latest, current),
      name: release.name || `Versión ${latest}`,
      url:
        typeof release.html_url === 'string' && release.html_url.startsWith('https://github.com/')
          ? release.html_url
          : null,
      notes: String(release.body ?? '').slice(0, 1500),
      publishedAt: release.published_at ?? null
    };
  }

  return {
    async check({ force = false } = {}) {
      if (!valid) return { enabled: false, current };
      if (!force && cached && now() - cached.checkedAt < DAY) return cached;
      pending ??= query()
        .then((result) => ({ enabled: true, current, ...result, checkedAt: now() }))
        .catch((error) => ({
          enabled: true,
          current,
          available: false,
          error: error.message,
          // Sin conexión se vuelve a intentar en una hora, no al día siguiente.
          checkedAt: now() - DAY + 60 * 60 * 1000
        }))
        .finally(() => {
          pending = null;
        });
      cached = await pending;
      return cached;
    }
  };
}
