import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const PIXEL_THRESHOLD = 0.1;
const MAX_DIFF_RATIO = 0.001;
const MIN_BLANK_DIFF_RATIO = 0.01;
const BLANK = 'blank';

const exampleRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

const { values } = parseArgs({
  options: {
    'platform': { type: 'string' },
    'captured': { type: 'string' },
    'goldens': { type: 'string' },
    'diff-out': { type: 'string' },
  },
});

if (!['ios', 'android'].includes(values.platform) || !values.captured) {
  console.error(
    'Usage: node scripts/parity-compare.mjs --platform <ios|android> --captured <dir> [--goldens parity/goldens/<platform>] [--diff-out <dir>]'
  );
  process.exit(2);
}

const capturedDir = path.resolve(values.captured);
const goldensDir = values.goldens
  ? path.resolve(values.goldens)
  : path.join(exampleRoot, 'parity', 'goldens', values.platform);
const diffDir = values['diff-out'] ? path.resolve(values['diff-out']) : null;

const listScenes = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.png') && !f.endsWith('.diff.png'))
        .map((f) => f.slice(0, -'.png'.length))
        .sort()
    : [];

const readPng = (dir, scene) => {
  const file = path.join(dir, `${scene}.png`);
  return fs.existsSync(file) ? PNG.sync.read(fs.readFileSync(file)) : null;
};

const countDiff = (a, b, output) =>
  pixelmatch(a.data, b.data, output, a.width, a.height, {
    threshold: PIXEL_THRESHOLD,
  });

const sizeOf = (img) => `${img.width}x${img.height}`;
const percent = (n, img) =>
  `${((100 * n) / (img.width * img.height)).toFixed(3)}%`;

const goldenScenes = listScenes(goldensDir);
const capturedScenes = listScenes(capturedDir);
const scenes = [...new Set([...goldenScenes, ...capturedScenes])].sort();
const blankGolden = readPng(goldensDir, BLANK);

const sanityOf = (scene, golden) => {
  if (!blankGolden) {
    return { ok: false, text: 'no blank golden' };
  }
  if (scene === BLANK) {
    return { ok: true, text: 'reference' };
  }
  if (
    golden.width !== blankGolden.width ||
    golden.height !== blankGolden.height
  ) {
    return { ok: true, text: 'size differs from blank' };
  }
  const n = countDiff(golden, blankGolden, null);
  const ok = n > MIN_BLANK_DIFF_RATIO * golden.width * golden.height;
  return {
    ok,
    text: `${percent(n, golden)} vs blank${ok ? '' : ' (empty golden)'}`,
  };
};

const rows = scenes.map((scene) => {
  const golden = readPng(goldensDir, scene);
  const captured = readPng(capturedDir, scene);
  if (!golden) {
    return { scene, result: 'FAIL', reason: 'no golden' };
  }
  const sanity = sanityOf(scene, golden);
  if (!captured) {
    return {
      scene,
      size: sizeOf(golden),
      sanity: sanity.text,
      result: 'FAIL',
      reason: 'missing capture',
    };
  }
  if (golden.width !== captured.width || golden.height !== captured.height) {
    return {
      scene,
      size: `${sizeOf(captured)} != ${sizeOf(golden)}`,
      sanity: sanity.text,
      result: 'FAIL',
      reason: 'size mismatch',
    };
  }
  const diff = diffDir
    ? new PNG({ width: golden.width, height: golden.height })
    : null;
  const n = countDiff(captured, golden, diff ? diff.data : null);
  const overThreshold = n > MAX_DIFF_RATIO * golden.width * golden.height;
  if (overThreshold && diff) {
    fs.mkdirSync(diffDir, { recursive: true });
    fs.writeFileSync(
      path.join(diffDir, `${scene}.diff.png`),
      PNG.sync.write(diff)
    );
  }
  const reasons = [];
  if (overThreshold) {
    reasons.push('pixels differ');
  }
  if (!sanity.ok) {
    reasons.push('empty golden');
  }
  return {
    scene,
    size: sizeOf(golden),
    diff: `${n} (${percent(n, golden)})`,
    sanity: sanity.text,
    result: reasons.length ? 'FAIL' : 'PASS',
    reason: reasons.join(', '),
  };
});

const columns = ['scene', 'size', 'diff', 'sanity', 'result', 'reason'];
const widths = columns.map((c) =>
  Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length))
);
const line = (cells) =>
  cells
    .map((cell, i) => String(cell ?? '').padEnd(widths[i]))
    .join(' | ')
    .trimEnd();
console.log(`platform: ${values.platform}`);
console.log(`goldens:  ${goldensDir}`);
console.log(`captured: ${capturedDir}`);
console.log(line(columns));
console.log(widths.map((w) => '-'.repeat(w)).join('-|-'));
rows.forEach((r) => console.log(line(columns.map((c) => r[c]))));

const failed = rows.filter((r) => r.result === 'FAIL').length;
if (!blankGolden) {
  console.log(`FAIL: no ${BLANK}.png golden in ${goldensDir}`);
}
if (rows.length === 0) {
  console.log('FAIL: no scenes found');
}
console.log(`${rows.length - failed}/${rows.length} passed`);
process.exit(failed || !blankGolden || rows.length === 0 ? 1 : 0);
