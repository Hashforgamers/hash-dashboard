const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const React=require('react');
const request={bookingId:11,vendorId:7,batch_id:'batch-1',username:'Aarav',game:{game_name:'PC'},date:'2026-10-31',time:'05:00 PM - 06:00 PM',total_amount:120};
function setup({allowed=true,success=true}={}){
 const states=[[request,{...request,bookingId:12,batch_id:'batch-2'}],0,false,false,'','',null];let index=0;const updates=[],calls=[],events=[],effects=[],listeners=new Map();
 const modules={react:{...React,useState:()=>{const i=index++;return [states[i],value=>updates.push({i,value})]},useCallback:fn=>fn,useRef:value=>({current:value}),useEffect:fn=>effects.push(fn)},
 './pay-at-cafe-requests.module.css':{__esModule:true,default:{}},'@/app/context/AccessContext':{useAccess:()=>({activeStaff:{id:1},can:()=>allowed})},'@/app/context/SocketContext':{useSocket:()=>({socket:{on:(event,fn)=>listeners.set(event,fn),off:event=>listeners.delete(event)},isConnected:true})},'@/src/config/env':{BOOKING_URL:'https://test'},'@/lib/credit-auth':{creditAuthHeaders:()=>({Authorization:'Bearer test'})}};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../app/components/pay-at-cafe-requests.tsx'),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:n=>modules[n]||require(n),AbortController,Date,Intl,CustomEvent:class {constructor(type){this.type=type}},window:{dispatchEvent:event=>events.push(event.type),addEventListener:(event,fn)=>listeners.set(event,fn),removeEventListener:event=>listeners.delete(event)},setInterval:()=>1,clearInterval:()=>{},fetch:async(url,options)=>{calls.push({url,options});return {ok:success,json:async()=>({success,notifications:[],message:success?'':'Request already handled'})}}});
 const nodes=[];function walk(n){if(Array.isArray(n))n.forEach(walk);else if(n&&typeof n==='object'){nodes.push(n);walk(n.props?.children)}}walk(module.exports.default({vendorId:7}));
 return {nodes,updates,calls,events,effects,listeners,unique:module.exports.uniqueCafeRequests};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('batch grouping prevents duplicate requests and ignores another cafe',()=>{
 const t=setup();const result=t.unique([request,{...request,bookingId:12},{...request,bookingId:13,vendorId:8,batch_id:'else'},{...request,bookingId:0}],7);
 assert.equal(result.length,1);assert.equal(result[0].bookingId,11);
});
test('accept confirms once, refreshes authoritative queue, and updates dashboard',async()=>{
 const t=setup();const button=t.nodes.find(n=>n.type==='button'&&n.props.children?.includes?.('Accept'));
 button.props.onClick();button.props.onClick();await tick();
 assert.equal(t.calls.length,2);assert.equal(t.calls[0].url,'https://test/api/pay-at-cafe/accept');
 assert.deepEqual(JSON.parse(t.calls[0].options.body),{booking_id:11,vendor_id:7,action_source:'manual_dashboard'});
 assert.equal(t.calls[1].url,'https://test/api/pay-at-cafe/pending/7');
 assert.deepEqual(t.events,['pay-at-cafe-requests-updated','refresh-dashboard']);
});
test('failed decision preserves the request and exposes the server error',async()=>{
 const t=setup({success:false});t.nodes.find(n=>n.type==='button'&&n.props.children?.includes?.('Reject')).props.onClick();await tick();
 assert.ok(t.updates.some(u=>u.i===4&&u.value==='Request already handled'));
 assert.equal(t.updates.some(u=>u.i===0),false);assert.equal(t.events.length,0);
});
test('staff without booking permission cannot accept or reject requests',()=>{
 const t=setup({allowed:false});assert.equal(t.nodes.some(n=>n.type==='button'&&(n.props.children?.includes?.('Accept')||n.props.children?.includes?.('Reject'))),false);
});

test('customer booking events refresh the queue and listeners are cleaned up',async()=>{
 const t=setup();const cleanup=t.effects[0]();await tick();
 assert.ok(t.listeners.has('booking'));assert.ok(t.listeners.has('pay_at_cafe_accepted'));
 t.listeners.get('booking')();await tick();
 assert.equal(t.calls.length,2);
 assert.ok(t.calls.every(call=>call.url==='https://test/api/pay-at-cafe/pending/7'));
 cleanup();assert.equal(t.listeners.size,0);
});
