import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const requirePattern = /require\(\s*(['"])(\.{1,2}\/[^'"]+\.json)\1\s*\)/g;

const listJs = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return listJs(path);
    }
    return path.endsWith('.js') ? [path] : [];
  });

let checked = 0;
const missing = [];

for (const output of ['module', 'commonjs']) {
  const dir = join(root, 'lib', output);
  if (!existsSync(dir)) {
    missing.push(`${relative(root, dir)} (run npm run build first)`);
    continue;
  }
  for (const file of listJs(dir)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(requirePattern)) {
      checked++;
      const target = resolve(dirname(file), match[2]);
      if (!existsSync(target)) {
        missing.push(`${relative(root, file)}: ${match[2]}`);
      }
    }
  }
}

if (missing.length > 0) {
  console.error('Unresolved JSON requires in lib/:');
  missing.forEach((entry) => console.error(`  ${entry}`));
  process.exit(1);
}

if (checked === 0) {
  console.error('No relative JSON requires found in lib/');
  process.exit(1);
}

console.log(`All ${checked} relative JSON requires in lib/ resolve.`);
