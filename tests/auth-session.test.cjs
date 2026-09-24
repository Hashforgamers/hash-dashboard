const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../lib/auth-session.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const token = (seconds, extra = {}) => Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+seconds,...extra})).toString('base64');
function fixture(fetch) {
  const data = new Map(); const events = []; const listeners = new Map(); const intervals = new Map();
  const localStorage = {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const target = {addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
  const window = {...target,fetch,dispatchEvent:e=>events.push(e.type),setInterval:fn=>{intervals.set(1,fn);return 1},clearInterval:id=>intervals.delete(id)};
  const document = {...target,hidden:false,cookie:''};
  const module = {exports:{}};
  vm.runInNewContext(source,{exports:module.exports,module,require:name=>name==='jwt-decode'?{jwtDecode:t=>JSON.parse(Buffer.from(t,'base64').toString())}:{LOGIN_URL:'https://login.test',DASHBOARD_URL:'https://dashboard.test'},
    window,document,localStorage,navigator:{onLine:true},AbortSignal,CustomEvent:class {constructor(type){this.type=type}},Date,URL,Map});
  return {api:module.exports,data,events,listeners,intervals};
}
const response = (status, body) => ({status,ok:status>=200&&status<300,json:async()=>body});
test('concurrent renewal is deduplicated and stored once',async()=>{
  let calls=0; const next=token(3600);
  const f=fixture(async()=>{calls++;return response(200,{data:{token:next}})});
  f.data.set('jwtToken',token(60));
  const results=await Promise.all([f.api.ensureFreshLoginToken(),f.api.ensureFreshLoginToken()]);
  assert.equal(calls,1);assert.equal(results[0],next);assert.equal(f.data.get('jwtToken'),next);
});
test('network and server failures preserve credentials and back off',async()=>{
  for(const fetch of [async()=>{throw new Error('offline')},async()=>response(503,{})]) {
    let calls=0;const f=fixture(async()=>{calls++;return fetch()});const old=token(60);f.data.set('jwtToken',old);
    await f.api.ensureFreshLoginToken();await f.api.ensureFreshLoginToken();
    assert.equal(f.data.get('jwtToken'),old);assert.equal(calls,1);assert.deepEqual(f.events,[]);
  }
});
test('definitive rejection expires session',async()=>{
  const f=fixture(async()=>response(401,{}));f.data.set('jwtToken',token(60));
  await f.api.ensureFreshLoginToken();assert.equal(f.data.has('jwtToken'),false);assert.ok(f.events.includes('auth:expired'));
});
test('late renewal cannot restore a logged-out session',async()=>{
  let resolve;const f=fixture(()=>new Promise(r=>resolve=r));f.data.set('jwtToken',token(60));
  const pending=f.api.ensureFreshLoginToken();f.api.clearAuthSession();resolve(response(200,{token:token(3600)}));
  await pending;assert.equal(f.data.has('jwtToken'),false);
});
test('staff renewal and stale caller use same staff session, never owner credentials',async()=>{
  const claims={scope:'vendor_access',jti:'staff-session',vendor_id:7};const next=token(3600,claims);
  const f=fixture(async url=>{assert.ok(url.includes('/vendor/7/access/session/refresh'));return response(200,{token:next})});
  const old=token(60,claims);f.data.set('rbac_access_token_v1',old);f.data.set('jwtToken',token(3600));
  await f.api.ensureFreshAccessToken();assert.equal(await f.api.renewRequestAuthorization(`Bearer ${old}`),`Bearer ${next}`);
  const other=token(60,{...claims,jti:'other-session'});
  assert.equal(await f.api.renewRequestAuthorization(`Bearer ${other}`),`Bearer ${other}`);
});
test('background checks are singleton and wake listeners are removed',()=>{
  const f=fixture(async()=>response(503,{}));f.api.startBackgroundTokenRefresh();f.api.startBackgroundTokenRefresh();
  assert.equal(f.intervals.size,1);assert.ok(f.listeners.has('online'));assert.ok(f.listeners.has('visibilitychange'));
  f.api.stopBackgroundTokenRefresh();assert.equal(f.intervals.size,0);assert.equal(f.listeners.size,0);
});
test('rejected staff renewal cannot fall back to an owner login',async()=>{
  const f=fixture(async()=>response(403,{}));
  f.data.set('rbac_access_token_v1',token(60,{scope:'vendor_access',vendor_id:7,jti:'staff'}));
  f.data.set('jwtToken',token(3600));
  await f.api.ensureFreshAccessToken();
  assert.equal(f.data.has('rbac_access_token_v1'),false);assert.equal(f.data.has('jwtToken'),false);
  assert.ok(f.events.includes('auth:expired'));
});
test('long-lived components use the current vendor login without crossing cafes',async()=>{
  const f=fixture(async()=>{throw new Error('not needed')});
  const current=token(3600,{sub:{id:1,type:'vendor'}});f.data.set('jwtToken',current);
  assert.equal(await f.api.renewRequestAuthorization(`Bearer ${token(-1,{sub:{id:1,type:'vendor'}})}`),`Bearer ${current}`);
  const other=token(-1,{sub:{id:2,type:'vendor'}});
  assert.equal(await f.api.renewRequestAuthorization(`Bearer ${other}`),`Bearer ${other}`);
});
