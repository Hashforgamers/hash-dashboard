const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript')
function load(){
 const source=fs.readFileSync(path.join(__dirname,'../lib/time-format.ts'),'utf8')
 const mod={exports:{}}
 const store=new Map(),events=[]
 const window={dispatchEvent:e=>events.push(e)}
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))}
 class CustomEvent{constructor(type,init){this.type=type;this.detail=init?.detail}}
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:mod,exports:mod.exports,window,localStorage,CustomEvent,Intl,Date})
 return {...mod.exports,store,events}
}
test('clock strings from the APIs render in both formats',()=>{
 const {formatClock}=load()
 for (const [input,h12,h24] of [['14:05','2:05 PM','14:05'],['14:05:00','2:05 PM','14:05'],['00:30','12:30 AM','00:30'],['12:00','12:00 PM','12:00'],['2:05 PM','2:05 PM','14:05'],['12:15 AM','12:15 AM','00:15'],['9:00AM','9:00 AM','09:00'],['24:00','12:00 AM','00:00']]){
  assert.equal(formatClock(input,'12h'),h12,input)
  assert.equal(formatClock(input,'24h'),h24,input)
 }
})
test('timestamps are shown in IST',()=>{
 const {formatClock}=load()
 assert.equal(formatClock('2026-11-26T18:49:42Z','24h'),'00:19')
 assert.equal(formatClock(new Date('2026-11-26T08:00:00Z'),'12h'),'1:30 PM')
 assert.equal(formatClock(Date.parse('2026-11-26T08:00:00Z'),'24h'),'13:30')
})
test('unknown values pass through and empty values use the fallback',()=>{
 const {formatClock}=load()
 assert.equal(formatClock('Starting soon','24h'),'Starting soon')
 assert.equal(formatClock('', '24h', {fallback:'N/A'}),'N/A')
 assert.equal(formatClock(null, '12h', {fallback:'—'}),'—')
 assert.equal(formatClock('13:00 PM','24h'),'13:00 PM')
})
test('ranges convert both ends',()=>{
 const {formatClockRange}=load()
 assert.equal(formatClockRange('2:00 PM - 3:30 PM','24h'),'14:00 – 15:30')
 assert.equal(formatClockRange('22:00:00 to 01:00:00','12h'),'10:00 PM – 1:00 AM')
 assert.equal(formatClockRange('Time not set','24h'),'Time not set')
})
test('the preference is stored per café and defaults to 12-hour',()=>{
 const {readTimeFormat,writeTimeFormat,events}=load()
 assert.equal(readTimeFormat('7'),'12h')
 writeTimeFormat('7','24h')
 assert.equal(readTimeFormat('7'),'24h')
 assert.equal(readTimeFormat('8'),'12h')
 assert.equal(events.at(-1).detail.format,'24h')
})
