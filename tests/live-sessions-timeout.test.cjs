// Run: NODE_PATH=/tmp/hash-owner-ui/node_modules node --test tests/owner-security-tabs.test.cjs
// /tmp/hash-owner-ui contains jsdom@24; no production credentials are used.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{}

test('live session timeout stays unknown, retries, and retains confirmed sessions',{skip:!JSDOM},async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://dashboard.example.invalid/dashboard'});
 for(const key of ['window','document','navigator','HTMLElement','HTMLInputElement','Node','Event','MouseEvent','MutationObserver','localStorage'])global[key]=dom.window[key];
 global.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);global.IS_REACT_ACT_ENVIRONMENT=true;
 const React=require('react');const {createRoot}=require('react-dom/client');const {act}=React;
 const Module=require('node:module');const ts=require('typescript');const originalLoad=Module._load;
 const sourceRoot=path.resolve(__dirname,'..');const requests=[];const callbacks=new Map();const states=[];
 const socket={on:(name,fn)=>callbacks.set(name,fn),off:(name)=>callbacks.delete(name)};
 Module._load=function(name,parent,isMain){
  if(name==='@/app/context/AccessContext')return {useAccess:()=>({activeStaff:{id:'owner-41',role:'owner'},selectedCafeId:41,can:()=>false})};
  if(name==='@/app/context/SocketContext')return {useSocket:()=>({socket,isConnected:true})};
  if(name==='@/lib/cafe-api')return {CafeApiError:class CafeApiError extends Error{},cafeCall:()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),rupees:()=> '₹0.00'};
  if(name.startsWith('@/')){const base=path.join(sourceRoot,name.slice(2));const file=['.tsx','.ts'].map(ext=>base+ext).find(fs.existsSync);if(file)return loadTs(file);}
  return originalLoad.call(this,name,parent,isMain);
 };
 const cache=new Map();
 function loadTs(file){
  if(cache.has(file))return cache.get(file).exports;
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText;
  const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,m);m._compile(compiled,file);return m.exports;
 }
 // Transpile the component's local TSX imports as well.
 const prior=Module._extensions['.tsx'];Module._extensions['.tsx']=(m,file)=>m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);
 const View=loadTs(path.join(sourceRoot,'app/components/qr-live-sessions.tsx')).default;
 const root=createRoot(document.getElementById('root'));
 try{
  await act(async()=>root.render(React.createElement(View,{onLoadState:state=>states.push(state)})));
  assert.equal(requests.length,1);assert.match(document.body.textContent,/Loading live sessions/);
  await act(async()=>{callbacks.get('connect')();callbacks.get('session.updated')({vendor_id:41});});
  assert.equal(requests.length,1,'overlapping socket refreshes must share one request');
  await act(async()=>requests[0].reject(new Error('signal timed out')));
  assert.equal(states.at(-1),'error');assert.match(document.body.textContent,/availability is unknown/);
  assert.doesNotMatch(document.body.textContent,/signal timed out|No active sessions found/);
  await act(async()=>document.querySelector('button').click());assert.equal(requests.length,2);
  await act(async()=>requests[1].resolve({items:[{id:'session-1',kind:'wallet',state:'active',gamer_name:'Test Guest',console_number:3,started_at:new Date().toISOString(),ends_at:new Date(Date.now()+600000).toISOString(),minutes:60,amount:6000,payment_due:0,continuation_request:null}],requests:[]}));
  assert.equal(states.at(-1),'ready');assert.match(document.body.textContent,/Test Guest/);
  await act(async()=>callbacks.get('connect')());assert.equal(requests.length,3);
  assert.match(document.body.textContent,/Test Guest/,'reconnect must not clear confirmed sessions');
  await act(async()=>requests[2].reject(new Error('signal timed out')));
  assert.match(document.body.textContent,/Test Guest/);assert.match(document.body.textContent,/Showing the last received sessions/);
  const parent=fs.readFileSync(path.join(sourceRoot,'app/components/current-slot.tsx'),'utf8');
  assert.ok(parent.includes("qrSessionCount > 0 || qrLoadState!=='ready' ? null"));
 }finally{await act(async()=>root.unmount());Module._load=originalLoad;if(prior)Module._extensions['.tsx']=prior;else delete Module._extensions['.tsx'];dom.window.close();}
});
