const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), path = require('node:path')
const mod = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/insights.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module: mod, exports: mod.exports, Date, Map, Set, Number, String, Math, Array })
const { dailyTrend, busiestHours, hourOf, hourLabel, lapsedRegulars } = mod.exports
const today = new Date(2026, 10, 11)
const plain = (v) => JSON.parse(JSON.stringify(v)) // values from the vm context have their own prototypes

test('daily trend has one point per day, sums earnings and counts each booking once', () => {
  const rows = [
    { bookingId: 1, amount: 100, slotDate: '2026-11-11' },
    { bookingId: 1, amount: 50, slotDate: '2026-11-11' }, // meals added to the same booking
    { bookingId: 2, amount: '30.5', slotDate: '2026-11-10' },
    { bookingId: 3, amount: 999, slotDate: '2026-10-01' }, // outside the window
  ]
  const t = dailyTrend(rows, 7, today)
  assert.equal(t.length, 7)
  assert.equal(t[6].date, '2026-11-11'); assert.equal(t[0].date, '2026-11-05')
  assert.deepEqual([t[6].earnings, t[6].bookings], [150, 1])
  assert.deepEqual([t[5].earnings, t[5].bookings], [30.5, 1])
  assert.equal(t.reduce((s, p) => s + p.earnings, 0), 180.5)
})

test('hours parse 24h and 12h formats, including midnight and noon', () => {
  assert.equal(hourOf('23:00'), 23); assert.equal(hourOf('09:30:00'), 9)
  assert.equal(hourOf('11:00 PM'), 23); assert.equal(hourOf('12:15 AM'), 0); assert.equal(hourOf('12:00 PM'), 12)
  assert.equal(hourOf(''), null)
  assert.equal(hourLabel(0), '12 AM'); assert.equal(hourLabel(13), '1 PM')
})

test('busiest hours rank by distinct bookings', () => {
  const rows = [{ bookingId: 1, slotTime: '20:00' }, { bookingId: 2, slotTime: '20:30' }, { bookingId: 2, slotTime: '20:30' }, { bookingId: 3, slotTime: '18:00' }]
  assert.deepEqual(plain(busiestHours(rows)), [{ hour: 20, bookings: 2 }, { hour: 18, bookings: 1 }])
})

test('lapsed regulars are gold/platinum, away 14+ days, biggest spenders first', () => {
  const g = [
    { id: 1, name: 'A', membershipTier: 'Gold', lastVisit: '2026-10-01', totalAmount: 500 },
    { id: 2, name: 'B', membershipTier: 'Platinum', lastVisit: '2026-10-20', totalAmount: 900 },
    { id: 3, name: 'C', membershipTier: 'Silver', lastVisit: '2026-01-01', totalAmount: 5000 },
    { id: 4, name: 'D', membershipTier: 'Gold', lastVisit: '2026-11-05', totalAmount: 800 },
    { id: 5, name: 'E', membershipTier: 'Gold', lastVisit: null, totalAmount: 100 },
  ]
  const out = lapsedRegulars(g, 14, today)
  assert.deepEqual(plain(out.map((x) => x.name)), ['B', 'A'])
  assert.equal(out[1].daysAway, Math.floor((today - new Date('2026-10-01')) / 86400000)) // same date parsing as the app, any timezone
})
