const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path')
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8')

test('GST settings say prices include GST and no longer offer "add on top"',()=>{
 for(const file of ['app/components/console-pricing.tsx','app/components/my-account.tsx']){
  const src=read(file)
  assert.match(src,/Prices include GST\./,file)
  assert.doesNotMatch(src,/Tax Inclusive Pricing/,file)
  assert.doesNotMatch(src,/tax_inclusive: e\.target\.checked/,file)
  assert.match(src,/tax_inclusive:/,file)   // still sent back as saved: API payload unchanged
 }
})
test('Transactions label the total as GST-inclusive',()=>{
 const src=read('app/components/transaction-table.tsx')
 assert.match(src,/label: "Total \(incl\. GST\)"/)
})
