const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript')
const source=fs.readFileSync(path.join(__dirname,'../lib/schedule-map.ts'),'utf8')
const mod={exports:{}}
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:mod,exports:mod.exports,Date,Math,Number,Map,Set,Array,String,JSON,Infinity})
const m=mod.exports
const ist=(day,clock)=>Date.parse(`${day}T${clock}:00+05:30`)
const D='2026-11-28', T='2026-11-29'
const now=ist(D,'15:10')
const st=(id,extra={})=>({id,state:'free',end:null,bookingId:null,player:null,phone:'',start:null,gameId:7,code:`PC ${id}`,remainingMs:null,amountDue:0,...extra})
const row=(o)=>({bookingId:o.id,username:o.name||'Guest',customer_phone:'9876543210',date:o.date||T,time:o.time,consoleId:o.station??null,game_id:o.game??7,status:o.status||'Confirmed'})

test('landing rows become windows: 12-hour clocks, flex startAt/endAt, past midnight',()=>{
  const a=m.bookingWindowOf(row({id:1,time:'05:00 PM - 06:30 PM',station:3}))
  assert.equal(a.start,ist(T,'17:00'));assert.equal(a.end,ist(T,'18:30'));assert.equal(a.stationId,3)
  const b=m.bookingWindowOf({bookingId:2,startAt:'2026-11-29T17:07:00+05:30',endAt:'2026-11-29T18:07:00+05:30',consoleId:4})
  assert.equal(b.end-b.start,3600000)
  const c=m.bookingWindowOf(row({id:3,time:'11:30 PM - 12:30 AM'}));assert.equal(c.end-c.start,3600000)
  assert.equal(m.bookingWindowOf({time:'nonsense'}),null)
})

test('availability for a future window: booked only when an assigned booking overlaps',()=>{
  const bookings=[row({id:10,time:'05:00 PM - 06:00 PM',station:1}),row({id:11,time:'06:00 PM - 07:00 PM',station:2}),row({id:12,time:'05:30 PM - 06:30 PM',station:3,status:'cancelled'})].map(m.bookingWindowOf)
  const w={start:ist(T,'17:00'),end:ist(T,'18:00')}
  const r=m.windowAvailability([st(1),st(2),st(3),st(4,{state:'offline'})],bookings,w,now,7)
  assert.equal(r.stations.get(1).state,'booked');assert.equal(r.stations.get(1).booking.bookingId,10)
  assert.equal(r.stations.get(2).state,'free') // touches at 18:00, no overlap
  assert.equal(r.stations.get(3).state,'free') // cancelled
  assert.equal(r.stations.get(4).state,'offline')
  assert.equal(r.freeCount,2)
})

test('bookings without a station lower the free count instead of painting a tile',()=>{
  const bookings=[row({id:20,time:'05:00 PM - 06:00 PM'}),row({id:21,time:'05:00 PM - 06:00 PM',game:9})].map(m.bookingWindowOf)
  const r=m.windowAvailability([st(1),st(2),st(3)],bookings,{start:ist(T,'17:15'),end:ist(T,'18:15')},now,7)
  assert.equal(r.unassigned.length,1) // the other console type's booking does not count
  assert.equal(r.freeCount,2)
  r.stations.forEach(w=>assert.equal(w.state,'free'))
})

test('live sessions block the window until they end; ended windows are past',()=>{
  const live=st(1,{state:'busy',end:ist(D,'16:00'),start:ist(D,'15:00'),bookingId:99,player:'Kabir'})
  const r=m.windowAvailability([live],[],{start:ist(D,'15:30'),end:ist(D,'16:30')},now,7)
  assert.equal(r.stations.get(1).state,'busy');assert.equal(r.stations.get(1).freeFrom,ist(D,'16:00'))
  const later=m.windowAvailability([live],[],{start:ist(D,'16:00'),end:ist(D,'17:00')},now,7)
  assert.equal(later.stations.get(1).state,'free')
  const past=m.windowAvailability([live],[],{start:ist(D,'13:00'),end:ist(D,'14:00')},now,7)
  assert.equal(past.stations.get(1).state,'past')
})

test('station day timeline and click-in-gap start',()=>{
  const bookings=[row({id:30,time:'05:00 PM - 06:00 PM',station:1}),row({id:31,time:'08:00 PM - 09:30 PM',station:1}),row({id:32,time:'06:00 PM - 07:00 PM',station:2})].map(m.bookingWindowOf)
  const blocks=m.stationDayBlocks(bookings,1,T)
  assert.equal(blocks.length,2)
  assert.equal(m.gapStartAt(blocks,T,17*60+20,now),null) // inside a booking
  assert.equal(m.gapStartAt(blocks,T,18*60+40,now),18*60+30)
  assert.equal(m.gapStartAt(blocks,T,18*60+5,now),18*60) // snaps back to the previous booking's end
  assert.equal(m.gapStartAt([],D,14*60,now),15*60+15) // today: never before now
})

