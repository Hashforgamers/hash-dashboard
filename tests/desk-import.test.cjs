const {test} = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const vm = require("node:vm")
const path = require("node:path")
const ts = require("typescript")
const Excel = require("exceljs")
const React = require("react")

for (const statusWorkbook of [false,true]) test(statusWorkbook ? "Real cafe headers map amounts separately from payment status and exclude unpaid rows" : "Excel upload maps headers, previews corrections, and imports only after ambiguous dates are edited", async () => {
  const workbook = new Excel.Workbook()
  const sheet = workbook.addWorksheet("October")
  if (!statusWorkbook) sheet.addRows([["Customer Name","Console","Booking Date","From","To","Amount Paid","Booking ID"],
    [" Anu ","PC","03/04/2025","6:30 PM","7:30 PM","₹1,200.00","A-7"]])
  if (statusWorkbook) {
    sheet.addRows([["Cafe history"],[],["Customer Name","Station ID","Booking Date","Session Start","Session End","Booking Total (₹)","Payment Status","Booking ID"],
      [" Anu ","PC","2025-04-03","6:30 PM","7:30 PM",1200,"Paid","A-7"],
      ["Unpaid player","PS5","2025-04-03","6:30 PM","7:30 PM",250,"Pending","A-8"]])
  }
  const bytes = await workbook.xlsx.writeBuffer()
  const requests = []
  const state = []
  let index = 0
  const module = {exports:{}}
  const deps = {
    react: {...React, useState(initial) {
      const i = index++
      if (!(i in state)) state[i] = initial
      return [state[i], next => {state[i] = typeof next === "function" ? next(state[i]) : next}]
    }},
    "@/src/config/env": {BOOKING_URL:""},
    "@/lib/credit-auth": {creditAuthHeaders:()=>({})},
    "@/components/ui/dialog": {Dialog:"dialog",DialogContent:"main",DialogTitle:"h1",DialogTrigger:"button"},
  }
  const source = fs.readFileSync(path.join(__dirname,"../app/components/history-import.tsx"),"utf8")
  const code = ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  vm.runInNewContext(code,{module,exports:module.exports, require:n=>deps[n]||require(n), crypto:require("node:crypto").webcrypto, Date, Event, window:{dispatchEvent(){}},
    fetch: async(url,options) => {requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({inserted:1,skipped:0})}}})
  const render = () => {
    index=0
    const nodes=[]
    function visit(n) {
      if (Array.isArray(n)) n.forEach(visit)
      else if (React.isValidElement(n)) {nodes.push(n);visit(n.props.children)}
    }
    visit(module.exports.default({vendor:1}))
    return nodes
  }
  const file={size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)}
  render().find(n=>n.props.type==="file").props.onChange({target:{files:[file]}})
  let preview
  for(let i=0;i<100&&!preview;i++) {
    await new Promise(r=>setTimeout(r,10))
    preview=render().find(n=>n.props.children==="Preview mapped rows")
  }
  assert.ok(preview && !preview.props.disabled)
  preview.props.onClick()
  let nodes=render()
  assert.ok(nodes.find(n=>n.props.children==="1 rows need review")?.props.disabled, JSON.stringify(nodes.filter(n=>n.type==="button" || n.props.role==="status").map(n=>n.props.children)))
  assert.equal(requests.length,0)
  if (statusWorkbook) {
    assert.equal(nodes.find(n=>n.props["aria-label"]==="paid row 1").props.value,"1200")
    nodes.find(n=>n.props.children==="Exclude flagged rows").props.onClick()
  } else nodes.find(n=>n.props["aria-label"]==="date row 1").props.onChange({target:{value:"2025-04-03"}})
  nodes=render()
  const submit=nodes.find(n=>n.props.children==="Import 1 bookings")
  assert.ok(!submit.props.disabled)
  await submit.props.onClick()
  assert.deepEqual(requests[0].rows,[{key:"ref:A-7",player:"Anu",device:"PC",date:"2025-04-03",start:"18:30",end:"19:30",paid:statusWorkbook ? "1200" : "1200.00",...(statusWorkbook ? {paymentStatus:"Paid",excluded:false} : {})}])
})
