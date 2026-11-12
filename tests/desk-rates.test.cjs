const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path')
const mod={exports:{}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../app/components/desk-rate-card.tsx'),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:mod,exports:mod.exports,require:n=>n.startsWith('@/')||n==='./desk-console-mapping'?{}:require(n)})
const rule=changes=>({min_minutes:1,max_minutes:null,min_players:1,max_players:8,unit_minutes:60,per_player:true,amount:'100',...changes})
const price=(rules,minutes,players=1)=>mod.exports.deskSubtotal({definition:{rules}},minutes,players)
test('Cafe-defined duration tiers use exact inclusive boundaries',()=>{
 const rules=[rule({max_minutes:119}),rule({min_minutes:120,max_minutes:180,amount:'90'}),rule({min_minutes:181,amount:'80'})]
 assert.equal(price(rules,90),150);assert.equal(price(rules,120),180);assert.equal(price(rules,180),270);assert.equal(price(rules,240),320)
})
test('Custom player counts, time units and fixed session prices',()=>{
 assert.equal(price([rule({amount:'99.50',unit_minutes:45})],90,6),1194)
 assert.equal(price([rule({amount:'700',unit_minutes:0,per_player:false})],600,4),700)
 assert.equal(price([rule({amount:'125',unit_minutes:0})],30,5),625)
})
test('Gaps, overlaps and invalid drafts cannot produce a quote',()=>{
 assert.equal(price([rule({max_players:2})],60,3),null)
 assert.equal(price([rule(),rule()],60),null)
 assert.equal(price([rule({amount:''})],60),null)
 assert.equal(price([rule({unit_minutes:1.5})],60),null)
})
test('Fractional-hour rounding matches decimal server money',()=>{
 assert.equal(price([rule({amount:'2.01'})],30),1.01)
 assert.equal(price([rule({amount:'2.51'})],30),1.26)
 assert.equal(price([rule({amount:'0.03'})],10),0.01)
})
test('Booking labels use saved custom screen and game values',()=>{
 assert.equal(mod.exports.rateLabel({definition:{name:'Premium',screen_size_inches:77,game_variant:'Custom title'}}),'Premium · 77″ TV · Custom title')
})
const card=(profile,rules,extra={})=>({profile,is_active:true,archived:false,pricing_mode:'variants',definition:{rules},...extra})
test('Session duration selects matching cards and switches at tier boundaries',()=>{
 const cards=[card('short',[rule({max_minutes:119})]),card('medium',[rule({min_minutes:120,max_minutes:180,amount:'90'})]),card('long',[rule({min_minutes:181,amount:'80'})])]
 for(const [minutes,profile,total] of [[60,'short',100],[120,'medium',180],[180,'medium',270],[240,'long',320]]){
  const result=mod.exports.resolveSessionRate(cards,minutes,1,'short')
  assert.equal(result.card.profile,profile);assert.equal(mod.exports.deskSubtotal(result.card,minutes,1),total)
 }
})
test('Player changes resolve rates and overlapping variants default to the lowest subtotal',()=>{
 const solo=card('solo',[rule({max_players:1})]),squad=card('squad',[rule({min_players:2})])
 assert.equal(mod.exports.resolveSessionRate([solo,squad],60,3,'solo').card.profile,'squad')
 const variants=[card('55',[rule()]),card('65',[rule({amount:'150'})])]
 assert.equal(mod.exports.resolveSessionRate([...variants].reverse(),60,1).card.profile,'55')
 assert.equal(mod.exports.resolveSessionRate(variants,60,1,'65').card.profile,'65')
 assert.equal(mod.exports.resolveSessionRate([card('disabled',[rule()],{is_active:false}),card('archived',[rule()],{archived:true})],60,1).eligible.length,0)
 assert.equal(mod.exports.resolveSessionRate([solo],60,3).card,undefined)
})
