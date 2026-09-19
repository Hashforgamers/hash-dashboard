const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
const output={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/tournament-setup.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:output,Date});
const {localDateTime,suggestedSchedule,quickTournamentStart,playerCapacity}=output;

test('Saturday shortcut finds Saturday rather than blindly adding three days',()=>{
 const start=quickTournamentStart('weekend',new Date(2026,8,21,10));
 assert.equal(start.getDay(),6);assert.equal(start.getDate(),26);assert.equal(start.getHours(),18);
 const lateSaturday=quickTournamentStart('weekend',new Date(2026,8,19,19));
 assert.equal(lateSaturday.getDate(),26);
});
test('today shortcut never starts in the past and leaves registration time',()=>{
 const now=new Date(2026,8,19,23,30);const start=quickTournamentStart('today',now);
 assert.ok(start>now);assert.ok(suggestedSchedule(start).deadline>now);
});
test('suggested schedule crosses midnight correctly',()=>{
 const start=new Date(2026,8,19,22);const schedule=suggestedSchedule(start);
 assert.equal(schedule.end.getDate(),20);assert.equal(schedule.end.getHours(),3);
 assert.equal(schedule.deadline.getHours(),21);
});
test('capacity uses whole positive teams and respects team size',()=>{
 assert.equal(playerCapacity('16',5),'80');assert.equal(playerCapacity('8',1),'8');
 for(const value of ['', '-2','2.5','oops']) assert.equal(playerCapacity(value,5),'');
});
test('datetime input retains local hours and handles cleared values',()=>{
 assert.equal(localDateTime(new Date(2026,8,19,18,30)),'2026-09-19T18:30');
 assert.equal(localDateTime(null),'');assert.equal(localDateTime(new Date('bad')),'');
});
