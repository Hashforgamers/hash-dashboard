const {test} = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
// Execute the actual component handlers with controlled React state and timers.
const source = fs.readFileSync(require('node:path').join(__dirname, '../app/components/newSlot.tsx'), 'utf8');
const ast = ts.createSourceFile('newSlot.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names = new Set(['handleSlotSelect','handleQuickBooking','handleConsoleChange']);
const handlers = [];
function visit(node) {
  if(ts.isVariableDeclaration(node) && names.has(node.name.getText(ast))) handlers.push(`const ${node.getText(ast)};`);
  ts.forEachChild(node,visit);
}
visit(ast);
const compiled = ts.transpileModule(handlers.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
function fixture(initial=[]) {
  let selected=initial, open=false; let id=0;
  const pending=new Map();
  const context={showBookingForm:false,get selectedSlots(){return selected},deselectTimer:{current:null},
    setSelectedSlots:value=>{selected=typeof value==='function'?value(selected):value},
    setShowBookingForm:value=>{open=value},setSelectedConsole:()=>{},setSlotBookings:()=>{},
    setTimeout:fn=>{pending.set(++id,fn);return id},clearTimeout:id=>pending.delete(id)};
  vm.createContext(context);
  const actions=vm.runInContext(compiled+';({handleSlotSelect,handleQuickBooking,handleConsoleChange})',context);
  return {...actions,get selected(){return selected},get open(){return open},tick(){const jobs=[...pending.values()];pending.clear();jobs.forEach(fn=>fn())}};
}
const slot={slot_id:1,date:'2026-09-25',console_id:7};
test('double-click on selected slot never flashes selection off',()=>{
  const f=fixture([slot]);f.handleSlotSelect(slot);
  assert.equal(f.selected.length,1);
  f.handleQuickBooking(slot);f.tick();
  assert.equal(f.selected.length,1);assert.equal(f.open,true);
});
test('double-click opens without an intermediate selection paint',()=>{
  const f=fixture();f.handleSlotSelect(slot);assert.equal(f.selected.length,0);
  f.handleQuickBooking(slot);f.tick();assert.equal(f.selected.length,1);
});
test('single click still deselects, while another selected slot is preserved',()=>{
  const other={...slot,slot_id:2};const f=fixture([slot,other]);
  f.handleSlotSelect(slot);f.tick();assert.equal(f.selected.length,1);assert.equal(f.selected[0].slot_id,2);
});
test('console switch cancels deferred selection changes',()=>{
  const f=fixture([slot]);f.handleSlotSelect(slot);f.handleConsoleChange('ps5');f.tick();
  assert.equal(f.selected.length,0);assert.equal(f.open,false);
});

test('single click selects after gesture resolution',()=>{
  const f=fixture();f.handleSlotSelect(slot);assert.equal(f.selected.length,0);
  f.tick();assert.equal(f.selected.length,1);assert.equal(f.open,false);
});
