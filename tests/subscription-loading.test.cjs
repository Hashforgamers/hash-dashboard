const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const source=fs.readFileSync('app/(layout)/dashboard-layout.tsx','utf8');
const tree=ts.createSourceFile('layout.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let expression;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='subscriptionPending')expression=node.initializer.getText(tree);ts.forEachChild(node,visit);}
visit(tree);
const pending=new Function('subscriptionStatus','subscriptionLoading','pathname','subscriptionExempt',`return ${expression}`);
test('initial entitlement check waits without displaying an upgrade prompt',()=>{
 assert.equal(pending(null,true,'/tournaments',['/subscription','/select-cafe']),true);
 assert.equal(pending({entitlements:['tournaments']},false,'/tournaments',[]),false);
 assert.equal(pending({entitlements:[]},false,'/tournaments',[]),false);
});
test('subscription recovery stays reachable and background checks retain resolved access',()=>{
 assert.equal(pending(null,true,'/subscription',['/subscription']),false);
 assert.equal(pending({entitlements:['tournaments']},true,'/tournaments',[]),false);
});