test('hourly density and window capacity from the slot inventory',()=>{
  const slots=[{console_id:7,start_time:'17:00:00',end_time:'17:30:00',available_slot:4,is_available:true},{console_id:7,start_time:'17:30:00',end_time:'18:00:00',available_slot:1,is_available:true},
    {console_id:7,start_time:'18:00:00',end_time:'18:30:00',available_slot:0,is_available:false},{console_id:9,start_time:'17:00:00',end_time:'17:30:00',available_slot:0}]
  const d=m.hourlyDensity(slots,7,4)
  assert.equal(d[17],0.25);assert.equal(d[18],0);assert.equal(d[16],null)
  assert.equal(m.slotCapacityFor(slots,7,T,{start:ist(T,'17:00'),end:ist(T,'18:00')}),1)
  assert.equal(m.slotCapacityFor(slots,7,T,{start:ist(T,'20:00'),end:ist(T,'21:00')}),null)
})

test('overview KPIs and needs-attention order',()=>{
  const stations=[st(1,{state:'busy',remainingMs:40*60000,amountDue:0}),st(2,{state:'ending',remainingMs:5*60000,amountDue:120}),st(3,{state:'busy',remainingMs:-3*60000}),
    st(4,{state:'busy',remainingMs:20*60000,amountDue:60}),st(5),st(6,{state:'offline'})]
  const upcoming=[row({id:1,date:D,time:'03:40 PM - 04:40 PM'}),row({id:2,date:D,time:'05:30 PM - 06:30 PM'}),row({id:3,date:D,time:'03:30 PM - 04:00 PM',status:'cancelled'})].map(m.bookingWindowOf)
  const k=m.overviewKpis(stations,upcoming,now)
  assert.equal(JSON.stringify(k),JSON.stringify({total:6,occupied:4,live:4,endingSoon:1,overtime:1,upcomingHour:1,unpaidLive:2}))
  assert.equal(m.needsAttention(stations).map(i=>`${i.kind}:${i.stationId}`).join(','),'overtime:3,ending:2,unpaid:4')
})

const clock=ms=>new Date(ms+330*60000).toISOString().slice(11,16)
const up=(o)=>m.bookingWindowOf({bookingId:o.id??40,username:'Tara',game_id:7,date:D,time:o.time||'03:30 PM - 04:30 PM',consoleId:3,lifecycleStatus:o.lifecycle||'upcoming',status:o.status||'Confirmed',settlement_status:o.settle,...(o.extra||{})})

test('upcoming actions: check-in opens 5 minutes early and closes at the end',()=>{
  const b=up({}) // 15:30–16:30, now 15:10
  let r=m.upcomingActions(b,now,clock)
  assert.equal(r.checkIn.enabled,false);assert.equal(r.checkIn.reason,'Check-in opens at 15:25')
  assert.equal(r.cancel.enabled,true);assert.equal(r.noShow.enabled,false);assert.equal(r.noShow.reason,'Available from 15:30')
  r=m.upcomingActions(b,ist(D,'15:26'),clock);assert.equal(r.checkIn.enabled,true);assert.equal(r.noShow.enabled,false)
  r=m.upcomingActions(b,ist(D,'15:45'),clock);assert.equal(r.checkIn.enabled,true);assert.equal(r.noShow.enabled,true)
  r=m.upcomingActions(b,ist(D,'16:31'),clock);assert.equal(r.checkIn.enabled,false);assert.equal(r.checkIn.reason,'The booking time has passed')
})

test('upcoming actions: started or closed bookings cannot be cancelled; paid ones get the refund choice',()=>{
  let r=m.upcomingActions(up({lifecycle:'current'}),now,clock)
  assert.equal(r.cancel.enabled,false);assert.match(r.cancel.reason,/end it instead/);assert.equal(r.noShow.enabled,false);assert.equal(r.checkIn.enabled,false)
  r=m.upcomingActions(up({status:'cancelled'}),now,clock);assert.equal(r.cancel.enabled,false)
  assert.equal(m.upcomingActions(up({settle:'completed'}),now,clock).paid,true)
  assert.equal(m.upcomingActions(up({settle:'pending'}),now,clock).paid,false)
  assert.equal(m.upcomingActions(up({extra:{game_id:null}}),ist(D,'15:40'),clock).checkIn.reason,'Booking details are incomplete')
})

test('in-session actions follow what the live row allows',()=>{
  const full=m.liveActions({end:ist(D,'16:00'),bookingId:9,liveSlot:{},amountDue:120},true)
  assert.equal(full.extend.enabled&&full.end.enabled&&full.meals.enabled,true);assert.equal(full.due,true)
  const bare=m.liveActions({end:null,bookingId:null,liveSlot:null,amountDue:0},false)
  assert.equal(bare.extend.reason,"Your role can't book sessions");assert.equal(bare.end.enabled,false);assert.equal(bare.meals.enabled,false)
})
