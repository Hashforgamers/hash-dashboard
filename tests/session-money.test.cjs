// Live-session time and overtime maths: what staff charge at Settle depends on these.
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), path = require('node:path')

// 2026-11-11 23:30 IST, fixed so the "now"-based helpers are deterministic.
const NOW = Date.UTC(2026, 10, 11, 18, 0, 0)
class FixedDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])) } static now() { return NOW } }

function load() {
  const mod = { exports: {} }
  const stub = new Proxy(function () {}, { get: (_, k) => (k === '__esModule' ? true : stub), apply: () => stub })
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/components/live-sessions/session-helpers.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: () => stub, Date: FixedDate, Intl, Math, Number, String })
  return mod.exports
}
const h = load()

test('parses 12-hour times, including 12 AM and 12 PM', () => {
  assert.deepEqual({ ...h.parseTwelveHourTime('11:30 PM') }, { hours: 23, minutes: 30 })
  assert.deepEqual({ ...h.parseTwelveHourTime('12:00 AM') }, { hours: 0, minutes: 0 })
  assert.deepEqual({ ...h.parseTwelveHourTime('12:15 PM') }, { hours: 12, minutes: 15 })
})

test('booking dates are read in IST from dashed, compact or full formats', () => {
  assert.equal(h.getIstDateKey('2026-11-11'), '2026-11-11')
  assert.equal(h.getIstDateKey('20261111'), '2026-11-11')
  assert.equal(h.getIstDateKey('2026-11-10T20:00:00Z'), '2026-11-11') // 1:30 AM IST next day
  assert.equal(h.getIstDateKey(''), null)
})

test('duration handles sessions that cross midnight', () => {
  assert.equal(h.calculateDuration('10:00 PM', '11:30 PM'), 90 * 60)
  assert.equal(h.calculateDuration('11:00 PM', '1:00 AM'), 2 * 3600)
  assert.equal(h.calculateDuration('', '1:00 AM'), 0)
})

test('overtime and elapsed time are measured from IST slot times', () => {
  // now is 23:30 IST: a session that ended at 23:00 is 30 minutes over
  assert.equal(h.calculateExtraTime('11:00 PM', '2026-11-11'), 30 * 60)
  assert.equal(h.calculateExtraTime('11:45 PM', '2026-11-11'), 0) // not over yet
  assert.equal(h.calculateElapsedTime('10:30 PM', '2026-11-11'), 60 * 60)
})

test('overtime charge rounds partial hours up, never down', () => {
  assert.equal(h.calculateExtraAmount(30 * 60, 60), 30)   // half an hour at ₹60/h
  assert.equal(h.calculateExtraAmount(61, 60), 2)         // 1m01s at ₹60/h -> ₹1.02 -> ₹2
  assert.equal(h.calculateExtraAmount(0, 60), 0)
})
