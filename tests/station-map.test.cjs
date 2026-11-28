const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript')
const source=fs.readFileSync(path.join(__dirname,'../lib/station-map.ts'),'utf8')
const mod={exports:{}}
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:mod,exports:mod.exports,Date,Math,Number,Map,Set,Array,String,JSON,Infinity})
const m=mod.exports
const ist=(day,clock)=>Date.parse(`${day}T${clock}:00+05:30`)

test('IST parsing handles 12-hour clocks, Flask dates and windows past midnight',()=>{
  assert.equal(m.clockMinutes('03:10 PM'),15*60+10);assert.equal(m.clockMinutes('12:05 AM'),5);assert.equal(m.clockMinutes('15:10:00'),910)
  assert.equal(m.dateKey('Fri, 27 Nov 2026 00:00:00 GMT'),'2026-11-27');assert.equal(m.dateKey('2026-11-27'),'2026-11-27')
  assert.equal(m.istTime('2026-11-27','03:10 PM'),ist('2026-11-27','15:10'))
  const w=m.istWindow('2026-11-27','11:30 PM','12:30 AM');assert.equal(w.end-w.start,3600000)
  assert.equal(m.istClockOf(ist('2026-11-27','09:05')),'09:05')
})

test('tile codes are short, typed and unique even for duplicate names',()=>{
  const codes=m.stationCodes([{id:1,number:1,type:'pc'},{id:2,number:1,type:'pc'},{id:3,number:2,type:'playstation'},{id:4,type:'vr_headset'}])
  assert.equal(codes.get(1),'PC 01·1');assert.equal(codes.get(2),'PC 01·2');assert.equal(codes.get(3),'PS 02');assert.equal(codes.get(4),'VR #4')
})

const now=ist('2026-11-27','15:00')
const consoles=[
  {id:1,number:1,type:'pc',name:'HASHPC01',occupancyState:'occupied',currentBookingId:50,currentUsername:'Asha',currentStartTime:'02:00 PM',currentEndTime:'04:00 PM',currentDate:'2026-11-27',collectibleAmount:120,gameId:7},
  {id:2,number:2,type:'pc',name:'HASHPC02',occupancyState:'occupied',currentBookingId:51,currentStartTime:'02:00 PM',currentEndTime:'03:05 PM',currentDate:'2026-11-27',gameId:7},
  {id:3,number:3,type:'pc',occupancyState:'free',gameId:7},
  {id:4,number:4,type:'pc',occupancyState:'free',gameId:7,mapX:0,mapY:0},
  {id:5,number:1,type:'playstation',occupancyState:'maintenance',gameId:8},
]
const landing={
  currentSlots:[{bookId:50,consoleId:1,customer_phone:'+91 98765 43210',startTime:'02:00 PM',endTime:'04:00 PM',date:'Fri, 27 Nov 2026 00:00:00 GMT',slot_price:80}],
  upcomingBookings:[
    {bookingId:60,consoleId:3,username:'Ravi',time:'03:20 PM - 04:20 PM',date:'2026-11-27'},
    {bookingId:61,consoleId:4,username:'Meera',time:'06:00 PM - 07:00 PM',date:'2026-11-27'},
    {bookingId:62,consoleId:null,username:'Walk-in',time:'03:10 PM - 04:10 PM',date:'2026-11-27'},
  ],
}

test('station states: busy, ending soon, booked soon, free, offline',()=>{
  const list=m.buildStations(consoles,landing,now)
  const by=id=>list.find(s=>s.id===id)
  assert.equal(by(1).state,'busy');assert.equal(by(1).player,'Asha');assert.equal(m.phoneTail(by(1).phone),'3210')
  assert.equal(by(1).amountDue,120);assert.equal(by(1).slotPrice,80);assert.ok(Math.abs(by(1).progress-0.5)<0.01)
  assert.equal(by(1).liveSlot.bookId,50)
  assert.equal(by(2).state,'ending');assert.equal(by(2).remainingMs,5*60000)
  assert.equal(by(3).state,'booked');assert.equal(by(3).upcoming[0].name,'Ravi')
  assert.equal(by(4).state,'free');assert.equal(by(4).upcoming.length,1)
  assert.equal(by(5).state,'offline')
  assert.deepEqual({...m.stateCounts(list)},{free:1,busy:1,ending:1,booked:1,offline:1})
})

