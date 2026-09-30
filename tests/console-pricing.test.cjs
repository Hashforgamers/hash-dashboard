const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function load(filename){
 const file=path.resolve(__dirname,filename);const mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{module:mod,exports:mod.exports,require:(name)=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name)});
 return mod.exports;
}
const u=load('../app/components/console-pricing/utils.ts');
test('squad preview rounds the booking total once, not every player',()=>{
 assert.equal(u.discountToFinalTotalAmount(10,33.33,3),20);
 assert.equal(u.discountToFinalTotalAmount(50,10,4),180);
});
test('custom console groups and server capacity survive loading',()=>{
 const rules=u.normalizeSquadPricing({pricing:{racing_sim:{2:0,3:5,4:10,5:15},pc:{2:0,3:0}},max_players:{racing_sim:4,pc:10}});
 assert.equal(rules.racing_sim['4'],10);assert.equal(rules.racing_sim['5'],undefined);
 assert.equal(rules.pc['3'],0);
});
test('console price aliases preserve the configured values',()=>{
 assert.equal(u.readPricingValue({ps5:80},'playstation'),80);
 assert.equal(u.readPricingValue({vr:40},'vr_headset'),40);
});
