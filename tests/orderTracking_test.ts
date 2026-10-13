import {isTrackingReference,parseTrackedDriver,parseTrackedOrder,trackingPoint} from '../src/lib/orderTracking.ts';
import {parseTrackingRoute,trackingRouteUrl} from '../src/lib/trackingRoute.ts';
function equal(actual:unknown,expected:unknown) {if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error('Unexpected tracking value');}
function throws(run:()=>unknown) {let rejected=false;try {run();} catch {rejected=true;} equal(rejected,true);}
const order='00000000-0000-4000-8000-000000000001',owner='00000000-0000-4000-8000-000000000002';
Deno.test('tracker accepts only exact UUID/folio links and does not accept query fragments',()=>{
  for(const value of [order,'FD81BD']) equal(isTrackingReference(value),true);
  for(const value of [null,'','?pedido='+order,order+'x','../FD81BD']) equal(isTrackingReference(value),false);
});
Deno.test('driver belongs to the accepted Auth user, not the profile row ID',()=>{
  const row={id:order,user_id:owner,nombre:'Repartidor de prueba',telefono:null,lat:'16.22',lng:'-92.13'};
  equal(parseTrackedDriver(row,owner).telefono,null);equal(parseTrackedDriver(row,owner).lat,16.22);
  throws(()=>parseTrackedDriver(row,order));
});
Deno.test('invalid GPS is absent and valid zero coordinates are not fabricated or discarded',()=>{
  for(const row of [null,{lat:null,lng:-92},{lat:16,lng:NaN},{lat:Infinity,lng:0},{lat:91,lng:0}]) equal(trackingPoint(row),null);
  equal(trackingPoint({lat:0,lng:0}),{lat:0,lng:0});
});
Deno.test('legacy receipts keep their persisted description when item data is incompatible',()=>{
  const row={id:order,created_at:'2026-10-13T10:00:00Z',estado:'pendiente',descripcion:'2 productos con notas',cliente_tel:'5550000000',total:100,items:[{cantidad:'2'}],lat:'invalid',lng:-92};
  const receipt=parseTrackedOrder(row);equal(receipt.lines,null);equal(receipt.descripcion,row.descripcion);equal(trackingPoint(receipt),null);
});
Deno.test('road routes require an explicit successful provider response and valid geometry',()=>{
  const route={duration:120,geometry:{type:'LineString',coordinates:[[-92.13,16.22],[-92.14,16.23]]}};
  equal(parseTrackingRoute({code:'Ok',routes:[route]}).durationSeconds,120);
  throws(()=>parseTrackingRoute({code:'NoRoute',routes:[route]}));
  throws(()=>parseTrackingRoute({code:'Ok',routes:[{...route,duration:-1}]}));
  throws(()=>parseTrackingRoute({code:'Ok',routes:[{...route,geometry:{type:'LineString',coordinates:[[200,16],[0,0]]}}]}));
});
Deno.test('directions URLs use the selected coordinates without accepting invalid positions',()=>{
  const url=new URL(trackingRouteUrl({lat:16.22,lng:-92.13},{lat:16.23,lng:-92.14},'pk.test'));
  equal(url.hostname,'api.mapbox.com');equal(url.searchParams.get('geometries'),'geojson');
  throws(()=>trackingRouteUrl({lat:NaN,lng:0},{lat:0,lng:0},'pk.test'));
});
