// Nombres para mostrar: se quitan marcas registradas y sufijos técnicos que agregan algunas tiendas
// ("- Windows", "PC Edition", "for Windows 10"). El nombre original se conserva aparte.
const SUFFIXES = [
  /\s*[-–—:]\s*(?:for\s+)?windows(?:\s+(?:10|11))?(?:\s+edition)?$/i,
  /\s*[-–—:]?\s*\bpc\s+edition$/i,
  /\s+for\s+windows(?:\s+(?:10|11))?$/i,
  /\s*\((?:pc|windows)\)$/i
];
export function displayName(name) {
  let clean = String(name ?? '')
    .replace(/[®™©]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of SUFFIXES) {
      const next = clean.replace(suffix, '').trim();
      if (next && next !== clean) {
        clean = next;
        changed = true;
      }
    }
  }
  return clean || String(name ?? '').trim();
}
