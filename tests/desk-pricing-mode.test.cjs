const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript'),React=require('react')

function editor(cards){
 const state=[],calls=[];let index=0
 const module={exports:{}}
 const deps={react:{...React,useEffect(){},useState(initial){const i=index++;if(!(i in state))state[i]=i===1?cards:i===3?false:initial;return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v}]}},'@/src/config/env':{BOOKING_URL:''},'@/lib/credit-auth':{creditAuthHeaders:()=>({})}}
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../app/components/desk-rate-card.tsx'),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText
 vm.runInNewContext(code,{module,exports:module.exports,require:n=>deps[n]||require(n),fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({success:true})}}})
 function render(){index=0;const nodes=[];function visit(n){if(Array.isArray(n))n.forEach(visit);else if(React.isValidElement(n)){nodes.push(n);visit(n.props.children)}}visit(module.exports.default({vendor:7,games:[{id:11,game_name:'PlayStation'}],baseRate:React.createElement('input',{'aria-label':'Base slot rate'})}));return nodes}
 return {render,calls}
}
test('Saved active variants are the visible rule; switching to slot pricing preserves cards',async()=>{
 const e=editor([{game_id:11,profile:'ps55',rates:[125,100,90,90],is_active:true}])
 let nodes=e.render();const select=nodes.find(n=>n.props['aria-label']==='PlayStation pricing rule')
 assert.equal(select.props.value,'variants')
 await select.props.onChange({target:{value:'slot'}})
 nodes=e.render()
 assert.ok(nodes.some(n=>n.props['aria-label']==='Base slot rate'))
 assert.ok(!nodes.some(n=>n.props['aria-label']==='1 player rate'))
 assert.deepEqual(e.calls,[{url:'/api/vendor/7/desk-rates/mode',body:{game_id:11,mode:'slot'}}])
})
test('A new device stays on slot pricing until its first variant is saved',async()=>{
 const e=editor([]);let nodes=e.render()
 const select=nodes.find(n=>n.props['aria-label']==='PlayStation pricing rule')
 assert.equal(select.props.value,'slot')
 await select.props.onChange({target:{value:'variants'}})
 assert.equal(e.calls.length,0)
 nodes=e.render()
 assert.ok(nodes.some(n=>n.props['aria-label']==='1 player rate'))
 await nodes.find(n=>n.type==='form').props.onSubmit({preventDefault(){}})
 assert.deepEqual(e.calls[0],{url:'/api/vendor/7/desk-rates',body:{game_id:11,profile:'ps55',rates:['125','100','90','90']}})
})
