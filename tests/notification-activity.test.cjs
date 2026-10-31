const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const React=require('react');
function setup(expanded=false){
 const notices=Array.from({length:10},(_,i)=>({id:String(i),runtime_id:'session-'+i,kind:i%2?'time_low':'kiosk_offline',created_at:'2026-10-31T09:00:00Z'}));
 const states=[expanded,null,[],notices,'',false,false];let index=0;const updates=[],calls=[];
 const modules={react:{...React,useState:()=>{const i=index++;return [states[i],value=>updates.push({i,value})]},useEffect:()=>{},useCallback:fn=>fn,useRef:value=>({current:value})},
 './notification-panel.module.css':{__esModule:true,default:{}},'@/components/ui/button':{Button:'button'},
 '@/app/context/AccessContext':{useAccess:()=>({selectedCafeId:7,activeStaff:{id:1,role:'owner'},can:()=>true})},'@/app/context/SocketContext':{useSocket:()=>({socket:null})},
 '@/lib/cafe-api':{rupees:x=>String(x),cafeCall:async(path)=>{calls.push(path);return {items:[],notices:[]}}}};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../app/components/session-extension-workspace.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:n=>modules[n]||require(n),Date,Intl});
 const nodes=[];function walk(n){if(Array.isArray(n))n.forEach(walk);else if(n&&typeof n==='object'){nodes.push(n);walk(n.props?.children)}}walk(module.exports.default());return {nodes,updates,calls};
}
test('activity starts compact and can reveal all fetched alerts',()=>{
 const collapsed=setup();assert.equal(collapsed.nodes.filter(n=>n.type==='li').length,4);
 const toggle=collapsed.nodes.find(n=>n.props?.['aria-expanded']===false);assert.ok(toggle);toggle.props.onClick();assert.ok(collapsed.updates.some(u=>u.i===0&&u.value===true));
 assert.equal(setup(true).nodes.filter(n=>n.type==='li').length,10);
});
test('mark-read targets the selected alert and prevents duplicate requests',async()=>{
 const t=setup();const button=t.nodes.find(n=>n.props?.['aria-label']?.startsWith('Mark kiosk offline'));
 button.props.onClick();button.props.onClick();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(t.calls,['/7/extension-notices/0/read','/7/extensions']);
 assert.ok(t.updates.some(u=>u.i===1&&u.value==='0'));
 assert.ok(t.updates.some(u=>u.i===1&&u.value===null));
});
