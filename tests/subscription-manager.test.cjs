const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const React=require('react');
const plan={code:'pro',name:'Pro',pc_limit:10,price:200,features:{plan_features:['PC kiosk'],entitlements:['kiosk'],extra_pc_monthly:20}};
const quote={id:'quote-1',state:'preview',amount_paise:7000,terms:{package_name:'Pro',pc_limit:12},period_start:'2026-10-01',period_end:'2026-11-01',description:'Prorated',tax_note:'Total payable'};
function setup(preview=null,purchases=[]){
 const state=[[plan],null,purchases,preview,1,purchases.length?'invoices':'plans','monthly',{pro:2},false,'',false];let index=0;const calls=[];const updates=[];
 const apiCall=async(path,options)=>{calls.push({path,options});if(path.endsWith('/preview'))return quote;if(path.endsWith('/pay'))return {...quote,state:'ordered',key_id:'test_key',order_id:'order-1'};return {purchases:[]};};
 const fakeReact={...React,useState:()=>{const i=index++;return[state[i],value=>updates.push({i,value})]},useEffect:()=>{},useCallback:fn=>fn};
 const modules={'react':fakeReact,'@/lib/api':{apiCall,subscriptionApi:{getPackages:async()=>({packages:[plan]}),getSubscription:async()=>({status:'none'})}},'@/hooks/useSubscription':{useSubscription:()=>({vendorId:1,refreshStatus:async()=>{}})},'@/lib/razorpay':{createRazorpayOptions:(...args)=>args,openRazorpay:async options=>calls.push({gateway:options})},'@/src/config/env':{DASHBOARD_URL:'http://test'},'@/components/ui/button':{Button:'button'},sonner:{toast:{success:()=>{}}}};
 const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../app/components/subscription-manager.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{require:name=>modules[name]||require(name),module,exports:module.exports,Intl,Date,console});
 const tree=module.exports.SubscriptionManager();
 function nodes(el,all=[]){if(!el)return all;if(Array.isArray(el)){el.forEach(e=>nodes(e,all));return all;}if(typeof el==='object'){all.push(el);nodes(el.props?.children,all);}return all;}
 return {calls,updates,nodes:nodes(tree)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('plan review requests a server preview with quantity, without opening payment',async()=>{
 const t=setup();const review=t.nodes.find(n=>n.props?.children==='Review plan');review.props.onClick();await tick();
 assert.equal(t.calls[0].path,'/api/vendors/1/subscription/preview');assert.deepEqual(JSON.parse(t.calls[0].options.body),{package_code:'pro',billing_cycle:'monthly',extra_pcs:2});
 assert.equal(t.calls.some(c=>c.gateway),false);assert.equal(t.updates.some(u=>u.i===3&&u.value.id==='quote-1'),true);
});
test('accepted preview pays only its server quote and uses provider order amount',async()=>{
 const t=setup(quote);t.nodes.find(n=>n.props?.children==='Pay and activate').props.onClick();await tick();
 assert.equal(t.calls[0].path,'/api/vendors/1/subscription/purchases/quote-1/pay');assert.equal(t.calls[0].options.body,undefined);
 const gateway=t.calls.find(c=>c.gateway).gateway;assert.equal(gateway[0],'order-1');assert.equal(gateway[1],70);
});
test('paid purchases offer invoice access and never another payment button',()=>{
 const t=setup(null,[{...quote,state:'paid',invoice_number:'HFG-SUB-1'}]);
 assert.ok(t.nodes.some(n=>n.props?.children==='Invoice'));
 assert.equal(t.nodes.some(n=>n.props?.children==='Resume payment'),false);
});
test('pending purchase offers reconciliation and resumes the same quote',async()=>{
 const t=setup(null,[{...quote,state:'ordered'}]);
 assert.ok(t.nodes.some(n=>n.props?.children==='Check payment'));
 t.nodes.find(n=>n.props?.children==='Resume payment').props.onClick();await tick();
 assert.equal(t.calls[0].path,'/api/vendors/1/subscription/purchases/quote-1/pay');
});
