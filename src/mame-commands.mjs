// Movimientos y comandos de los juegos de arcade, desde command.dat (AntoPISA / progetto-SNAPS).
// El archivo usa códigos de MAME para flechas y botones (_2 = abajo, ^E = puño débil); acá se convierten en
// texto legible y se agrupan por sección (personaje, controles, trucos).

// Bloques por set: «$info=sf2ce,sf2ceea,…» seguido de «$cmd … $end». Sólo se guardan los sets pedidos.
export function parseCommandDat(text, wanted) {
  const blocks = new Map();
  const pattern = /^\$info=([^\r\n]+)\r?\n\$cmd\r?\n([\s\S]*?)^\$end/gm;
  for (const [, names, body] of String(text).matchAll(pattern)) {
    for (const name of names.split(',').map((item) => item.trim()))
      if (name && (!wanted || wanted.has(name)) && !blocks.has(name)) blocks.set(name, body);
  }
  return blocks;
}

const arrows = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 5: '•', 6: '→', 7: '↖', 8: '↑', 9: '↗' };
const strengths = { E: 'LP', F: 'MP', G: 'HP', H: 'LK', I: 'MK', J: 'HK' };
const underscore = {
  '+': ' + ',
  P: 'P',
  K: 'K',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
  F: 'F',
  G: 'G',
  H: 'H',
  S: 'Start',
  x: '↻ (vuelta completa)',
  '^': 'en el aire, ',
  '`': '•',
  '.': '…',
  '-': '–',
  '?': '?',
  N: 'N',
  O: 'O'
};
const caret = { '*': 'repetido ', '!': '→ ', U: 'P × 3 ', s: 'Especial', S: 'Select', V: 'K × 3 ' };

// Convierte los códigos de command.dat en texto legible.
export function glyphs(text) {
  return String(text)
    .replace(/@([A-Z0-9])-button/g, '$1')
    .replace(/\^\*\s*((?:_[PKA-D])|(?:\^[E-J]))/g, '$1 (repetido)')
    .replace(/\^([1-9])/g, (_, digit) => `(mantener ${arrows[digit]}) `)
    .replace(/\^([E-J])/g, (_, key) => strengths[key])
    .replace(/\^([*!UsSV])/g, (_, key) => caret[key])
    .replace(/_([1-9])/g, (_, digit) => arrows[digit])
    .replace(/_([+PKABCDEFGHSx^`.\-?NO])/g, (_, key) => underscore[key])
    .replace(/[_^@]([()@`!"#$%&'*])/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const sectionNames = {
  CONTROLS: 'Controles',
  'HOW TO PLAY': 'Cómo se juega',
  'COMMON COMMANDS': 'Comandos comunes',
  CHEATS: 'Trucos',
  'SPECIAL MOVES': 'Movimientos especiales',
  'SECRET TECHNIQUES': 'Técnicas secretas',
  NOTES: 'Notas',
  'DIP SWITCHES': 'Configuración de la placa'
};
const kinds = { '(': 'agarre', ')': 'mando', '@': 'especial' };

// Un bloque en secciones: [{ title, rows: [{ kind, label, command }], notes: [texto] }].
export function formatCommands(body) {
  const sections = [];
  let current = null;
  for (const raw of String(body).split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    const header = line.match(/^- (.+) -$/);
    if (header) {
      const name = header[1].trim();
      current = { title: sectionNames[name.toUpperCase()] ?? titleCase(name), rows: [], notes: [] };
      if (current.title !== 'Cómo se juega') sections.push(current);
      continue;
    }
    if (!current || !line.trim() || /^[─━—=\-_]{6,}/.test(line.trim())) continue;
    const marker = line.match(/^_([()@])\s*/);
    const kind = marker ? kinds[marker[1]] : null;
    const rest = marker ? line.slice(marker[0].length) : line.trim();
    const columns = rest.split(/\s{2,}/);
    if (columns.length >= 2 || /^\S+\s+:\s+/.test(rest)) {
      const [label, command] = columns.length >= 2 ? [columns[0], columns.slice(1).join(' ')] : rest.split(/\s+:\s+/);
      current.rows.push({ kind, label: glyphs(label), command: translate(glyphs(command)) });
    } else {
      current.notes.push(translate(glyphs(rest)));
    }
  }
  return sections.filter((section) => section.rows.length || section.notes.length);
}
// Nombres de botones en español; los nombres propios de los movimientos quedan como en el original.
const words = [
  [/\bWeak Punch\b/g, 'Puño débil'],
  [/\bMedium Punch\b/g, 'Puño medio'],
  [/\bStrong Punch\b/g, 'Puño fuerte'],
  [/\bWeak Kick\b/g, 'Patada débil'],
  [/\bMedium Kick\b/g, 'Patada media'],
  [/\bStrong Kick\b/g, 'Patada fuerte'],
  [/\bPunch\b/g, 'Puño'],
  [/\bKick\b/g, 'Patada'],
  [/\bFire\b/g, 'Disparo'],
  [/\bJump\b/g, 'Salto'],
  [/\bAttack\b/g, 'Ataque'],
  [/\bBomb\b/g, 'Bomba'],
  [/\bShot\b/g, 'Disparo'],
  [/\bclose\b/g, 'de cerca'],
  [/\bhold\b/gi, 'mantener'],
  [/\s*\((?:P|K)\)$/, '']
];
function translate(text) {
  return words.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
}
function titleCase(text) {
  return text.toLowerCase().replace(/(^|[\s.'-])([a-záéíóúñ])/g, (_, before, letter) => before + letter.toUpperCase());
}
