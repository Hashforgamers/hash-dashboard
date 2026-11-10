const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react')
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/components/desk-console-picker.tsx'),'utf8')
async function mount(rows,quantity=1){
 const states=[],effects=[],changes=[],calls=[];let index=0
 const deps={react:{...React,useState(v){const i=index++;states[i]=v;return[v,next=>{states[i]=next}]},useEffect(fn){effects.push(fn)}},'@/src/config/env':{BOOKING_URL:''},'@/lib/credit-auth':{creditAuthHeaders:()=>({})}}
 const mod={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:mod,exports:mod.exports,AbortController,require:n=>deps[n]||require(n),fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>rows}}})
 mod.exports.DeskConsolePicker({vendor:1,game:2,profile:'custom_65',date:'2030-01-01',slotIds:[1,2],quantity,onChange:ids=>changes.push(ids)})
 effects.forEach(fn=>fn());await new Promise(r=>setImmediate(r));return{states,changes,calls}
}
test('Booking picker requests entire session and preselects compatible physical console',async()=>{
 const result=await mount([{id:12,name:'PS 65',screen_size_inches:65}]);assert.deepEqual(result.calls[0].body,{profile:'custom_65',date:'2030-01-01',slot_ids:[1,2]});assert.deepEqual(Array.from(result.changes.at(-1)),[12]);assert.equal(result.states[3],false)
})
test('PC squad cannot confirm a partial console allocation',async()=>{
 const result=await mount([{id:1,name:'PC 1'}],2);assert.equal(result.changes.at(-1),null);assert.match(result.states[2],/2 required/)
})
test('PC squad preselects distinct consoles for the full group',async()=>{
 const result=await mount([{id:1,name:'PC 1'},{id:2,name:'PC 2'},{id:3,name:'PC 3'}],2);assert.deepEqual(Array.from(result.changes.at(-1)),[1,2])
})
