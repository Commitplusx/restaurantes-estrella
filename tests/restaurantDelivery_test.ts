import {parseDeliveryCapability,parseDeliveryReceipts,parseRestaurantDeliveryQuote,parseRestaurantDeliveryReceipt,normalizeDeliveryPhone} from '../src/lib/restaurantDelivery.ts';
import {deepStrictEqual} from 'node:assert/strict';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const origin={id:id(2),name:'Robin sintético',branch:'Sucursal',address:'Origen de prueba',lat:16,lng:-92};
const quote={id:id(1),restaurantId:id(2),origin,destination:{lat:16.2,lng:-92.2,address:'Destino de prueba'},pricing:'manual',locationSource:'address',h3Index:null,fee:50,food:200,restaurantContribution:15,customerShipping:35,customerToCollect:235,restaurantSettlement:185,expiresAt:'2026-10-25T23:50:00Z'};
const receipt={requestId:id(3),orderId:id(4),state:'buscando_repartidor',fee:50,food:200,restaurantContribution:15,customerShipping:35,total:235,restaurantSettlement:185,createdAt:'2026-10-25T23:45:00Z',trackingKey:id(5),incident:null};
function equal(a:unknown,b:unknown){deepStrictEqual(a,b);}
function rejected(work:()=>unknown){let failed=false;try{work();}catch(error:unknown){if(!(error instanceof Error))throw error;failed=true;}equal(failed,true);}
Deno.test('only verified capability enables requests; branch name cannot substitute for entitlement',()=>{
 equal(parseDeliveryCapability({enabled:false,name:'Pollo Robin’s'}),{enabled:false});
 equal(parseDeliveryCapability({enabled:true,pricing:'manual',defaultContribution:15,origin}),{enabled:true,pricing:'manual',defaultContribution:15,origin});
 for(const value of[null,{}, {enabled:true,origin},{enabled:'true',origin}])rejected(()=>parseDeliveryCapability(value));
});
Deno.test('a manual quote conserves 50 shipping = 15 restaurant + 35 customer and 200 food',()=>{
 const value=parseRestaurantDeliveryQuote(quote);equal(value.customerToCollect,235);equal(value.restaurantSettlement,185);equal(value.customerToCollect-value.restaurantSettlement,50);
});
Deno.test('a paid food request explicitly represents receiving the contribution at pickup',()=>{
 const row=parseRestaurantDeliveryReceipt({...receipt,food:0,total:35,restaurantSettlement:-15});equal(row.restaurantSettlement,-15);equal(row.total-row.restaurantSettlement,50);
});
Deno.test('a mismatched or malformed financial response cannot become a confirmed request',()=>{
 for(const patch of[{fee:1},{food:-1},{restaurantContribution:51},{customerShipping:50},{restaurantSettlement:200},{total:250},{fee:50.001},{state:'inventado'},{orderId:'bad'}])rejected(()=>parseRestaurantDeliveryReceipt({...receipt,...patch}));
 for(const patch of[{fee:'50'},{customerToCollect:250},{expiresAt:'bad'},{pricing:'zone'},{destination:{...quote.destination,lat:999}}])rejected(()=>parseRestaurantDeliveryQuote({...quote,...patch}));
});
Deno.test('only bounded and validated receipts can populate the recent list',()=>{
 equal(parseDeliveryReceipts([receipt]).length,1);rejected(()=>parseDeliveryReceipts({rows:[receipt]}));rejected(()=>parseDeliveryReceipts(Array.from({length:21},()=>receipt)));
});
Deno.test('creation and recovery cannot confirm a receipt belonging to another request',()=>{
 equal(parseRestaurantDeliveryReceipt(receipt,receipt.requestId).orderId,receipt.orderId);
 rejected(()=>parseRestaurantDeliveryReceipt(receipt,id(99)));
});
Deno.test('phone formatting retains the Mexican customer identity without accepting partial numbers',()=>{
 equal(normalizeDeliveryPhone('+52 555 000 0000'),'5550000000');equal(normalizeDeliveryPhone('5550000000'),'5550000000');
 for(const value of['555000','+1 555 000 0000','5550000000999'])rejected(()=>normalizeDeliveryPhone(value));
});
Deno.test('written destinations can remain unpinned without becoming an automatic tariff',()=>{
 const row=parseRestaurantDeliveryQuote({...quote,destination:{lat:null,lng:null,address:'Dirección copiada del cliente'}});equal(row.destination.lat,null);equal(row.pricing,'manual');
 rejected(()=>parseRestaurantDeliveryQuote({...quote,destination:{lat:null,lng:0,address:'Coordenada incompleta'}}));
});
Deno.test('automatic pin pricing requires its server H3 provenance and a real coordinate pair',()=>{
 const pin={...quote,pricing:'h3',locationSource:'pin',h3Index:'8a6d2e884807fff'};equal(parseRestaurantDeliveryQuote(pin).pricing,'h3');
 for(const patch of[{locationSource:'address'},{h3Index:null},{h3Index:'bad'},{destination:{lat:null,lng:null,address:'No es un pin'}}])rejected(()=>parseRestaurantDeliveryQuote({...pin,...patch}));
 rejected(()=>parseRestaurantDeliveryQuote({...quote,origin:{...origin,id:id(99)}}));
});

Deno.test('pickup PIN preserves leading zeros and is hidden after collection without inventing a missing PIN',()=>{
 equal(parseRestaurantDeliveryReceipt({...receipt,pickupPin:'0042'}).pickupPin,'0042');
 equal(parseRestaurantDeliveryReceipt(receipt).pickupPin,null);
 equal(parseRestaurantDeliveryReceipt({...receipt,pickupPin:'0042',state:'en_camino'}).pickupPin,null);
 for(const pickupPin of[42,'42','12345','abcd'])rejected(()=>parseRestaurantDeliveryReceipt({...receipt,pickupPin}));
});
