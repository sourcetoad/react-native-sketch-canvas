import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const output = execFileSync(
  'npm',
  ['pack', '--dry-run', '--json', '--ignore-scripts'],
  { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
);
const jsonStart = output.search(/^\[/m);
if (jsonStart === -1) {
  console.error('npm pack printed no JSON:\n' + output);
  process.exit(1);
}
const [pack] = JSON.parse(output.slice(jsonStart));
const files = pack.files.map((file) => file.path);

const required = [
  {
    label: 'nitrogen/generated/shared/json/SketchCanvasViewConfig.json',
    test: (path) =>
      path === 'nitrogen/generated/shared/json/SketchCanvasViewConfig.json',
  },
  {
    label: 'nitrogen/generated/ios/**',
    test: (path) => path.startsWith('nitrogen/generated/ios/'),
  },
  {
    label: 'nitrogen/generated/android/**',
    test: (path) => path.startsWith('nitrogen/generated/android/'),
  },
  {
    label: 'nitro.json',
    test: (path) => path === 'nitro.json',
  },
  {
    label: 'lib/nitrogen/generated/shared/json/SketchCanvasViewConfig.json',
    test: (path) =>
      path === 'lib/nitrogen/generated/shared/json/SketchCanvasViewConfig.json',
  },
];

const forbidden = [
  {
    label: 'src/__tests__/**',
    test: (path) => path.startsWith('src/__tests__/'),
  },
  {
    label: 'example/**',
    test: (path) => path.startsWith('example/'),
  },
];

const errors = [
  ...required
    .filter((rule) => !files.some(rule.test))
    .map((rule) => `missing: ${rule.label}`),
  ...forbidden.flatMap((rule) =>
    files.filter(rule.test).map((path) => `unexpected (${rule.label}): ${path}`)
  ),
];

if (errors.length > 0) {
  console.error(`npm pack check failed for ${pack.name}@${pack.version}:`);
  errors.forEach((error) => console.error(`  ${error}`));
  process.exit(1);
}

console.log(
  `npm pack check passed for ${pack.name}@${pack.version} (${files.length} files).`
);
