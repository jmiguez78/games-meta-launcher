// Notas de una versión, tomadas de su sección en CHANGELOG.md. Uso: node tools/release-notes.mjs 0.29.0
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function releaseNotes(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start < 0) return null;
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join('\n')
    .trim();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const version = (process.argv[2] ?? '').replace(/^v/, '');
  const notes = releaseNotes(readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), version);
  if (!notes) {
    console.error(`CHANGELOG.md no tiene una sección «## ${version}».`);
    process.exit(1);
  }
  console.log(notes);
}
