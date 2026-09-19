const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  const slots=[]; let cursor=0, effects=[], dirty=true, value, key='a', enabled=true, now=1000;
  const requests=[];
  const context={moduleCache:{},moduleVersions:{},setModuleCache(k,data){context.moduleCache[k]={data,updatedAt:now};dirty=true;}};
  const changed=(a,b)=>!a || a.length!==b.length || a.some((v,i)=>!Object.is(v,b[i]));
  const react={
    useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{const n=typeof v==='function'?v(slots[i]):v;if(!Object.is(n,slots[i])){slots[i]=n;dirty=true;}}];},
    useRef(initial){return slots[cursor++]??=( {current:initial} );},
    useEffect(fn,deps){const i=cursor++;if(changed(slots[i],deps)){slots[i]=deps;effects.push(fn);}},
    useCallback(fn,deps){const i=cursor++;if(!slots[i]||changed(slots[i].deps,deps))slots[i]={deps,value:fn};return slots[i].value;},
  };
  const exports={};
  const code=ts.transpileModule(fs.readFileSync('app/hooks/useModuleCache.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(code,{exports,Date:{now:()=>now},require:name=>name==='react'?react:{useDashboardData:()=>context}});
  const fetcher=()=>new Promise((resolve,reject)=>requests.push({resolve,reject}));
  async function settle(){for(let i=0;i<20;i++){if(dirty){dirty=false;cursor=0;value=exports.useModuleCache(key,fetcher,100,'version',enabled);const queue=effects;effects=[];queue.forEach(fn=>fn());}await new Promise(r=>setImmediate(r));if(!dirty)return;}assert.fail('unbounded render loop');}
  return {settle,requests,context,get value(){return value;},invalidate(){context.moduleVersions.version=(context.moduleVersions.version||0)+1;dirty=true;},switchKey(k){key=k;dirty=true;},advance(ms){now+=ms;},disable(){enabled=false;dirty=true;}};
}

test('coalesces refreshes and reads TTL at refresh time',async()=>{
 const h=harness();await h.settle();const identity=h.value.refresh;
 const a=h.value.refresh(true), b=h.value.refresh(true);await h.settle();assert.equal(h.requests.length,1);
 h.requests[0].resolve('first');await Promise.all([a,b]);await h.settle();assert.equal(h.value.refresh,identity);
 assert.equal(await h.value.refresh(),'first');assert.equal(h.requests.length,1);
 h.advance(101);const stale=h.value.refresh();await h.settle();assert.equal(h.requests.length,2);h.requests[1].resolve('fresh');assert.equal(await stale,'fresh');
});

test('invalidation during an active request makes one follow-up and discards stale data',async()=>{
 const h=harness();await h.settle();h.invalidate();await h.settle();h.invalidate();await h.settle();assert.equal(h.requests.length,1);
 h.requests[0].resolve('stale');await h.settle();assert.equal(h.requests.length,2);assert.equal(h.context.moduleCache.a,undefined);
 h.requests[1].resolve('current');await h.settle();assert.equal(h.value.data,'current');
});

test('changing cafe/key ignores the previous response',async()=>{
 const h=harness();await h.settle();h.switchKey('b');await h.settle();assert.equal(h.requests.length,2);
 h.requests[0].resolve('old cafe');await h.settle();assert.equal(h.context.moduleCache.a,undefined);
 h.requests[1].resolve('new cafe');await h.settle();assert.equal(h.value.data,'new cafe');
});
