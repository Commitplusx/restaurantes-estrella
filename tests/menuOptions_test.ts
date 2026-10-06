import { availableOptionGroups, optionFromMenu, parseMenuOptionProducts, validateOptionGroups, validateOptionSelection } from '../src/lib/menuOptions.ts';
import type { MenuOptionProduct, OpcionGrupo } from '../src/lib/menuOptions.ts';

const products: MenuOptionProduct[] = [
  { id: 'a', restaurante_id: 'r', nombre: 'Gara roll', precio: 90, disponible: true },
  { id: 'b', restaurante_id: 'r', nombre: 'Camaroll', precio: 100, disponible: true },
];
const groups: OpcionGrupo[] = [1, 2, 3].map(i => ({ titulo: `Maki ${i}`, requerido: true, maximo_selecciones: 1, opciones: products.map(optionFromMenu) }));
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Unexpected menu validation result');
}
function rejects(operation: () => unknown) {
  let rejected = false;
  try { operation(); } catch { rejected = true; }
  if (!rejected) throw new Error('Expected boundary rejection');
}
Deno.test('catalogue boundary rejects wrong tenant and malformed prices', () => {
  equal(parseMenuOptionProducts(products, 'r'), products);
  rejects(() => parseMenuOptionProducts(products, 'another'));
  rejects(() => parseMenuOptionProducts([{ ...products[0], precio: '90' }], 'r'));
});
Deno.test('menu options preserve identity with zero surcharge and independent repeated slots', () => {
  equal(optionFromMenu(products[0]), { menu_item_id: 'a', nombre: 'Gara roll', precio_extra: 0 });
  equal(validateOptionGroups(groups, products, 'r'), null);
  equal(validateOptionSelection(groups, { 'Maki 1': { 'Gara roll': true }, 'Maki 2': { 'Gara roll': true }, 'Maki 3': { 'Gara roll': true } }), null);
});
Deno.test('removed and unavailable products cannot remain selected; all steps are required', () => {
  const available = availableOptionGroups(groups, [{ ...products[0], agotado_hoy: true }, products[1]], 'r');
  if (!validateOptionSelection(available, { 'Maki 1': { 'Gara roll': true } })) throw new Error('Stale choice was accepted');
  if (!validateOptionSelection(groups, { 'Maki 3': { Camaroll: true } })) throw new Error('Missing previous steps accepted');
  equal(availableOptionGroups(groups, products, 'another')[0].opciones, []);
});
Deno.test('invalid group identity, forged references and duplicate options are rejected', () => {
  if (!validateOptionGroups([...groups, groups[0]], products, 'r')) throw new Error('Duplicate group accepted');
  if (!validateOptionGroups(groups, products.slice(1), 'r')) throw new Error('Removed reference accepted');
  if (!validateOptionGroups([{ ...groups[0], opciones: [...groups[0].opciones, groups[0].opciones[0]] }], products, 'r')) throw new Error('Duplicate option accepted');
  if (!validateOptionSelection(groups, { Unknown: { 'Gara roll': true } })) throw new Error('Unknown group accepted');
});
