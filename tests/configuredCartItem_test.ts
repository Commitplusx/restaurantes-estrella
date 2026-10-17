import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { configuredCartItem } from '../src/lib/configuredCartItem.ts';
import type { ConfigurableProduct } from '../src/lib/configuredCartItem.ts';
import type { OpcionGrupo } from '../src/lib/menuOptions.ts';

const product: ConfigurableProduct = { id:'pollo', nombre:'Pollo de prueba', precio:100, tipo:'combo' };
const groups: OpcionGrupo[] = [{ id:'salsa', titulo:'Salsa', requerido:true, maximo_selecciones:1,
  opciones:[{ id:'bbq', nombre:'BBQ', precio_extra:0 },{ id:'mango', nombre:'Mango', precio_extra:10 }] },
  { titulo:'Complementos', requerido:false, maximo_selecciones:2, opciones:[{ nombre:'Coditos', menu_item_id:'coditos', precio_extra:5 },{ nombre:'Papas', menu_item_id:'papas', precio_extra:8 }] }];

Deno.test('configured order preserves choices, catalogue references and exact surcharge', () => {
  const item=configuredCartItem(product,groups,{ Salsa:{ Mango:true },Complementos:{Coditos:true,Papas:true} });
  assertEquals(item.precio,123);
  assertEquals(item.opcionesSeleccionadas?.map(option=>option.menu_item_id),[undefined,'coditos','papas']);
  assertEquals(item.opcionesSeleccionadas?.map(option=>option.opcion),['Mango','Coditos','Papas']);
  assertEquals(item.cartItemId,configuredCartItem(product,groups,{Complementos:{Papas:true,Coditos:true},Salsa:{Mango:true}}).cartItemId);
});
Deno.test('optional steps may be skipped; required and stale choices block submission', () => {
  assertEquals(configuredCartItem(product,groups,{Salsa:{BBQ:true}}).precio,100);
  assertThrows(()=>configuredCartItem(product,groups,{}));
  assertThrows(()=>configuredCartItem(product,groups,{Salsa:{BBQ:true,Mango:true}}));
  assertThrows(()=>configuredCartItem(product,groups,{Salsa:{Removed:true}}));
  assertThrows(()=>configuredCartItem(product,groups,{Salsa:{BBQ:true},Unknown:{Extra:true}}));
});
Deno.test('identical products with different choices retain independent cart identities', () => {
  const first=configuredCartItem(product,groups,{Salsa:{BBQ:true}});
  const second=configuredCartItem(product,groups,{Salsa:{Mango:true}});
  assertEquals(first.cartItemId===second.cartItemId,false);
  assertEquals(first.precio,100);assertEquals(second.precio,110);
});
Deno.test('invalid and overflowing option prices never create a configured order', () => {
  for (const precio of [NaN,Infinity,-1]) assertThrows(()=>configuredCartItem({...product,precio},groups,{Salsa:{BBQ:true}}));
  for (const price of [NaN,Infinity,-1]) {
    const invalid=groups.map(group=>({...group,opciones:group.opciones.map(option=>({...option,precio_extra:price}))}));
    assertThrows(()=>configuredCartItem(product,invalid,{Salsa:{BBQ:true}}));
  }
  const overflow=groups.map(group=>({...group,opciones:group.opciones.map(option=>({...option,precio_extra:Number.MAX_VALUE}))}));
  assertThrows(()=>configuredCartItem({...product,precio:Number.MAX_VALUE},overflow,{Salsa:{BBQ:true}}));
});
