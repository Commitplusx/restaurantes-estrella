import { readPublicMenu, type PublicMenuSource, type MenuRowsKind } from '../src/lib/publicMenuRequest.ts';
import { PublicResource, PUBLIC_MENU_POLICY } from '../src/lib/publicResource.ts';
import { reconcileMenuCart, type MenuCartEntry } from '../src/lib/menuCartRefresh.ts';
const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const restaurant = { id, nombre: 'Menú de prueba', telefono: '', activo: true, slug: 'menu-prueba' };
const product = { id: 'product', restaurante_id: id, categoria_id: 'category', nombre: 'Producto', precio: 80, disponible: true, opciones: [] };
function assert(value: unknown): asserts value { if (!value) throw new Error('Expected condition'); }
function equal(actual: unknown, expected: unknown) { assert(JSON.stringify(actual) === JSON.stringify(expected)); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
async function rejects(task: () => Promise<unknown>) { try { await task(); } catch { return; } throw new Error('Expected rejection'); }
function rows(kind: MenuRowsKind): unknown { return kind === 'items' ? [product] : []; }

Deno.test('a known restaurant UUID requests identity and four menu parts concurrently', async () => {
  const identity = deferred<unknown>();
  const calls: string[] = [];
  const source: PublicMenuSource = {
    restaurant: (key, _signal) => { calls.push(key); return identity.promise; },
    rows: (kind, key, _signal) => { assert(key === id); calls.push(kind); return Promise.resolve(rows(kind)); },
  };
  const pending = readPublicMenu(id, source, new AbortController().signal);
  equal(calls, [id, 'categories', 'items', 'combos', 'promos']);
  identity.resolve(restaurant);
  assert((await pending)?.items[0].precio === 80);
});
Deno.test('the listing slug hint removes the identity waterfall without using its fields as menu data', async () => {
  const calls: string[] = [];
  const source: PublicMenuSource = {
    restaurant: async (key, _signal) => { calls.push(key); return restaurant; },
    rows: async (kind, key, _signal) => { assert(key === id); calls.push(kind); return rows(kind); },
  };
  const data = await readPublicMenu('menu-prueba', source, new AbortController().signal, { id, slug: 'menu-prueba' });
  equal(calls, [id, 'categories', 'items', 'combos', 'promos']);
  assert(data?.restaurante.nombre === restaurant.nombre);
});
Deno.test('direct slug links resolve identity before starting branch-scoped menu queries', async () => {
  const identity = deferred<unknown>();
  const calls: string[] = [];
  const source: PublicMenuSource = {
    restaurant: (key, _signal) => { calls.push(key); return identity.promise; },
    rows: async (kind, key, _signal) => { assert(key === id); calls.push(kind); return rows(kind); },
  };
  const pending = readPublicMenu('menu-prueba', source, new AbortController().signal);
  equal(calls, ['menu-prueba']);
  identity.resolve(restaurant); await pending;
  equal(calls, ['menu-prueba', 'categories', 'items', 'combos', 'promos']);
});
Deno.test('unknown links are a missing menu; network errors never become an empty successful menu', async () => {
  let listReads = 0;
  const missing: PublicMenuSource = { restaurant: async () => null, rows: async () => { listReads++; return []; } };
  assert(await readPublicMenu('missing', missing, new AbortController().signal) === null);
  equal(listReads, 0);
  const failed: PublicMenuSource = { restaurant: async () => { throw new Error('network'); }, rows: async () => [] };
  await rejects(() => readPublicMenu('menu-prueba', failed, new AbortController().signal));
});
Deno.test('a changed listing hint or cross-branch menu part is rejected before becoming cached content', async () => {
  const changed: PublicMenuSource = { restaurant: async () => ({ ...restaurant, id: other }), rows: async kind => rows(kind) };
  await rejects(() => readPublicMenu('menu-prueba', changed, new AbortController().signal, { id, slug: 'menu-prueba' }));
  const foreign: PublicMenuSource = { restaurant: async () => restaurant, rows: async kind => kind === 'items' ? [{ ...product, restaurante_id: other }] : [] };
  await rejects(() => readPublicMenu(id, foreign, new AbortController().signal));
});
Deno.test('reopening shares the fresh menu and a failed child read preserves the last complete snapshot', async () => {
  let clock = 1000, reads = 0, fail = false;
  const source: PublicMenuSource = {
    restaurant: async () => { reads++; return restaurant; },
    rows: async kind => { if (fail && kind === 'combos') throw new Error('temporary'); return rows(kind); },
  };
  const resource = new PublicResource(signal => readPublicMenu(id, source, signal), PUBLIC_MENU_POLICY, () => clock);
  await resource.refresh();
  const first = resource.visible();
  for (let revisit = 0; revisit < 5; revisit++) await resource.refresh();
  equal(reads, 1); assert(resource.visible() === first);
  clock += PUBLIC_MENU_POLICY.freshFor + 1; fail = true;
  await resource.refresh();
  assert(resource.snapshot().error && resource.visible() === first);
});
Deno.test('a new complete menu reconciles only its own cart without changing quantities, options or prices', async () => {
  const source: PublicMenuSource = { restaurant: async () => restaurant, rows: async kind => rows(kind) };
  const data = await readPublicMenu(id, source, new AbortController().signal); assert(data);
  const cart: MenuCartEntry[] = [{ item: { id: 'product', cartItemId: 'product', nombre: 'Producto', precio: 80, tipo: 'item', opcionesSeleccionadas: [] }, cantidad: 2 }];
  assert(reconcileMenuCart(cart, other, data) === cart);
  assert(reconcileMenuCart(cart, id, data) === cart);
  const updated = reconcileMenuCart(cart, id, { ...data, items: [{ ...data.items[0], aplica_subsidio: false }] });
  assert(updated[0].cantidad === 2 && updated[0].item.precio === 80 && updated[0].item.aplica_subsidio === false);
  assert(updated[0].item.opcionesSeleccionadas === cart[0].item.opcionesSeleccionadas);
  equal(reconcileMenuCart(cart, id, { ...data, items: [] }), []);
});
