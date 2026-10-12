import { parseDeliveryPrice, quoteForLocation } from '../src/lib/deliveryQuote.ts';
import type { DeliveryQuote } from '../src/lib/deliveryQuote.ts';

const point = { lat: 16.2516, lng: -92.1332 };
const quote: DeliveryQuote = { key: `${point.lat},${point.lng}`, price: 40, outsideCoverage: false, loading: false };
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Invalid delivery quote state');
}
Deno.test('missing or malformed tariffs cannot be mistaken for an explicit free-delivery price', () => {
  for (const value of [null, undefined, '', ' ', -1, 'invalid', NaN, Infinity, {}, true]) equal(parseDeliveryPrice(value), null);
  equal(parseDeliveryPrice(0), 0);
  equal(parseDeliveryPrice('40.50'), 40.5);
});
Deno.test('changing the delivery pin immediately invalidates the old price before the effect runs', () => {
  equal(quoteForLocation({ ...point, lat: 16.24 }, true, quote),
    { costoEnvioBase: 0, fueraDeCobertura: false, calculandoEnvio: true });
});
Deno.test('matching quote may be used only after loading finishes', () => {
  equal(quoteForLocation(point, true, quote),
    { costoEnvioBase: 40, fueraDeCobertura: false, calculandoEnvio: false });
  equal(quoteForLocation(point, true, { ...quote, price: 0, loading: true }),
    { costoEnvioBase: 0, fueraDeCobertura: false, calculandoEnvio: true });
});
Deno.test('pickup and an unselected location never inherit a delivery charge', () => {
  for (const result of [quoteForLocation(point, false, quote), quoteForLocation(null, true, quote)]) {
    equal(result, { costoEnvioBase: 0, fueraDeCobertura: false, calculandoEnvio: false });
  }
});
Deno.test('failed or uncovered lookup stays unavailable instead of becoming a free confirmed delivery', () => {
  equal(quoteForLocation(point, true, { ...quote, price: 0, outsideCoverage: true }),
    { costoEnvioBase: 0, fueraDeCobertura: true, calculandoEnvio: false });
  equal(quoteForLocation(point, true, null),
    { costoEnvioBase: 0, fueraDeCobertura: false, calculandoEnvio: true });
});
