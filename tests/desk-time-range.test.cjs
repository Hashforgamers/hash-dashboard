const {test} = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")
const moduleUnderTest = {exports:{}}
const source = fs.readFileSync(path.join(__dirname,"../lib/desk-time-range.ts"),"utf8")
new Function("exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(moduleUnderTest.exports)
const {coveringDeskSlots} = moduleUnderTest.exports
const slot=(start_time,end_time)=>({start_time,end_time})
const slots=[slot("18:00","18:30"),slot("18:30","19:00"),slot("19:00","19:30")]
test("off-grid typed times preview the complete covering interval",()=>{
  assert.deepEqual(coveringDeskSlots(slots,"18:11","19:13"),slots)
  assert.deepEqual(coveringDeskSlots(slots,"18:30","19:00"),[slots[1]])
})
test("a gap or unavailable last slot cannot produce a partial offer",()=>{
  assert.deepEqual(coveringDeskSlots([slots[0],slots[2]],"18:11","19:13"),[])
  assert.deepEqual(coveringDeskSlots(slots,"18:11","19:45"),[])
})
test("crossing midnight uses only the selected date's real inventory",()=>{
  const night=slot("23:30","00:30")
  assert.deepEqual(coveringDeskSlots([night],"23:50","00:10"),[night])
  assert.deepEqual(coveringDeskSlots([night,slot("00:30","01:00")],"23:50","00:50"),[])
})
