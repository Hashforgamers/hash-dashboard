const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript')
const source=fs.readFileSync(path.join(__dirname,'../lib/flex-booking.ts'),'utf8')
const mod={exports:{}}
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:mod,exports:mod.exports,Intl,Date,Math,Number,Set,Array})
const f=mod.exports

test('durations follow min and step, include whole hours and an exact offer',()=>{
  const settings={...f.DEFAULT_FLEX_SETTINGS,min_minutes:30,step_minutes:15}
  const list=Array.from(f.flexDurations(settings,108,180))
  assert.deepEqual(list.slice(0,4),[30,45,60,75]);assert.ok(list.includes(108));assert.equal(list.at(-1),180)
  assert.ok(!Array.from(f.flexDurations(settings,10,180)).includes(10))
})

test('IST helpers never depend on the device time zone',()=>{
  assert.equal(f.istStartAt('2026-11-26','10:12'),'2026-11-26T10:12:00+05:30')
  assert.equal(f.istClock(new Date('2026-11-26T04:42:00Z')),'10:12')
  assert.equal(f.istDate(new Date('2026-11-26T20:00:00Z')),'2026-11-27')
  assert.equal(f.clockOf('2026-11-26T12:00:00+05:30'),'12:00')
})

test('station labels explain the longest fit',()=>{
  assert.equal(f.stationLabel({console_id:1,name:'PC 1',available:false,max_minutes_available:108,next_busy_at:'2026-11-26T12:00:00+05:30'}),'Busy from 12:00 · fits 1h 48m')
  assert.equal(f.stationLabel({console_id:2,name:'PC 2',available:true,max_minutes_available:720,next_busy_at:null}),'Free for the whole session')
  assert.equal(f.formatMinutes(120),'2h');assert.equal(f.formatMinutes(45),'45 min')
  assert.ok(f.isFlexBooking({timingMode:'flex'}));assert.ok(!f.isFlexBooking({}))
})

test('desk form only offers custom start when the cafe enabled it and sends additive fields',()=>{
  const form=fs.readFileSync(path.join(__dirname,'../app/components/newSlot.tsx'),'utf8')
  assert.match(form,/flexSettings\.flex_enabled && <option value="flex">/)
  assert.match(form,/timingMode: 'flex',\s*gameId: flexQuote\.game_id,\s*startAt: flexQuote\.window\.start_at,\s*durationMinutes: flexQuote\.window\.duration_minutes/)
  assert.match(form,/\.\.\.\(flexActive && flexQuote \? \{/)
})