test('remaining time reads as a countdown and overtime',()=>{
  assert.equal(m.remainingLabel(5*60000+7000),'5:07 left');assert.equal(m.remainingLabel(-(61*60000)),'+1h 01m over');assert.equal(m.remainingLabel(null),'')
})

test('saved cells win; the rest auto-flow by console type without collisions',()=>{
  const list=m.buildStations(consoles,landing,now)
  const {cells,autoZones}=m.layoutStations(list,6)
  assert.deepEqual({...cells.get(4)},{x:0,y:0})
  const keys=new Set(Array.from(cells.values()).map(c=>`${c.x}:${c.y}`));assert.equal(keys.size,list.length)
  assert.deepEqual([...autoZones.map(z=>z.label)],['pc','playstation'].map(t=>list.find(s=>s.type===t).typeName))
  // Auto-placed blocks start below the saved part of the floor.
  for (const s of list.filter(s=>s.id!==4)) assert.ok(cells.get(s.id).y>=2)
})

test('station map is the Gaming Stations default and hosts the New session form',()=>{
  const page=fs.readFileSync(path.join(__dirname,'../app/components/manage-gaming-console.tsx'),'utf8')
  assert.match(page,/searchParams\.get\("view"\) === "list" \? "list" : "map"/)
  assert.match(page,/<SessionFormHost embedded formOnly \/>/)
  const form=fs.readFileSync(path.join(__dirname,'../app/components/newSlot.tsx'),'utf8')
  assert.match(form,/if \(formOnly\) return bookingForm/)
  assert.match(form,/<StationFloorPicker/)
  assert.match(form,/extendsBookingId: flexQuote\.extends_booking_id \|\| undefined/)
})

