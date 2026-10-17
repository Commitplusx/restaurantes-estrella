import { isTrackingKey, rememberTrackingKey, trackingKey, trackingLink, parseTrackingProjection } from '../src/lib/trackingAccess.ts';
function assert(value:unknown):asserts value { if(!value)throw Error('Assertion failed'); }
function rejects(action:()=>unknown) { let failed=false;try{action();}catch{failed=true;}assert(failed); }
const reference='00000000-0000-4000-8000-000000000001', key='00000000-0000-4000-8000-000000000002';
Deno.test('tracking keys are independent capabilities and travel only in URL fragment',()=>{
 assert(!isTrackingKey(reference.slice(0,6))); assert(!rememberTrackingKey('wrong',key));
 assert(rememberTrackingKey(reference,key));assert(trackingKey(reference)===key);
 const link=trackingLink('/tracker',reference);
 assert(link.includes('#clave='+key));assert(!link.split('#')[0].includes(key));
 assert(trackingKey(reference,'#clave=invalid')===null);
 assert(trackingKey(reference,'#clave='+key)===key);
});
Deno.test('a failed projection cannot be mistaken for an empty successful order',()=>{
 for(const value of [null,[],{}, {pedido:null}, {pedido:{id:reference}}])rejects(()=>parseTrackingProjection(value));
});
Deno.test('projection validates restaurant and accepted driver identity',()=>{
 const order={id:reference,created_at:'2026-10-17T10:00:00Z',estado:'pendiente',descripcion:'QA',cliente_tel:'0000000000',restaurante_id:key};
 const projection={pedido:order,restaurante:{id:key,nombre:'QA',lat:0,lng:0},repartidor:null,topic:'storefront:'+'a'.repeat(64)};
 assert(parseTrackingProjection(projection).pedido.id===reference);
 rejects(()=>parseTrackingProjection({...projection,restaurante:{id:reference,nombre:'Other'}}));
 rejects(()=>parseTrackingProjection({...projection,topic:'raw-order-id'}));
 const assigned={...order,estado:'asignado',repartidor_id:reference};
 rejects(()=>parseTrackingProjection({...projection,pedido:assigned,repartidor:{id:key,user_id:key,nombre:'Other'}}));
});
