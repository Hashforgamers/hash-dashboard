const {test}=require('node:test')
const assert=require('node:assert/strict');const _de=assert.deepEqual;assert.deepEqual=(a,b)=>_de(JSON.parse(JSON.stringify(a)),b)
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript')

function load(){
 const module={exports:{}}
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/desk-bill.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
 vm.runInNewContext(code,{module,exports:module.exports,Date,Math,Number,String,Array,Set,Object})
 return module.exports
}

test('A 1h45m PC session bills its rate-card price, the same every time',()=>{
 const {deskBill}=load()
 const input={device:'PC',minutes:105,gaming:175,rateName:'1 Hour PC'}
 const first=deskBill(input)
 assert.equal(first.total,175)
 assert.deepEqual(first.lines.map(l=>[l.label,l.amount]),[['PC · 1h 45m (rate card 1 Hour PC)',175]])
 // No clock-based discount: building the bill again (minutes later) gives the same figure.
 for(let i=0;i<20;i++) assert.equal(deskBill(input).total,175)
})

test('Discount shows only when staff typed one; add-ons and squad lines add up',()=>{
 const {deskBill}=load()
 const bill=deskBill({device:'PC',minutes:60,gaming:180,players:3,squadDiscount:18,squadPercent:10,staffDiscount:20,addOns:60,addOnCount:2})
 assert.deepEqual(bill.lines.map(l=>l.key),['gaming','squad','discount','addons'])
 assert.equal(bill.total,202)
 assert.equal(deskBill({device:'PS5',minutes:30,gaming:50,staffDiscount:0}).lines.length,1)
 assert.equal(deskBill({device:'PS5',minutes:30,gaming:50,staffDiscount:80}).total,0)
})

test('Session label is one window, not a list of held slots',()=>{
 const {sessionWindowLabel,durationLabel,chipDurationLabel}=load()
 assert.equal(sessionWindowLabel('01:33:00','03:18:00',105),'01:33 – 03:18 · 1h 45m')
 assert.equal(durationLabel(30),'30m'); assert.equal(durationLabel(120),'2h')
 assert.deepEqual([30,60,90,120,180].map(chipDurationLabel),['30m','1h','1h30','2h','3h'])
})

test('Start chips: custom-start cafes get Now/+15m/+30m then later slots; slot cafes get the running slot',()=>{
 const {startChoices}=load()
 const flex=startChoices('10:12',['10:00','10:30','11:00','11:30','12:00'],true)
 assert.deepEqual(flex.map(c=>c.label),['Now','+15m','+30m','11:00','11:30','12:00'])
 assert.equal(flex[1].clock,'10:27')
 const slots=startChoices('10:12',['10:00','10:30','11:00'],false)
 assert.deepEqual(slots.map(c=>[c.key,c.label]),[['now','Now (10:00)'],['slot:10:30','10:30'],['slot:11:00','11:00']])
 assert.equal(startChoices('09:00',['10:00'],false)[0].key,'slot:10:00')
 assert.equal(startChoices('23:50',[],true)[2].clock,'00:20')
})

test('Durations map to whole slots',()=>{
 const {slotsForDuration}=load()
 assert.deepEqual([30,60,90,105,180].map(m=>slotsForDuration(m,30)),[1,2,3,4,6])
 assert.equal(slotsForDuration(60,60),1)
})

test('Check out: end choices and unused value mirror the server rule',()=>{
 const {endChoices,unusedValue,istIso}=load()
 const now=new Date('2026-11-27T21:03:00Z') // 02:33 IST
 const booked=new Date('2026-11-27T21:48:00Z') // 03:18 IST, still ahead
 assert.deepEqual(endChoices(now,booked).map(c=>c.key),['now','-15','-30','-60'])
 const over=endChoices(now,new Date('2026-11-27T20:33:00Z'))
 assert.deepEqual(over.map(c=>c.label),['Now','At booked end','−15m','−30m','−1h'])
 assert.equal(istIso(now),'2026-11-28T02:33:00')
 assert.equal(unusedValue(175,105,45),75)
 assert.equal(unusedValue(175,105,10),17)
 assert.equal(unusedValue(175,105,4),0)
 assert.equal(unusedValue(175,105,4,0),7)
})