test('New session is a two-panel dialog: floor map left, details right, pinned amount and payment',()=>{
  const form=fs.readFileSync(path.join(__dirname,'../app/components/newSlot.tsx'),'utf8')
  assert.match(form,/slot-booking-wide/)
  assert.match(form,/lg:w-\[60%\][\s\S]*<StationFloorPicker[\s\S]*lg:w-\[40%\]/)
  assert.doesNotMatch(form,/switchFor|More…/)
  assert.match(form,/aria-label="Booking for"[\s\S]*Individual[\s\S]*Squad/)
  assert.match(form,/\{PAYMENT_TYPES\.map\(method/)
  assert.match(form,/if \(isOpen\) return\n    setName\(""\); setEmail\(""\); setPhone\(""\)/)
  assert.match(form,/slot-booking-modal-footer sticky bottom-0[\s\S]*\{paymentSelector\}[\s\S]*type="submit" form="slot-booking-form"/)
  const picker=fs.readFileSync(path.join(__dirname,'../app/components/station-map/station-picker.tsx'),'utf8')
  assert.match(picker,/layoutStations\(entries, MAP_COLUMNS\)/)
  assert.match(picker,/\/api\/vendor\/\$\{vendorId\}\/station-map/)
})

test('zone labels: saved first, auto suggestions only for unlabelled rows',()=>{
  const z=m.mergeZones([{label:'PC Zone',x:0,y:0,w:6}],[{label:'PC',x:0,y:0,w:6},{label:'PS5',x:0,y:4,w:6}])
  assert.equal(z.map(x=>x.label).join('|'),'PC Zone|PS5')
})

const storeSource=fs.readFileSync(path.join(__dirname,'../lib/station-map-storage.ts'),'utf8')
const storeMod={exports:{}}
vm.runInNewContext(ts.transpileModule(storeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:storeMod,exports:storeMod.exports,require:id=>{if(id==='./station-map')return m;throw Error(id)},Date,Math,Number,Map,Set,JSON,String,Array})
const st=storeMod.exports
const memory=()=>{const d=new Map();return{getItem:k=>d.has(k)?d.get(k):null,setItem:(k,v)=>d.set(k,String(v)),removeItem:k=>d.delete(k)}}

test('zoom is remembered per vendor and view, and out-of-range values are ignored',()=>{
  const m=memory(),k=st.zoomKey(7,'gaming-stations')
  assert.equal(st.readZoom(k,0.5,1.6,m),null)
  st.writeZoom(k,0.85,m);assert.equal(st.readZoom(k,0.5,1.6,m),0.85)
  assert.equal(st.readZoom(st.zoomKey(8,'gaming-stations'),0.5,1.6,m),null)
  m.setItem(k,'9');assert.equal(st.readZoom(k,0.5,1.6,m),null)
})

test('a layout the server could not take is kept per vendor and overrides cells until synced',()=>{
  const m=memory()
  st.writeLocalLayout(3,{positions:[{console_id:1,x:2,y:1},{console_id:2,x:null,y:null}],zones:[{label:'PC',x:0,y:0,w:4}]},m)
  const kept=st.readLocalLayout(3,m);assert.equal(kept.positions.length,2);assert.equal(st.readLocalLayout(4,m),null)
  const out=st.applyLocalPositions([{id:1,mapX:0,mapY:0},{id:2,mapX:5,mapY:5},{id:3,mapX:1,mapY:1}],kept)
  assert.equal(JSON.stringify(out.map(s=>[s.mapX,s.mapY])),'[[2,1],[null,null],[1,1]]')
  st.clearLocalLayout(3,m);assert.equal(st.readLocalLayout(3,m),null)
})

test('save failures explain themselves: backend not deployed vs permission vs migration',()=>{
  assert.match(st.saveFailureMessage(404).message,/Server not updated/);assert.equal(st.saveFailureMessage(404).keepLocally,true)
  assert.equal(st.saveFailureMessage(null).keepLocally,true)
  assert.equal(st.saveFailureMessage(403).keepLocally,false)
  assert.match(st.saveFailureMessage(503,'Floor map needs a database update').message,/database update/)
  assert.equal(st.saveFailureMessage(400,'Stations 1 and 2 share the same cell').message,'Stations 1 and 2 share the same cell')
})

// Live bug 2026-11-28: a cafe with no saved cells got its first zone label at row -1,
// and the server rejected the save with "zone y must be between 0 and 199".
const firstSavePayload={positions:[{console_id:101,x:0,y:0},{console_id:102,x:1,y:0},{console_id:121,x:0,y:3}],
  zones:[{label:'PC',x:0,y:-1,w:6},{label:'PS5',x:0,y:2,w:6}]}

test('auto layout of a cafe with no saved cells starts its first label at row 0',()=>{
  const list=[...Array.from({length:11},(_,i)=>({id:i+1,type:'pc',typeName:'PC',number:i+1,mapX:null,mapY:null})),{id:20,type:'ps5',typeName:'PS5',number:1,mapX:null,mapY:null}]
  const l=m.layoutStations(list,10)
  assert.equal(l.autoZones[0].y,0);assert.equal(l.cells.get(1).y,1)
  for(const z of l.autoZones)assert.ok(z.y>=0)
  l.cells.forEach(c=>assert.ok(c.x>=0&&c.y>=0))
  // Below saved cells: one empty row, then the label.
  const mixed=m.layoutStations([{id:1,type:'pc',typeName:'PC',number:1,mapX:0,mapY:0},{id:2,type:'ps5',typeName:'PS5',number:1,mapX:null,mapY:null}],10)
  assert.equal(mixed.autoZones[0].y,2);assert.equal(mixed.cells.get(2).y,3)
})

test('the payload that failed live is normalised: whole floor shifts down, nothing negative',()=>{
  const out=m.normaliseLayout(firstSavePayload.positions,firstSavePayload.zones)
  assert.equal(JSON.stringify(out.zones.map(z=>z.y)),'[0,3]')
  assert.equal(JSON.stringify(out.positions.map(p=>[p.x,p.y])),'[[0,1],[1,1],[0,4]]')
  const odd=m.normaliseLayout([{console_id:1,x:2.4,y:1},{console_id:2,x:250,y:0},{console_id:3,x:2,y:1}],[{label:'  ',x:0,y:0,w:2},{label:'Far',x:300,y:0.6,w:99}])
  assert.equal(JSON.stringify(odd.positions.map(p=>[p.x,p.y])),'[[2,1],[null,null],[null,null]]')
  assert.equal(JSON.stringify(odd.zones),'[{"label":"Far","x":199,"y":1,"w":24}]')
})

test('a device-only layout saved before the fix is cleaned when read back',()=>{
  const mem=memory();mem.setItem(st.layoutKey(5),JSON.stringify({...firstSavePayload,savedAt:1}))
  const kept=st.readLocalLayout(5,mem)
  assert.ok(kept.zones.every(z=>z.y>=0));assert.ok(kept.positions.every(p=>p.y===null||p.y>=0))
})
