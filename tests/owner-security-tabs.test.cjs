// Run: NODE_PATH=/tmp/hash-owner-ui/node_modules node --test tests/owner-security-tabs.test.cjs
// /tmp/hash-owner-ui contains jsdom@24; no production credentials are used.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{}

test('security tabs preserve drafts without navigation or saving', {skip:!JSDOM},async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://dashboard.example.invalid/account'});
 for(const key of ['window','document','navigator','HTMLElement','HTMLInputElement','Node','Event','MouseEvent','MutationObserver'])global[key]=dom.window[key];
 global.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);global.IS_REACT_ACT_ENVIRONMENT=true;
 const React=require('react');const {createRoot}=require('react-dom/client');const {act}=React;
 const Module=require('node:module');const ts=require('typescript');const originalLoad=Module._load;
 const sourceRoot=path.resolve(__dirname,'..');let requests=0;
 let access={activeStaff:{id:'owner-41',role:'owner'},selectedCafeId:41};
 Module._load=function(name,parent,isMain){
  if(name==='@/app/context/AccessContext')return {useAccess:()=>access};
  if(name==='@/lib/api')return {apiCall:async()=>{requests++;return {success:true};}};
  if(name.startsWith('@/')){
   const base=path.join(sourceRoot,name.slice(2));const file=['.tsx','.ts'].map(ext=>base+ext).find(fs.existsSync);
   if(file)return loadTs(file);
  }
  return originalLoad.call(this,name,parent,isMain);
 };
 const cache=new Map();
 function loadTs(file){
  if(cache.has(file))return cache.get(file).exports;
  const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText;
  const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,m);m._compile(compiled,file);return m.exports;
 }
 const OwnerSecurity=loadTs(path.join(sourceRoot,'app/components/owner-security-settings.tsx')).default;
 const root=createRoot(document.getElementById('root'));
 async function input(id,value){await act(async()=>{const element=document.getElementById(id);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));});}
 async function tab(value){await act(async()=>{const element=document.getElementById(`owner-${value}-tab`);element.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));element.click();});}
 try{
  await act(async()=>root.render(React.createElement(OwnerSecurity)));
  await input('security-current','OldPassword123');await input('security-value','UnsavedPassword123');await input('security-confirm','UnsavedPassword123');
  let submissions=0;document.addEventListener('submit',()=>submissions++);
  await tab('pin');
  assert.equal(document.getElementById('owner-pin-tab').getAttribute('aria-selected'),'true');
  assert.equal(document.getElementById('security-value').value,'');
  await input('security-value','0007');await input('security-confirm','0007');
  await tab('password');
  assert.equal(document.getElementById('security-value').value,'UnsavedPassword123');
  assert.equal(document.getElementById('security-confirm').value,'UnsavedPassword123');
  assert.equal(document.getElementById('security-current').value,'OldPassword123');
  await tab('pin');assert.equal(document.getElementById('security-value').value,'0007');
  assert.equal(document.getElementById('security-value').type,'password');
  assert.equal(requests,0);assert.equal(submissions,0);
  assert.equal(window.location.href,'https://dashboard.example.invalid/account');
  // Drafts belong to one cafe/owner context, and must not leak to another cafe.
  access={activeStaff:{id:'owner-42',role:'owner'},selectedCafeId:42};
  await act(async()=>root.render(React.createElement(OwnerSecurity)));
  assert.equal(document.getElementById('security-value').value,'');
  await tab('password');assert.equal(document.getElementById('security-value').value,'');
  const accountSource=fs.readFileSync(path.join(sourceRoot,'app/components/my-account.tsx'),'utf8');
  assert.equal(accountSource.includes('<form className="space-y-3">'),false,'settings must not wrap credential forms in another form');
 }finally{await act(async()=>root.unmount());Module._load=originalLoad;dom.window.close();}
});
