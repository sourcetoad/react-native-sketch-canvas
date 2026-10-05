import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'nitrogen/generated/shared/json');
const target = join(root, 'lib/nitrogen/generated/shared/json');

const files = readdirSync(source).filter((file) => file.endsWith('.json'));
if (files.length === 0) {
  console.error(`No view configs found in ${source}`);
  process.exit(1);
}

mkdirSync(target, { recursive: true });
for (const file of files) {
  copyFileSync(join(source, file), join(target, file));
  console.log(`Copied ${file} to lib/nitrogen/generated/shared/json`);
}
