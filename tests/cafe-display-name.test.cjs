const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function fixture(success=true){
 const source=fs.readFileSync(require('node:path').join(__dirname,'../app/components/my-account.tsx'),'utf8');
 const tree=ts.createSourceFile('account.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const snippets=[];
 function visit(node){if(ts.isVariableDeclaration(node)&&['handleSaveBusinessField','handleEditBusinessField'].includes(node.name.getText(tree)))snippets.push('const '+node.getText(tree)+';');ts.forEachChild(node,visit);}visit(tree);
 const calls=[];
 const scope={vendorId:1,DASHBOARD_URL:'https://test',businessFormData:{displayName:'  Neon   Arena '},
  businessDetails:{businessName:'Legal Pvt Ltd',displayName:''},data:{businessDetails:{businessName:'Legal Pvt Ltd',displayName:''},cafeProfile:{name:'Legal Pvt Ltd'}},
  console:{log(){},error(){}},alert(){},setSavingBusinessField(){},setEditingBusinessField(){},
  setBusinessFormData:value=>scope.businessFormData=value,setData:fn=>scope.data=fn(scope.data),
  api:{patch:async(url,body)=>{calls.push(JSON.parse(body));return success?{success:true,data:{displayName:'Neon Arena',publicName:'Neon Arena',businessName:'Legal Pvt Ltd'}}:{success:false,message:'Failed'};}},module:{exports:{}}};
 vm.runInNewContext(ts.transpileModule(snippets.join('\n')+'\nmodule.exports={handleSaveBusinessField,handleEditBusinessField};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,scope);
 return {scope,calls};
}
test('display-name save sends only branding and uses server-normalized public name',async()=>{
 const {scope,calls}=fixture();await scope.module.exports.handleSaveBusinessField('displayName');
 assert.deepEqual(calls,[{displayName:'  Neon   Arena '}]);
 assert.equal(scope.data.businessDetails.businessName,'Legal Pvt Ltd');
 assert.equal(scope.data.businessDetails.displayName,'Neon Arena');
 assert.equal(scope.data.cafeProfile.name,'Neon Arena');
});
test('failed display-name save preserves confirmed profile',async()=>{
 const {scope}=fixture(false);await scope.module.exports.handleSaveBusinessField('displayName');
 assert.equal(scope.data.cafeProfile.name,'Legal Pvt Ltd');
 assert.equal(scope.data.businessDetails.displayName,'');
});
test('editing an unset display name keeps the field blank for the business-name fallback',()=>{
 const {scope}=fixture();scope.module.exports.handleEditBusinessField('displayName');
 assert.equal(scope.businessFormData.displayName,'');
});
