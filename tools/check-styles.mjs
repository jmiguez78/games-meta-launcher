// Revisa las hojas de public/styles/ (parte de npm run check):
// - cada hoja importada por styles.css existe y cada hoja de la carpeta está importada en su capa;
// - fuera de tokens.css no hay colores escritos a mano (hex, rgb() con números o hsl());
// - no hay !important (el orden lo dan las capas);
// - ningún selector se define dos veces en el mismo contexto de una hoja.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const entry = readFileSync(path.join(root, 'styles.css'), 'utf8');
const problems = [];

const order =
  entry
    .match(/@layer\s+([^;{]+);/)?.[1]
    .split(',')
    .map((name) => name.trim()) ?? [];
const imports = [...entry.matchAll(/@import\s+url\('\/styles\/([\w-]+\.css)'\)\s+layer\(([\w-]+)\)/g)].map(
  ([, file, layer]) => ({ file, layer })
);
const files = readdirSync(path.join(root, 'styles')).filter((name) => name.endsWith('.css'));
for (const file of files)
  if (!imports.some((item) => item.file === file)) problems.push(`styles/${file} no está importada en styles.css`);
for (const { file, layer } of imports) {
  if (!files.includes(file)) problems.push(`styles.css importa styles/${file}, que no existe`);
  if (!order.includes(layer)) problems.push(`la capa ${layer} de styles/${file} no está en @layer`);
}

// Reglas con su contexto (@media, @supports), sin comentarios ni contenido de @keyframes.
function rules(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
  const out = [];
  const stack = [];
  let buffer = '';
  let line = 1;
  let start = 1;
  for (const ch of clean) {
    if (ch === '\n') line++;
    if (ch === '{') {
      const head = buffer.trim();
      stack.push(head);
      if (!head.startsWith('@') && !stack.slice(0, -1).some((item) => item.startsWith('@keyframes'))) {
        out.push({ selector: head.replace(/\s+/g, ' '), context: stack.slice(0, -1).join(' | '), line: start });
      }
      buffer = '';
      continue;
    }
    if (ch === '}') {
      stack.pop();
      buffer = '';
      continue;
    }
    if (ch === ';') {
      if (!stack.length || stack[stack.length - 1].startsWith('@')) buffer = '';
      else buffer += ch;
      continue;
    }
    if (!buffer.trim()) start = line;
    buffer += ch;
  }
  return out;
}

const COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(\s*\d/i;
for (const file of files) {
  const text = readFileSync(path.join(root, 'styles', file), 'utf8');
  const lines = text.split('\n');
  let inComment = false;
  lines.forEach((raw, index) => {
    let code = raw;
    if (inComment) {
      const end = code.indexOf('*/');
      if (end < 0) return;
      code = code.slice(end + 2);
      inComment = false;
    }
    code = code.replace(/\/\*.*?\*\//g, '');
    const open = code.indexOf('/*');
    if (open >= 0) {
      code = code.slice(0, open);
      inComment = true;
    }
    if (/!important/.test(code)) problems.push(`styles/${file}:${index + 1}: !important (usá la capa que corresponda)`);
    if (file !== 'tokens.css' && !/^\s*--/.test(code) && COLOR.test(code))
      problems.push(`styles/${file}:${index + 1}: color escrito a mano; usá un token de tokens.css`);
  });
  const seen = new Map();
  for (const rule of rules(text)) {
    const key = rule.context + ' :: ' + rule.selector;
    if (seen.has(key))
      problems.push(`styles/${file}:${rule.line}: «${rule.selector}» ya está definido en la línea ${seen.get(key)}`);
    else seen.set(key, rule.line);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(
  `${files.length} hojas de estilo en ${order.length} capas, sin colores sueltos, !important ni selectores repetidos.`
);
