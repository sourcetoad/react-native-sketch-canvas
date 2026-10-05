import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    port: { type: 'string' },
    out: { type: 'string' },
    timeout: { type: 'string', default: '120' },
  },
});

if (!values.port || !values.out) {
  console.error(
    'Usage: node scripts/parity-capture.mjs --port <port> --out <dir> [--timeout 120]'
  );
  process.exit(2);
}

const origin = `http://localhost:${values.port}`;
const deadline = Date.now() + Number(values.timeout) * 1000;
const outDir = path.resolve(values.out);

const fail = (message) => {
  console.error(`parity-capture: ${message}`);
  process.exit(1);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pickTarget = (targets) => {
  const rn = targets.filter(
    (t) =>
      t.webSocketDebuggerUrl &&
      (t.reactNative ||
        /react native|hermes/i.test(`${t.title} ${t.description} ${t.vm}`))
  );
  return rn[rn.length - 1];
};

const connect = async () => {
  const targets = await (await fetch(`${origin}/json/list`)).json();
  const target = pickTarget(targets);
  if (!target) {
    fail(`no React Native Hermes target at ${origin}/json/list`);
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl, {
    headers: { Origin: origin },
  });
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  };
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = (e) => reject(new Error(e.message ?? 'WebSocket error'));
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    if (res.result?.exceptionDetails) {
      fail(`evaluate failed: ${JSON.stringify(res.result.exceptionDetails)}`);
    }
    return res.result?.result?.value;
  };
  await send('Runtime.enable');
  return { ws, evaluate };
};

const pngSize = (buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
});

const { ws, evaluate } = await connect();

while ((await evaluate('globalThis.__parityDone === true')) !== true) {
  if (Date.now() > deadline) {
    const progress = await evaluate(
      'JSON.stringify({ stored: Object.keys(globalThis.__parity ?? {}), errors: globalThis.__parityErrors ?? {} })'
    );
    fail(`timed out waiting for globalThis.__parityDone (${progress})`);
  }
  await sleep(500);
}

const results = JSON.parse(
  await evaluate('JSON.stringify(globalThis.__parity ?? {})')
);
const sceneIds = JSON.parse(
  await evaluate('JSON.stringify(globalThis.__paritySceneIds ?? [])')
);
const errors = JSON.parse(
  await evaluate('JSON.stringify(globalThis.__parityErrors ?? {})')
);
ws.close();

fs.mkdirSync(outDir, { recursive: true });
const scenes = {};
for (const [id, base64] of Object.entries(results)) {
  const buffer = Buffer.from(base64.replace(/\r?\n/g, ''), 'base64');
  fs.writeFileSync(path.join(outDir, `${id}.png`), buffer);
  scenes[id] = pngSize(buffer);
}
fs.writeFileSync(
  path.join(outDir, 'capture.json'),
  `${JSON.stringify({ scenes, errors }, null, 2)}\n`
);

Object.entries(scenes).forEach(([id, { width, height }]) =>
  console.log(`${id}: ${width}x${height}`)
);
Object.entries(errors).forEach(([id, message]) =>
  console.log(`${id}: ERROR ${message}`)
);

const missing = sceneIds.filter((id) => !(id in scenes));
if (sceneIds.length === 0) {
  fail('globalThis.__paritySceneIds is empty');
}
if (missing.length > 0) {
  fail(`missing scenes: ${missing.join(', ')}`);
}
console.log(`wrote ${Object.keys(scenes).length} scenes to ${outDir}`);
process.exit(0);
