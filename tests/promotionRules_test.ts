import { promotionCartIssues, promotionDeliveries, promotionDeliveryLabel, promotionRuleIssue, validatePromotionRows, type PromotionRules } from '../src/lib/promotionRules.ts';
function equal(a: unknown,b: unknown) { if (JSON.stringify(a)!==JSON.stringify(b)) throw new Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function rejects(fn:()=>unknown) { let failed=false;try{fn();}catch{failed=true;}if(!failed)throw new Error('Expected validation failure'); }
const promo: PromotionRules = { id:'promo-a',restaurante_id:'branch-a',titulo:'Pollo para compartir',activa:true,tipos_pedido:['tienda','domicilio'],dias_aplicacion:['vie'],fecha_fin:'2026-10-16' };
const friday=new Date('2026-10-16T21:00:00Z');
Deno.test('legacy modes remain both; explicit bad modes never silently allow all',()=>{
  equal(promotionDeliveries(undefined),['tienda','domicilio']);
  for(const value of [null,[],['tienda','tienda'],['dine-in'],['domicilio',null],{},true]) rejects(()=>promotionDeliveries(value));
  equal(promotionDeliveries(['domicilio','tienda']),['tienda','domicilio']);
});
Deno.test('fulfilment rules and labels cover all three configurations',()=>{
  equal(promotionRuleIssue(promo,'domicilio',friday),null);
  equal(promotionRuleIssue(promo,'tienda',friday),null);
  equal(promotionRuleIssue({...promo,tipos_pedido:['tienda']},'domicilio',friday),'Solo recoger en sucursal.');
  equal(promotionRuleIssue({...promo,tipos_pedido:['domicilio']},'tienda',friday),'Solo a domicilio.');
  equal(promotionDeliveryLabel(['tienda','domicilio']),'Recoger y a domicilio');
});
Deno.test('Mexico City dates and weekdays are independent of device timezone',()=>{
  equal(promotionRuleIssue(promo,'tienda',new Date('2026-10-17T05:59:59Z')),null);
  equal(promotionRuleIssue(promo,'tienda',new Date('2026-10-17T06:00:00Z')),'Esta promoción terminó. Elige otra opción del menú.');
  equal(promotionRuleIssue({...promo,fecha_fin:null},'tienda',new Date('2026-10-17T06:00:00Z')),'Esta promoción no aplica hoy.');
});
Deno.test('inactive, malformed rules, missing and foreign rows are handled explicitly',()=>{
  equal(promotionRuleIssue({...promo,activa:false},'tienda',friday),'Esta promoción está pausada.');
  for(const change of [{tipos_pedido:[]},{fecha_fin:'tomorrow'},{dias_aplicacion:['funday']}]) {
    if(!promotionRuleIssue({...promo,...change},'tienda',friday))throw new Error('Malformed rules passed');
  }
  rejects(()=>validatePromotionRows([{...promo,restaurante_id:'branch-b'}],'branch-a'));
  rejects(()=>validatePromotionRows([promo,promo],'branch-a'));
  equal(promotionCartIssues(['deleted'],[],'tienda',friday).length,1);
});
Deno.test('mode changes re-evaluate the whole basket and preserve unaffected promotions',()=>{
  const pickup={...promo,tipos_pedido:['tienda']},delivery={...promo,id:'promo-b',tipos_pedido:['domicilio']};
  equal(promotionCartIssues([pickup.id,delivery.id,pickup.id],[pickup,delivery],'domicilio',friday).map(issue=>issue.id),['promo-a']);
  equal(promotionCartIssues([pickup.id,delivery.id],[pickup,delivery],'tienda',friday).map(issue=>issue.id),['promo-b']);
});
