const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')
const mod = {exports:{}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../app/components/desk-rate-card.tsx'),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require:n=>n.startsWith('@/')?{}:require(n)})
const price = (profile,rates,minutes,players=1)=>mod.exports.deskSubtotal({game_id:1,profile,rates},minutes,players)
test('PC rates use the complete duration with inclusive three-hour middle tier',()=>{
 assert.equal(price('pc',[100,90,80],90),150)
 assert.equal(price('pc',[100,90,80],120),180)
 assert.equal(price('pc',[100,90,80],180),270)
 assert.equal(price('pc',[100,90,80],240),320)
})
test('PlayStation screen and player variants quote per-player hourly rates',()=>{
 assert.equal(price('ps55',[125,100,90,90],90,3),405)
 assert.equal(price('ps65',[150,125,100,100],60,2),250)
 assert.equal(price('gta55',[180],60,2),null)
})
test('Racing rejects unsupported durations and multiplayer',()=>{
 assert.equal(price('racing',[100,150],30),100)
 assert.equal(price('racing',[100,150],45),null)
 assert.equal(price('racing',[100,150],60,2),null)
})

test('Half-paisa quotes round consistently with server decimal money',()=>{
 assert.equal(price('ps55',[2.01,2.01,2.01,2.01],30),1.01)
 assert.equal(price('ps55',[2.51,2.51,2.51,2.51],30),1.26)
})
