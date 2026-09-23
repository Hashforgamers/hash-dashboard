const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const mod = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../lib/event-batch.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
new Function('exports', 'module', compiled)(mod.exports, mod);
const { createEventBatch } = mod.exports;

function fixture() {
  const pending = new Map();
  const batches = [];
  let id = 0;
  const batch = createEventBatch(keys => batches.push([...keys]), 5000,
    cb => { pending.set(++id, cb); return id; }, timer => pending.delete(timer));
  const tick = () => { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(cb => cb()); };
  return { batch, pending, batches, tick };
}
test('event storm produces one reconciliation per dirty module', () => {
  const f = fixture();
  for (let i = 0; i < 1000; i++) f.batch.add('booking:7');
  f.batch.add('pricing:7');
  assert.equal(f.pending.size, 1);
  f.tick();
  assert.deepEqual(f.batches, [['booking:7', 'pricing:7']]);
  f.batch.add('booking:7');
  f.tick();
  assert.equal(f.batches.length, 2);
});
test('unmount or cafe change cancels pending reconciliation', () => {
  const f = fixture();
  f.batch.add('booking:7');
  f.batch.dispose();
  f.tick();
  assert.deepEqual(f.batches, []);
  assert.equal(f.pending.size, 0);
});
