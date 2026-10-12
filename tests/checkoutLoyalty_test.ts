import { currentLoyalty, isLoyaltyPhone, parseLoyaltyResult } from '../src/lib/checkoutLoyalty.ts';

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Loyalty contract mismatch');
}
const row = { puntos: 6, rango: 'bronce', es_vip: false, saldo_billetera: 0,
  envios_gratis_disponibles: 1, nombre: 'Cliente de prueba' };

Deno.test('a missing customer is distinct from a failed lookup', () => {
  equal(parseLoyaltyResult(null, null), { status: 'not-found' });
  equal(parseLoyaltyResult(null, { code: 'PGRST116' }), { status: 'error' });
  equal(parseLoyaltyResult(row, { code: '42501' }), { status: 'error' });
});
Deno.test('existing customers preserve points and free deliveries', () => {
  equal(parseLoyaltyResult(row, null), { status: 'found', customer: {
    es_vip: false, saldo: 0, puntos: 6, envios_gratis: 1, nombre: row.nombre,
  } });
});
Deno.test('nullable database defaults and numeric balances are validated', () => {
  equal(parseLoyaltyResult({ ...row, puntos: null, envios_gratis_disponibles: null, es_vip: null, saldo_billetera: '12.50' }, null),
    { status: 'found', customer: { es_vip: false, saldo: 12.5, puntos: 0, envios_gratis: 0, nombre: row.nombre } });
});
Deno.test('either existing VIP indicator is preserved', () => {
  for (const vip of [{ ...row, rango: 'vip' }, { ...row, es_vip: true }]) {
    equal(parseLoyaltyResult(vip, null).status, 'found');
    const result = parseLoyaltyResult(vip, null);
    if (result.status !== 'found') throw new Error('VIP lookup failed');
    equal(result.customer.es_vip, true);
  }
});
Deno.test('invalid payloads, arrays and duplicate rows never become zero points', () => {
  for (const invalid of [undefined, {}, [], [row], [row, row],
    { ...row, puntos: -1 }, { ...row, puntos: 1.5 }, { ...row, envios_gratis_disponibles: 'invalid' },
    { ...row, saldo_billetera: Infinity }, { ...row, es_vip: 'true' }, { ...row, nombre: null }]) {
    equal(parseLoyaltyResult(invalid, null), { status: 'error' });
  }
});
Deno.test('only a complete local phone can request loyalty', () => {
  equal(isLoyaltyPhone('5550000001'), true);
  for (const invalid of ['', '555000000', '525550000001', '555-000-0001', 'abcdefghij']) equal(isLoyaltyPhone(invalid), false);
});
Deno.test('switching phone immediately hides the previous customer and benefits', () => {
  const snapshot = { key: { phone: '5550000001', attempt: 0 }, result: parseLoyaltyResult(row, null) };
  equal(currentLoyalty('5550000002', { phone: '5550000002', attempt: 0 }, snapshot), { status: 'loading' });
  equal(currentLoyalty('555', { phone: '555', attempt: 0 }, snapshot), { status: 'idle' });
  equal(currentLoyalty('5550000001', snapshot.key, snapshot), snapshot.result);
});
Deno.test('retrying hides the previous error until the new response arrives', () => {
  const snapshot = { key: { phone: '5550000001', attempt: 0 }, result: parseLoyaltyResult(null, new Error('Network unavailable')) };
  equal(currentLoyalty('5550000001', { phone: '5550000001', attempt: 1 }, snapshot), { status: 'loading' });
  equal(currentLoyalty('5550000001', snapshot.key, snapshot), { status: 'error' });
});
Deno.test('returning to an earlier phone waits for a fresh lookup instead of reusing its old points', () => {
  const key = { phone: '5550000001', attempt: 0 };
  const snapshot = { key, result: parseLoyaltyResult(row, null) };
  equal(currentLoyalty(key.phone, { ...key }, snapshot), { status: 'loading' });
});
