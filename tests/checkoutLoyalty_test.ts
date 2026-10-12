import { currentLoyalty,isLoyaltyPhone,parseLoyaltyResult } from '../src/lib/checkoutLoyalty.ts';
function equal(actual:unknown,expected:unknown) {if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Loyalty contract mismatch');}
const eligible={ok:true,registered:true,delivery_benefit:true,vip_delivery_fee:null};
Deno.test('unregistered is distinct from storage and network errors',() => {
 equal(parseLoyaltyResult({ok:true,registered:false},null),{status:'not-found'});
 equal(parseLoyaltyResult(null,{code:'PGRST116'}),{status:'error'});
 equal(parseLoyaltyResult(eligible,{code:'42501'}),{status:'error'});
});
Deno.test('checkout retains eligibility without a private customer profile',() => {
 equal(parseLoyaltyResult({...eligible,nombre:'private',puntos:100,saldo_billetera:500,pin:'private'},null),
  {status:'found',customer:{deliveryBenefit:true,vipDeliveryFee:null}});
});
Deno.test('VIP pricing comes from the projection without exposing points or wallet',() => {
 for(const fee of [7,10])equal(parseLoyaltyResult({ok:true,registered:true,delivery_benefit:false,vip_delivery_fee:fee},null),
  {status:'found',customer:{deliveryBenefit:false,vipDeliveryFee:fee}});
});
Deno.test('invalid and contradictory pricing records never grant eligibility',() => {
 for(const invalid of [null,undefined,{},[],[eligible],{...eligible,ok:false},{...eligible,registered:'true'},
  {...eligible,delivery_benefit:'true'},{...eligible,vip_delivery_fee:9},{...eligible,vip_delivery_fee:7}])
  equal(parseLoyaltyResult(invalid,null),{status:'error'});
});
Deno.test('only a complete local phone can request loyalty',() => {
 equal(isLoyaltyPhone('5550000001'),true);
 for(const invalid of ['','555000000','525550000001','555-000-0001','abcdefghij'])equal(isLoyaltyPhone(invalid),false);
});
Deno.test('switching phone immediately hides the previous eligibility',() => {
 const snapshot={key:{phone:'5550000001',attempt:0},result:parseLoyaltyResult(eligible,null)};
 equal(currentLoyalty('5550000002',{phone:'5550000002',attempt:0},snapshot),{status:'loading'});
 equal(currentLoyalty('555',{phone:'555',attempt:0},snapshot),{status:'idle'});
 equal(currentLoyalty('5550000001',snapshot.key,snapshot),snapshot.result);
});
Deno.test('retry and returning to an earlier phone require a fresh response',() => {
 const key={phone:'5550000001',attempt:0},snapshot={key,result:parseLoyaltyResult(null,new Error('Network unavailable'))};
 equal(currentLoyalty(key.phone,{...key,attempt:1},snapshot),{status:'loading'});
 equal(currentLoyalty(key.phone,{...key},snapshot),{status:'loading'});
 equal(currentLoyalty(key.phone,key,snapshot),{status:'error'});
});
