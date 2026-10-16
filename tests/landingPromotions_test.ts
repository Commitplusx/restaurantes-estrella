import { groupLandingPromotions, parseLandingPromotions } from '../src/lib/landingPromotions.ts';
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
const root='11111111-1111-4111-8111-111111111111', branch='22222222-2222-4222-8222-222222222222', third='33333333-3333-4333-8333-333333333333';
const now=new Date('2026-10-16T20:00:00Z');
function offer(id: string, restaurantId: string, brand: string | null=root) {
  return {id,restaurante_id:restaurantId,titulo:'2 Pollos',descripcion:'Ideal para compartir',precio_especial:319,foto_url:'https://example.test/'+restaurantId+'.webp',activa:true,fecha_fin:null,dias_aplicacion:['vie'],tipos_pedido:['tienda','domicilio'],opciones:[],restaurantes:{id:restaurantId,nombre:'Pollo Robin’s',slug:restaurantId,activo:true,perfil_completo:true,matriz_id:brand}};
}
Deno.test('three copied branch offers display once and link to a real matching root offer',()=>{
  const rows=parseLandingPromotions([offer('b',branch),offer('c',third),offer('a',root,null)]);
  const grouped=groupLandingPromotions(rows,'domicilio',now);
  equal(grouped.length,1);equal(grouped[0].branchCount,3);equal(grouped[0].restaurante_id,root);
  equal(groupLandingPromotions([...rows].reverse(),'domicilio',now)[0].id,'a');
});
Deno.test('different brands, prices, descriptions, validity and options remain distinct',()=>{
  const base=offer('a',root,null);
  const variants=[offer('other-brand',third,null),{...offer('price',branch),precio_especial:320},{...offer('description',branch),descripcion:'Con bebida'}, {...offer('validity',branch),fecha_fin:'2026-10-20'},{...offer('options',branch),opciones:[{titulo:'Salsa',requerido:true,maximo_selecciones:1,opciones:[{nombre:'BBQ',precio_extra:10}]}]}];
  equal(groupLandingPromotions(parseLandingPromotions([base,...variants]),'tienda',now).length,6);
});
Deno.test('mixed delivery rules group only currently eligible branches, without changing their rules',()=>{
  const rows=parseLandingPromotions([{...offer('a',root,null),tipos_pedido:['tienda']},{...offer('b',branch),tipos_pedido:['tienda']},offer('c',third)]);
  equal(groupLandingPromotions(rows,'tienda',now).map(row=>row.branchCount),[3]);
  const delivered=groupLandingPromotions(rows,'domicilio',now);
  equal(delivered.map(row=>row.branchCount),[1]);equal(delivered[0].restaurante_id,third);
  equal(rows[0].tipos_pedido,['tienda']);
});
Deno.test('branch-specific copied catalogue IDs do not duplicate semantically identical options',()=>{
  const options=(id:string)=>[{id,titulo:'Elige complemento',requerido:true,maximo_selecciones:1,opciones:[{menu_item_id:id,nombre:'Papas',precio_extra:0}]}];
  const rows=parseLandingPromotions([{...offer('a',root,null),opciones:options('original')},{...offer('b',branch),opciones:options('copy')}]);
  equal(groupLandingPromotions(rows,'domicilio',now).map(row=>row.branchCount),[2]);
});
Deno.test('unavailable branches, expired days and unsupported delivery never inflate the group',()=>{
  const hidden=offer('hidden',branch);hidden.restaurantes.activo=false;
  const rows=parseLandingPromotions([offer('a',root,null),hidden,{...offer('ended',third),fecha_fin:'2026-10-15'},{...offer('pickup',third),tipos_pedido:['tienda']}]);
  equal(groupLandingPromotions(rows,'domicilio',now).map(row=>row.branchCount),[1]);
  equal(groupLandingPromotions(rows,'domicilio',new Date('2026-10-17T07:00:00Z')).length,0);
});
Deno.test('foreign joins and invalid prices are rejected at the boundary',()=>{
  for(const input of [[{...offer('a',root,null),restaurante_id:branch}],[{...offer('a',root,null),precio_especial:-1}],{}]) {
    let rejected=false;try{parseLandingPromotions(input);}catch{rejected=true;}if(!rejected)throw new Error('Expected invalid offer rejection');
  }
});
