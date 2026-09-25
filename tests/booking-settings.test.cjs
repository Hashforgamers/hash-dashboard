const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const ts=require('typescript');
const fs=require('node:fs');
const path=require('node:path');
function fixture() {
  let calls=0, token='staff-one';
  const modules={};
  const context={Headers,AbortController,setTimeout,clearTimeout,Date,Map,
    localStorage:{getItem:key=>key==='rbac_access_token_v1'?token:null},
    fetch:async()=>{calls++;return new Response(JSON.stringify({enabled:true}),{status:200})}};
  for(const file of ['http-client','booking-settings']) {
    const module={exports:{}};
    const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,`../lib/${file}.ts`),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    vm.runInNewContext(code,{...context,module,exports:module.exports,require:()=>modules['http-client']});
    modules[file]=module.exports;
  }
  return {get:modules['booking-settings'].getBookingSettings,get calls(){return calls},setToken:t=>{token=t}};
}
test('opening multiple booking forms reuses warmed settings',async()=>{
  const f=fixture();const url='https://test.invalid/api/vendor/7/squad-pricing-policy';
  await f.get(url);await f.get(url);await f.get(url);assert.equal(f.calls,1);
});
test('concurrent preload and form opening share a request',async()=>{
  const f=fixture();const url='https://test.invalid/api/vendor/7/controller-pricing';
  await Promise.all([f.get(url),f.get(url)]);assert.equal(f.calls,1);
});
test('pricing invalidation and identity changes fetch fresh data',async()=>{
  const f=fixture();const url='https://test.invalid/api/vendor/7/active-pricing';
  await f.get(url,0);await f.get(url,1);assert.equal(f.calls,2);
  f.setToken('staff-two');await f.get(url,1);assert.equal(f.calls,3);
  await f.get('https://test.invalid/api/vendor/8/active-pricing',1);assert.equal(f.calls,4);
});
