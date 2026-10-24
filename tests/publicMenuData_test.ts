import { currentMenuPromotions, menuConfigurationIssue, menuTabAfterRefresh, parsePublicMenu, publicMenuIsPaused } from '../src/lib/publicMenuData.ts';
import { availableOptionGroups } from '../src/lib/menuOptions.ts';
const id = '00000000-0000-4000-8000-000000000001';
const restaurant = { id, nombre: 'Restaurante de prueba', telefono: '', activo: true, matriz_id: null };
const product = { id: 'p1', restaurante_id: id, nombre: 'Producto', precio: 50, disponible: true, categoria_id: 'c1' };
const promo = { id: 'promo1', restaurante_id: id, titulo: 'Oferta', precio_especial: 80, activa: true, tipos_pedido: ['tienda'], dias_aplicacion: [], fecha_fin: '2026-10-17' };
function assert(condition: unknown): asserts condition { if (!condition) throw new Error('Expected condition'); }
function throws(task: () => unknown) { try { task(); } catch { return; } throw new Error('Expected rejection'); }
Deno.test('menu parser rejects cross-branch rows and malformed prices instead of caching partial success', () => {
  const parsed = parsePublicMenu(restaurant, [], [product], [], [promo]);
  assert(parsed.items[0].precio === 50 && parsed.promos[0].tipos_pedido?.[0] === 'tienda');
  throws(() => parsePublicMenu(restaurant, [], [{ ...product, restaurante_id: 'other' }], [], []));
  throws(() => parsePublicMenu(restaurant, [], [{ ...product, precio: '50' }], [], []));
  throws(() => parsePublicMenu(restaurant, [], [product, product], [], []));
  throws(() => parsePublicMenu(restaurant, null, [], [], []));
  const inactive = parsePublicMenu(restaurant, [], [{ ...product, activo: false }], [], []);
  assert(inactive.items[0].activo === false);
});
Deno.test('cached offers are checked on reading including crossing local midnight', () => {
  const parsed = parsePublicMenu(restaurant, [], [], [], [promo]);
  assert(currentMenuPromotions(parsed.promos, new Date('2026-10-18T05:59:59Z')).length === 1);
  assert(currentMenuPromotions(parsed.promos, new Date('2026-10-18T06:00:00Z')).length === 0);
  throws(() => parsePublicMenu(restaurant, [], [], [], [{ ...promo, tipos_pedido: ['tienda', 'wrong'] }]));
  throws(() => parsePublicMenu(restaurant, [], [], [], [{ ...promo, dias_aplicacion: ['bad'] }]));
});
Deno.test('a newer full read reconciles a realtime pause even when the reopening event is lost', () => {
  const previous = parsePublicMenu(restaurant, [], [], [], []);
  const event = { id, paused: true, observed: previous };
  assert(publicMenuIsPaused(previous, event));
  const reopened = parsePublicMenu(restaurant, [], [], [], []);
  assert(!publicMenuIsPaused(reopened, event));
  const stillClosed = parsePublicMenu({ ...restaurant, activo: false }, [], [], [], []);
  assert(publicMenuIsPaused(stillClosed, event));
  const otherBranch = parsePublicMenu({ ...restaurant, id: '00000000-0000-4000-8000-000000000002' }, [], [], [], []);
  assert(!publicMenuIsPaused(otherBranch, event));
});

Deno.test('historical option metadata does not block the rest of a menu or become an orderable choice list', () => {
  const historical = { ...product, id: 'legacy', opciones: { dias_validos: ['martes'], solo_consumo_local: true, disponible_en_delivery: false } };
  const customizable = { ...product, id: 'choices', opciones: [{ titulo: 'Salsa', requerido: true, maximo_selecciones: 1,
    opciones: [{ nombre: 'Especial', precio_extra: 12.5 }] }] };
  const parsed = parsePublicMenu(restaurant, [], [product, historical, customizable], [], []);
  assert(parsed.items.length === 3);
  assert(!menuConfigurationIssue(parsed.items[0]));
  assert(menuConfigurationIssue(parsed.items[1]) === 'Opciones en actualización');
  assert(parsed.items[1].opciones === undefined && parsed.items[1].precio === 50);
  assert(parsed.items[2].opciones?.[0].opciones[0].precio_extra === 12.5);
  const groups = [{ titulo: 'Producto', requerido: true, maximo_selecciones: 1,
    opciones: [{ nombre: 'Producto', menu_item_id: 'legacy', precio_extra: 0 }] }];
  assert(availableOptionGroups(groups, parsed.items, id)[0].opciones.length === 0);
  throws(() => parsePublicMenu(restaurant, [], [{ ...product, opciones: [{ requerido: true }] }], [], []));
  throws(() => parsePublicMenu(restaurant, [], [{ ...product, opciones: 'invalid' }], [], []));
});

Deno.test('nullable descriptive combo includes preserve prices and option validation', () => {
  const combo = { id: 'combo', restaurante_id: id, nombre: 'Paquete', precio: 120, disponible: true, incluye: null, opciones: [] };
  const parsed = parsePublicMenu(restaurant, [], [], [combo], []);
  assert(parsed.combos[0].incluye.length === 0 && parsed.combos[0].precio === 120);
  assert(!menuConfigurationIssue(parsed.combos[0]));
  throws(() => parsePublicMenu(restaurant, [], [], [{ ...combo, incluye: [12] }], []));
  throws(() => parsePublicMenu(restaurant, [], [], [{ ...combo, precio: null }], []));
});
Deno.test('refresh keeps a valid category or combo; removed tabs select another available section', () => {
  const category = { id: 'c1', restaurante_id: id, nombre: 'Platos', activa: true, orden: 0 };
  const combo = { id: 'combo', restaurante_id: id, nombre: 'Paquete', precio: 120, disponible: true, incluye: [] };
  const data = parsePublicMenu(restaurant, [category], [product], [combo], [promo]);
  assert(menuTabAfterRefresh('combos', null, data) === 'combos');
  assert(menuTabAfterRefresh('c1', 'promos', data) === 'c1');
  assert(menuTabAfterRefresh('', 'c1', data) === 'c1');
  assert(menuTabAfterRefresh('promos', null, { ...data, promos: [] }) === 'c1');
  assert(menuTabAfterRefresh('old', null, { categorias: [], items: [], combos: [], promos: [] }) === '');
});
