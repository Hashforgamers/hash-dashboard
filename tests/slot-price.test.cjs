const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript')

function load(){
 const module={exports:{}}
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/slot-price.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
 vm.runInNewContext(code,{module,exports:module.exports})
 return module.exports
}
// Happy hour 14:00-17:00 at Rs 40 on a Rs 60 PS5, viewed at 15:00.
const active={ps5:{console_type:'PS5',price:40,is_offer:true,offer_name:'Happy hour'}}

test('A 19:00 slot booked during happy hour is priced at its own Rs 60, as newBooking charges',()=>{
 const {slotUnitPrice,slotOffer}=load()
 const evening={console_name:'PS5',console_price:60,base_price:60}
 assert.equal(slotUnitPrice(evening,active),60)
 assert.equal(slotOffer(evening,active).isOffer,false)
})
test('A slot inside the offer shows the offer price and the struck-out base price',()=>{
 const {slotUnitPrice,slotOffer}=load()
 const afternoon={console_name:'PS5',console_price:40,base_price:60}
 assert.equal(slotUnitPrice(afternoon,{}),40)
 assert.deepEqual({...slotOffer(afternoon,active)},{isOffer:true,basePrice:60,name:'Happy hour'})
 assert.equal(slotOffer(afternoon,{}).name,'Offer')
})
test('Without base_slot_price (older booking service) the previous active-pricing rule is kept',()=>{
 const {slotUnitPrice}=load()
 assert.equal(slotUnitPrice({console_name:'PS5',console_price:60},active),40)
 assert.equal(slotUnitPrice({console_name:'PC',console_price:80},active),80)
})
test('Elapsed-time discount covers the whole PC squad',()=>{
 const {elapsedDiscountForSession}=load()
 // 3 players x Rs 60, half the slot gone: Rs 90 off (one-player rule gave Rs 30).
 assert.equal(elapsedDiscountForSession(30,60,180),90)
 // With a 10% squad discount the session nets Rs 162: half of it is Rs 81.
 assert.equal(elapsedDiscountForSession(30,60,162),81)
 // Solo: unchanged. Rate card Rs 90 for the hour: Rs 45.
 assert.equal(elapsedDiscountForSession(30,60,60),30)
 assert.equal(elapsedDiscountForSession(30,60,90),45)
 assert.equal(elapsedDiscountForSession(0,60,180),0)
 assert.equal(elapsedDiscountForSession(70,60,60),60)
})
