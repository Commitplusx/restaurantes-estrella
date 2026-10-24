import {
  AddressLookupError, canConfirmLocation, isDeliveryCoordinates, isPublicMapboxToken,
  parseAddressResults, readSavedCoordinates, requestAddresses,
} from '../src/lib/deliveryLocation.ts';
import type { MapboxAddressConfig } from '../src/lib/deliveryLocation.ts';

function assert(condition: boolean, message = 'Location contract failed'): asserts condition {
  if (!condition) throw new Error(message);
}
function equal(actual: unknown, expected: unknown) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), 'Unexpected location result');
}
async function rejects(operation: () => unknown | Promise<unknown>, expected?: string) {
  try { await operation(); } catch (error: unknown) {
    if (expected) assert(error instanceof AddressLookupError && error.message.includes(expected));
    return;
  }
  throw new Error('Expected rejection');
}
const config: MapboxAddressConfig = { accessToken: 'pk.test.fixture', permanentGeocoding: true };
const point = { lat: 16.2516, lng: -92.1332 };
const feature = {
  type: 'Feature', geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
  properties: { mapbox_id: 'test-location', feature_type: 'address', full_address: '1a Calle Sur 10, Comitán, Chiapas',
    context: { country: { country_code: 'MX' } } },
};
const body = { type: 'FeatureCollection', features: [feature] };

Deno.test('coordinates accept zero but reject swapped Mexico coordinates, strings and non-finite values', () => {
  assert(isDeliveryCoordinates({ lat: 0, lng: 0 }));
  for (const value of [null, [], {}, { lat: point.lng, lng: point.lat }, { lat: '16', lng: -92 },
    { lat: Infinity, lng: 0 }, { lat: NaN, lng: 0 }, { lat: 0, lng: 181 }]) assert(!isDeliveryCoordinates(value));
});
Deno.test('corrupt saved coordinates cannot crash checkout or become a delivery pin', () => {
  for (const saved of [null, '', '{', 'null', '[]', '{"lat":91,"lng":0}']) equal(readSavedCoordinates(saved), null);
  equal(readSavedCoordinates(JSON.stringify(point)), point);
});
Deno.test('confirmation requires both a selected pin and a bounded nonempty street address', () => {
  assert(!canConfirmLocation(null, 'Calle Sur 10'));
  assert(!canConfirmLocation(point, '   '));
  assert(!canConfirmLocation(point, 'x'.repeat(301)));
  assert(canConfirmLocation(point, ' Calle Sur 10 '));
});
Deno.test('public token boundary rejects secret and malformed tokens', () => {
  assert(isPublicMapboxToken(config.accessToken));
  for (const token of ['', 'sk.secret.fixture', 'pk.', 'pk.test?x=y', 'pk.test\n']) assert(!isPublicMapboxToken(token));
});
Deno.test('provider coordinates are converted from longitude/latitude and duplicates removed', () => {
  equal(parseAddressResults({ ...body, features: [feature, feature] }),
    [{ id: 'test-location', ...point, address: feature.properties.full_address }]);
});
Deno.test('invalid features and results outside Mexico cannot become a selected address', () => {
  equal(parseAddressResults({ ...body, features: [null, {},
    { ...feature, geometry: { type: 'Point', coordinates: [point.lat, point.lng] } },
    { ...feature, properties: { ...feature.properties, feature_type: 'place' } },
    { ...feature, properties: { ...feature.properties, context: { country: { country_code: 'US' } } } },
  ] }), []);
});
Deno.test('invalid and oversized collections reject without fabricating success', async () => {
  await rejects(() => parseAddressResults({ features: [] }));
  await rejects(() => parseAddressResults({ ...body, features: Array(6).fill(feature) }));
});
Deno.test('temporary mode and secret tokens never issue address requests', async () => {
  let calls = 0;
  const fetcher: typeof fetch = () => { calls += 1; return Promise.resolve(Response.json(body)); };
  for (const invalid of [{ ...config, permanentGeocoding: false }, { ...config, accessToken: 'sk.test.fixture' }]) {
    await rejects(() => requestAddresses(invalid, { point }, new AbortController().signal, fetcher));
  }
  equal(calls, 0);
});
Deno.test('forward search uses permanent storage, Mexico, Spanish and one explicit request', async () => {
  let calls = 0;
  const fetcher: typeof fetch = (input, init) => {
    calls += 1;
    assert(input instanceof URL);
    equal(input.pathname, '/search/geocode/v6/forward');
    equal(input.searchParams.get('q'), 'Calle Sur 10');
    equal(input.searchParams.get('permanent'), 'true');
    equal(input.searchParams.get('limit'), '5');
    equal(input.searchParams.get('autocomplete'), 'false');
    equal(input.searchParams.get('country'), 'mx');
    equal(input.searchParams.get('language'), 'es');
    equal(input.searchParams.get('types'), 'address,street');
    equal(input.searchParams.get('proximity'), `${point.lng},${point.lat}`);
    equal(init?.cache, 'no-store');
    assert(init?.signal instanceof AbortSignal);
    return Promise.resolve(Response.json(body));
  };
  const result = await requestAddresses(config, { query: ' Calle Sur 10 ', proximity: point }, new AbortController().signal, fetcher);
  equal(result[0]?.lat, point.lat);
  equal(calls, 1);
});
Deno.test('reverse lookup preserves latitude/longitude and requests permanent results', async () => {
  const fetcher: typeof fetch = input => {
    assert(input instanceof URL);
    equal(input.pathname, '/search/geocode/v6/reverse');
    equal(input.searchParams.get('longitude'), String(point.lng));
    equal(input.searchParams.get('latitude'), String(point.lat));
    equal(input.searchParams.get('permanent'), 'true');
    equal(input.searchParams.get('types'), 'address,street');
    assert(!input.searchParams.has('limit'), 'Reverse lookup must not combine multiple types with an explicit limit');
    return Promise.resolve(Response.json(body));
  };
  equal((await requestAddresses(config, { point }, new AbortController().signal, fetcher)).length, 1);
});
Deno.test('invalid searches are rejected before the provider is called', async () => {
  let calls = 0;
  const fetcher: typeof fetch = () => { calls += 1; return Promise.resolve(Response.json(body)); };
  for (const query of ['', 'aa', 'x'.repeat(257), 'Calle;Sur']) {
    await rejects(() => requestAddresses(config, { query, proximity: point }, new AbortController().signal, fetcher));
  }
  equal(calls, 0);
});
Deno.test('provider denial, rate limits and failures are visible and never retried automatically', async () => {
  let calls = 0;
  for (const status of [401, 403, 429, 502]) {
    const fetcher: typeof fetch = () => { calls += 1; return Promise.resolve(new Response('private provider body', { status })); };
    await rejects(() => requestAddresses(config, { point }, new AbortController().signal, fetcher),
      status === 429 ? 'ocupada' : status === 502 ? 'No pudimos' : 'no está disponible');
  }
  equal(calls, 4);
});
Deno.test('cancellation reaches the provider request without a hidden retry', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  const fetcher: typeof fetch = (_input, init) => {
    calls += 1;
    assert(init?.signal instanceof AbortSignal && init.signal.aborted);
    return Promise.reject(new DOMException('Cancelled', 'AbortError'));
  };
  await rejects(() => requestAddresses(config, { point }, controller.signal, fetcher));
  equal(calls, 1);
});
