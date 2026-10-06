import { ACTIVE_ORDER_STATES, acceptedDriver, receiptState, parseOrderReceipt } from '../src/utils/orderState.ts';
function equal(a:unknown,b:unknown){if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Estado incorrecto');}
Deno.test('cash receipt includes every active dispatch state without requiring cash already paid',()=>{
 for(const estado of ACTIVE_ORDER_STATES)equal(receiptState({estado,metodo_pago:'efectivo',estado_pago:'pendiente'}),'success');
});
Deno.test('online receipt requires server payment even after dispatch status changes',()=>{
 for(const estado of ['pendiente_pago','ofrecido','asignado'])equal(receiptState({estado,metodo_pago:'en_linea',estado_pago:'pendiente'}),'validating');
 equal(receiptState({estado:'asignado',metodo_pago:'en_linea',estado_pago:'pagado'}),'success');
 equal(receiptState({estado:'pendiente_pago',metodo_pago:'en_linea',estado_pago:'fallido'}),'error');
});
Deno.test('offered candidate is never presented as the accepted driver',()=>{
 equal(acceptedDriver({estado:'ofrecido',repartidor_id:'candidate'}),null);
 equal(acceptedDriver({estado:'asignado',repartidor_id:'driver'}),'driver');
 equal(receiptState({estado:'inventado',metodo_pago:'efectivo',estado_pago:null}),'error');
});
Deno.test('receipt validates external data before presenting a persisted confirmation',()=>{
 const fixture={id:'00000000-0000-4000-8000-000000000001',created_at:'2026-10-06T10:00:00Z',estado:'pendiente',descripcion:'Prueba',cliente_tel:'5550000000',total:100};
 equal(parseOrderReceipt(fixture).total,100);
 for(const value of [null,[],{}, {...fixture,id:'inventado'}, {...fixture,total:-1}, {...fixture,total:'100'}, {...fixture,estado:100}]){
 let rejected=false;try{parseOrderReceipt(value);}catch{rejected=true;}equal(rejected,true);
 }
});
