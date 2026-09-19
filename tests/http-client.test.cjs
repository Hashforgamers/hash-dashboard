const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function client(fetch) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('lib/http-client.ts', 'utf8'), { compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020} }).outputText;
  vm.runInNewContext(code, {exports, fetch, Headers, AbortController, Error, setTimeout, clearTimeout, console});
  return exports;
}
test('same request is shared but different authorizations and parse modes are isolated', async () => {
  let calls = 0;
  const api = client(async (_, opts) => { calls++; await new Promise(r=>setImmediate(r)); return new Response(JSON.stringify({auth:new Headers(opts.headers).get('Authorization')})); });
  const a = {headers:{Authorization:'Bearer cafe-a'},cacheTtlMs:5000,dedupeKey:'same'};
  const b = {...a, headers:{Authorization:'Bearer cafe-b'}};
  const [one, two] = await Promise.all([api.httpJson('/events',a), api.httpJson('/events',a)]);
  assert.equal(calls,1); assert.deepEqual(one,two);
  const other = await api.httpJson('/events',b); assert.equal(calls,2); assert.equal(other.auth,'Bearer cafe-b');
  await api.httpJson('/events',a); assert.equal(calls,2);
  const raw = await api.httpJson('/events',{...a,parseAs:'text'}); assert.equal(typeof raw,'string'); assert.equal(calls,3);
});
test('does not retry permanent failures and retries transient failures once', async () => {
  let calls=0;
  const denied=client(async()=>{calls++;return new Response('denied',{status:403});});
  await assert.rejects(denied.httpJson('/private',{retries:2,retryDelayMs:0})); assert.equal(calls,1);
  calls=0;
  const transient=client(async()=>{calls++;return calls===1 ? new Response('busy',{status:503}) : new Response('{}');});
  await transient.httpJson('/retry',{retries:1,retryDelayMs:0}); assert.equal(calls,2);
});
test('cancelled requests do not retry or cancel unrelated callers',async()=>{
  let calls=0;
  const api=client((_,opts)=>{calls++;return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>resolve(new Response('{}')),20);
    opts.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(opts.signal.reason);},{once:true});
  });});
  const controller=new AbortController();
  const first=api.httpJson('/cancel',{signal:controller.signal,retries:2});
  const second=api.httpJson('/cancel'); controller.abort();
  await assert.rejects(first); await second; assert.equal(calls,2);
  await assert.rejects(api.httpJson('/cancel',{signal:controller.signal})); assert.equal(calls,2);
});
test('writes are never automatically retried',async()=>{
  let calls=0; const api=client(async()=>{calls++;return new Response('busy',{status:503});});
  await assert.rejects(api.httpJson('/booking',{method:'POST',retries:3})); assert.equal(calls,1);
});
