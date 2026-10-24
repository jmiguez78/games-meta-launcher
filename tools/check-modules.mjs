// Comprueba la sintaxis de cada módulo de la interfaz (public/js) y que cada import exista en su módulo.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'js');
const files = fs.readdirSync(dir).filter((file) => file.endsWith('.js'));
const exportsOf = new Map(
  files.map((file) => {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    return [
      file,
      new Set(
        [...text.matchAll(/^export\s+(?:async\s+)?(?:function|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1])
      )
    ];
  })
);
let problems = 0;
for (const file of files) {
  execFileSync(process.execPath, ['--check', path.join(dir, file)], { stdio: 'inherit' });
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  for (const [, names, from] of text.matchAll(/^import\s+\{([^}]+)\}\s+from\s+'\.\/([^']+)';/gm)) {
    for (const name of names.split(',').map((item) => item.trim().split(/\s+as\s+/)[0])) {
      if (!exportsOf.get(from)?.has(name)) {
        console.error(`${file}: «${name}» no está exportado en ${from}`);
        problems += 1;
      }
    }
  }
}
if (problems) process.exit(1);
console.log(`${files.length} módulos de interfaz correctos.`);
