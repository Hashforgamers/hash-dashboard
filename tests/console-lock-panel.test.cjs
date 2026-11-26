const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react')
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/components/console-lock-panel.tsx'),'utf8')
function load(){
 const Badge=props=>({badge:props.variant,text:props.children})
 const deps={react:React,axios:{get:async()=>({data:{stations:[]}}),post:async()=>({})},sonner:{toast:{success(){},error(){}}},'lucide-react':new Proxy({},{get:()=>()=>null}),
  '@/src/config/env':{DASHBOARD_URL:''},'@/lib/cafe-api':{cafeCall:async()=>({})},'@/components/ui/button':{Button:()=>null},'@/components/ui/badge':{Badge},'@/components/ui/input':{Input:()=>null},'@/app/hooks/useTimeFormat':{useTimeFormat:()=>({format:'12h'})},'@/lib/time-format':{formatClock:(v)=>String(v)}}
 const mod={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:mod,exports:mod.exports,require:n=>deps[n]||require(n),document:{visibilityState:'visible'}})
 return mod.exports
}
const tv=(over={})=>({deviceKind:'CONSOLE_TV',device:{online:true},display:{security:'SESSION_ACTIVE'},...over})
test('PC stations and unpaired consoles show no TV badge',()=>{
 const {ConsoleLockBadge}=load()
 assert.equal(ConsoleLockBadge({station:undefined}),null)
 assert.equal(ConsoleLockBadge({station:{deviceKind:'PC_KIOSK',device:null}}),null)
})
test('Offline TV and an unenforced lock are both flagged',()=>{
 const {ConsoleLockBadge}=load(),text=el=>el.props.children
 assert.equal(text(ConsoleLockBadge({station:tv({device:{online:false}})})),'TV offline')
 assert.equal(text(ConsoleLockBadge({station:tv({display:{security:'NOT_SECURE'}})})),'Not securely locked')
 assert.equal(text(ConsoleLockBadge({station:tv()})),'TV online')
})
