const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
const moduleValue={exports:{}};
const code=ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../lib/operating-hours.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(code,{module:moduleValue,exports:moduleValue.exports});
const {normalizeOperatingHours,validateOperatingDay}=moduleValue.exports;
test('all seven weekdays are editable even when the API omits closed days',()=>{
 const days=normalizeOperatingHours([{day:'Monday',open:'09:00 AM',close:'11:00 PM',slotDurationMinutes:60,isEnabled:true}]);
 assert.equal(days.length,7);assert.equal(days[0].day,'mon');assert.equal(days[0].close,'23:00');assert.equal(days[1].isEnabled,false);
});
test('closed days, midnight and server time seconds round trip',()=>{
 const days=normalizeOperatingHours([{day:'mon',open:'00:00:00',close:'00:00:00',isEnabled:false}]);
 assert.equal(days[0].open,'00:00');assert.equal(days[0].is24Hours,true);assert.equal(days[0].isEnabled,false);
});
test('overnight and 24 hour windows are valid; short and malformed windows are rejected',()=>{
 const day=normalizeOperatingHours([{day:'mon',open:'22:00',close:'02:00',isEnabled:true}])[0];
 assert.equal(validateOperatingDay(day),null);
 assert.equal(validateOperatingDay({...day,close:'22:00'}),null);
 assert.match(validateOperatingDay({...day,close:'22:10'}),/complete slot/);
 assert.match(validateOperatingDay({...day,open:'25:00'}),/valid opening/);
 assert.match(validateOperatingDay({...day,slotDurationMinutes:15.5}),/whole number/);
});
function editorFixture(result) {
 const source=fs.readFileSync(require('node:path').join(__dirname,'../app/components/my-account.tsx'),'utf8');
 const tree=ts.createSourceFile('my-account.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const names=new Set(['handleSaveSlot','handleCancelEdit']);const snippets=[];
 function visit(node){if(ts.isVariableDeclaration(node)&&names.has(node.name.getText(tree))) snippets.push('const '+node.getText(tree)+';');ts.forEachChild(node,visit);}visit(tree);
 const original=normalizeOperatingHours([{day:'mon',open:'09:00',close:'18:00',isEnabled:true}]);
 const context={console:{log(){},error(){}}, normalizeOperatingHours,validateOperatingDay, savingSlot:null,editingSlot:'mon',
  hoursData:original.map(row=>({...row,close:row.day==='mon'?'20:00':row.close})),
  savedHoursRef:{current:original},message:'',data:{operatingHours:original},
  localStorage:{getItem:()=> 'owner-token'},jwtDecode:()=>({sub:{id:1}}),
  updateOperatingHours:async()=>result,window:{dispatchEvent:()=>{}},Event:class {},
  setSavingSlot:value=>context.savingSlot=value,setHoursMessage:value=>context.message=value,
  setHoursData:value=>context.hoursData=typeof value==='function'?value(context.hoursData):value,
  setData:fn=>context.data=fn(context.data),setEditingSlot:value=>context.editingSlot=value,
  module:{exports:{}}};
 const compiled=ts.transpileModule(snippets.join('\n')+'\nmodule.exports={handleSaveSlot,handleCancelEdit};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(compiled,context);return context;
}
test('save then edit/cancel restores the confirmed schedule, not stale dashboard data',async()=>{
 const c=editorFixture({success:true,data:{operatingHours:{day:'mon',open:'09:00',close:'20:00',slotDurationMinutes:30,isEnabled:true}}});
 await c.module.exports.handleSaveSlot('mon');
 assert.equal(c.data.operatingHours[0].close,'20:00');assert.equal(c.editingSlot,null);assert.equal(c.savingSlot,null);
 c.hoursData=c.hoursData.map(row=>({...row,close:'21:00'}));c.editingSlot='mon';c.module.exports.handleCancelEdit();
 assert.equal(c.hoursData[0].close,'20:00');
});
test('failed saves preserve the draft and show the backend error',async()=>{
 const c=editorFixture({success:false,error:'Existing booking conflict'});
 await c.module.exports.handleSaveSlot('mon');
 assert.equal(c.editingSlot,'mon');assert.equal(c.hoursData[0].close,'20:00');
 assert.equal(c.savedHoursRef.current[0].close,'18:00');assert.equal(c.message,'Existing booking conflict');assert.equal(c.savingSlot,null);
});
