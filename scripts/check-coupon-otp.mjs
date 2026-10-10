
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync('lib/payments/quote.js','utf8').replace(/^import .*;$/gm,'').replaceAll('export ','');
const {applyCoupon,QuoteError,pendingOrderMatchesQuote}=new Function('createSupabaseServiceClient',source+';return {applyCoupon,QuoteError,pendingOrderMatchesQuote};')(()=>null);
const base={enabled:true,discount_type:'percent',discount_value:10,currency:'NGN',redemption_count:0};
function quote(data,error=null){
 const query={select(){return this},ilike(key,value){this.lookup=value;return this},async maybeSingle(){return {data,error}}};
 return {service:{from:()=>query},query,salePrice:5000000,course:{currency:'NGN'}};
}
assert.equal((await applyCoupon(quote(base),' save10 ')).amount,4500000);
assert.equal((await applyCoupon(quote({...base,discount_type:'fixed',discount_value:1000}),'SAVE')).amount,4900000);
const wild=quote(base);await applyCoupon(wild,'SAVE_10%');assert.equal(wild.query.lookup,'SAVE\\_10\\%');
for(const [row,expected] of [
 [{...base,enabled:false},'not available'],
 [{...base,starts_at:'2999-01-01'},'not active'],
 [{...base,expires_at:'2020-01-01'},'expired'],
 [{...base,max_redemptions:2,redemption_count:2},'usage limit'],
 [{...base,discount_type:'fixed',currency:'USD'},'currency']]){
 await assert.rejects(applyCoupon(quote(row),'SAVE'),e=>e instanceof QuoteError&&e.message.includes(expected));
}
await assert.rejects(applyCoupon(quote(null,{code:'42P01'}),'SAVE'),e=>e.status===503);
const dates=fs.readFileSync('lib/coupon-dates.js','utf8').replace('export ','');
const couponDate=new Function(dates+';return couponDate;')();
assert.equal(couponDate('2026-10-08T10:00'),'2026-10-08T09:00:00.000Z');
assert.equal(couponDate(''),null);
const actions=fs.readFileSync('app/student-actions.js','utf8');
const verify=actions.slice(actions.indexOf('export async function verifyStudentEmail'),actions.indexOf('export async function studentSignIn')).replace('export ','');
for(const code of [null,'otp_expired']){
 let submitted,profiles=0;
 const fn=new Function('createSupabaseAuthClient','safeNext','redirect','cookies','ensureStudentProfile','console',verify+';return verifyStudentEmail;')(
 async()=>({auth:{verifyOtp:async args=>{submitted=args;return code?{error:{code}}:{data:{user:{id:'u'}}}}}}),
 ()=>'/checkout/course',url=>{throw new Error(url)},async()=>({set(){},delete(){}}),async()=>{profiles++},{error(){}});
 const form=new FormData();form.set('email','test@example.com');form.set('token','123456');
 await assert.rejects(fn(form),error=>error.message.startsWith(code?'/verify-email?':'/checkout/course'));
 assert.equal(submitted.type,'email');assert.equal(profiles,code?0:1);
}
console.log('PASS coupon states, amount calculations, timezone and signup OTP success/expiry');

const q={amount:4500000,course:{currency:"NGN"},coupon:{id:"discount"}};
const order={amount_minor:4500000,currency:"NGN",coupon_id:"discount"};
assert.equal(pendingOrderMatchesQuote(order,q),true);
for(const change of [{amount_minor:5000000},{coupon_id:null},{currency:"USD"}])assert.equal(pendingOrderMatchesQuote({...order,...change},q),false);
console.log("PASS previous payment link requires matching amount, currency and coupon");
