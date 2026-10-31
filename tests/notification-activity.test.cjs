const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const React=require('react');
function setup(items=[]){
 const states=[items,'',false,false];let index=0;const updates=[],calls=[];
 const modules={react:{...React,useState:()=>{const i=index++;return [states[i],value=>updates.push({i,value})]},useEffect:()=>{},useCallback:fn=>fn,useRef:value=>({current:value})},
 './notification-panel.module.css':{__esModule:true,default:{}},'@/components/ui/button':{Button:'button'},
 '@/app/context/AccessContext':{useAccess:()=>({selectedCafeId:7,activeStaff:{id:1,role:'owner'},can:()=>true})},'@/app/context/SocketContext':{useSocket:()=>({socket:null})},
 '@/lib/cafe-api':{rupees:x=>String(x),cafeCall:async(path)=>{calls.push(path);return {items:[],notices:[]}}}};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../app/components/session-extension-workspace.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:n=>modules[n]||require(n),Date,Intl});
 const nodes=[];function walk(n){if(Array.isArray(n))n.forEach(walk);else if(n&&typeof n==='object'){nodes.push(n);walk(n.props?.children)}}walk(module.exports.default());return {nodes,updates,calls};
}
test('notifications omit session activity when there is no action to take',()=>{
 assert.equal(setup().nodes.length,0);
});
test('a pending extension keeps its approval controls without an activity feed',()=>{
 const row={runtime_id:'one',revision:1,request_id:'req',state:'approval_pending',gamer_name:'Player',console_name:'PC',extension:{requested_price_paise:1500},billing:{amount_due_paise:0}};
 const {nodes}=setup([row]);
 assert.ok(nodes.some(n=>n.props?.children==='Approve'));
 assert.ok(nodes.some(n=>n.props?.children==='Reject'));
 assert.equal(nodes.some(n=>n.type==='ul'),false);
});
