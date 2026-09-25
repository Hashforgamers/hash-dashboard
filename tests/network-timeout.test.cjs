const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const path=require('node:path');
function fixture() {
  const timers=new Map();let id=0;let calls=0;let finish;
  const window={fetch:(_url,opts)=>{calls++;return new Promise((resolve,reject)=>{finish=resolve;opts.signal.addEventListener('abort',()=>reject(opts.signal.reason),{once:true})})}};
  const auth={shouldAttachAuth:()=>false,ensureFreshLoginToken:async()=>null,getPreferredAuthToken:()=>null,renewRequestAuthorization:async v=>v};
  const axios={defaults:{headers:{common:{}}},interceptors:{request:{use(){}},response:{use(){}}}};
  const module={exports:{}};
  const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/network-runtime.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  vm.runInNewContext(source,{exports:module.exports,module,require:name=>name==='axios'?axios:auth,window,Headers,Request,URL,AbortController,
    setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id},clearTimeout:id=>timers.delete(id),localStorage:{getItem:()=>null}});
  module.exports.installNetworkRuntime();
  return {window,timers,get calls(){return calls},finish(){finish(new Response('{}'))}};
}
test('explicit booking deadline is not capped by the 12-second global fallback',async()=>{
  const f=fixture();const pending=f.window.fetch('https://test.invalid/booking',{method:'POST',timeoutMs:45000});
  assert.deepEqual([...f.timers.values()].map(t=>t.delay),[45000]);
  f.finish();await pending;assert.equal(f.timers.size,0);assert.equal(f.calls,1);
});
test('raw fetch still has a 12-second deadline',async()=>{
  const f=fixture();const pending=f.window.fetch('https://test.invalid/booking',{method:'POST'});
  assert.equal([...f.timers.values()][0].delay,12000);
  f.finish();await pending;
});
test('cancellation stops booking once, without replaying a mutation',async()=>{
  const f=fixture();const controller=new AbortController();
  const pending=f.window.fetch('https://test.invalid/booking',{method:'POST',timeoutMs:45000,signal:controller.signal});
  controller.abort(new Error('cancelled'));await assert.rejects(pending,/cancelled/);
  assert.equal(f.calls,1);assert.equal(f.timers.size,0);
});
