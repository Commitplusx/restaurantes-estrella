import { AddressLookupSession } from '../src/lib/addressLookupSession.ts';
import { AddressLookupError, type AddressRequest, type AddressResult } from '../src/lib/deliveryLocation.ts';

const config = { accessToken: 'pk.test.fixture', permanentGeocoding: true };
const point = { lat: 16.2516, lng: -92.1332 };
function response(address = 'Calle de prueba, Comitán'): Response {
  return Response.json({ type: 'FeatureCollection', features: [{ geometry: { type: 'Point', coordinates: [point.lng, point.lat] }, properties: {
    feature_type: 'street', mapbox_id: 'test-street', full_address: address, context: { country: { country_code: 'mx' } },
  } }] });
}
function assert(value: unknown): asserts value { if (!value) throw new Error('Expected condition'); }
function equal(actual: unknown, expected: unknown): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
function deferred() { let resolve!: (response: Response) => void; const promise = new Promise<Response>(done => { resolve = done; }); return { promise, resolve }; }
const settle = () => new Promise<void>(done => setTimeout(done, 0));
function clock() {
  const jobs: { task: () => void; active: boolean; delay: number }[] = [];
  return {
    schedule(task: () => void, delay: number) { const job = { task, delay, active: true }; jobs.push(job); return () => { job.active = false; }; },
    flush() { for (const job of jobs) if (job.active) { job.active = false; job.task(); } },
    jobs,
  };
}
function observer() {
  const results: AddressResult[][] = [], errors: unknown[] = [];
  return { results, errors, handlers: { result: (rows: AddressResult[]) => { results.push(rows); }, error: (error: unknown) => { errors.push(error); } } };
}

Deno.test('rapid pin/GPS selections make one debounced request for the final coordinates', async () => {
  const timer = clock(), seen = observer(), requests: URL[] = [];
  const fetcher: typeof fetch = async input => { assert(input instanceof URL); requests.push(input); return response(); };
  const session = new AddressLookupSession(config, fetcher, timer.schedule);
  for (const lat of [16.25, 16.251, 16.252]) session.lookup({ point: { ...point, lat } }, seen.handlers, 450);
  equal(requests.length, 0); equal(timer.jobs.filter(job => job.active).map(job => job.delay), [450]);
  timer.flush(); await settle();
  equal(requests.length, 1); equal(requests[0].searchParams.get('latitude'), '16.252'); equal(seen.results.length, 1);
});

Deno.test('a late response from the old pin cannot replace the address of the new pin', async () => {
  const first = deferred(), second = deferred(), seen = observer(), signals: AbortSignal[] = [];
  let calls = 0;
  const fetcher: typeof fetch = (_input, init) => { assert(init?.signal instanceof AbortSignal); signals.push(init.signal); return calls++ === 0 ? first.promise : second.promise; };
  const session = new AddressLookupSession(config, fetcher);
  session.lookup({ point }, seen.handlers);
  session.lookup({ point: { ...point, lat: point.lat + .001 } }, seen.handlers);
  assert(signals[0].aborted);
  second.resolve(response('Calle nueva, Comitán')); await settle();
  first.resolve(response('Calle anterior, Comitán')); await settle();
  equal(seen.results.map(rows => rows[0].address), ['Calle nueva, Comitán']); equal(seen.errors, []);
});

Deno.test('editing an address cancels the lookup even if the provider ignores the abort', async () => {
  const pending = deferred(); let address = 'Dirección escrita por el cliente';
  const fetcher: typeof fetch = () => pending.promise;
  const session = new AddressLookupSession(config, fetcher);
  session.lookup({ point }, { result: rows => { address = rows[0].address; }, error: () => { throw new Error('Cancelled request reported an error'); } });
  session.cancel(); pending.resolve(response()); await settle();
  equal(address, 'Dirección escrita por el cliente');
});

Deno.test('closing before the delay cancels the scheduled provider request', async () => {
  const timer = clock(), seen = observer(); let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return response(); };
  const session = new AddressLookupSession(config, fetcher, timer.schedule);
  session.lookup({ point }, seen.handlers, 450); session.cancel(); timer.flush(); await settle();
  equal(calls, 0); equal(seen.results, []); equal(seen.errors, []);
});

Deno.test('an already queued stale timer cannot start a provider request or disturb the current timer', async () => {
  const tasks: (() => void)[] = [], seen = observer(); let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return response(); };
  const session = new AddressLookupSession(config, fetcher, task => { tasks.push(task); return () => undefined; });
  session.lookup({ point }, seen.handlers, 450);
  session.lookup({ point: { ...point, lat: point.lat + .001 } }, seen.handlers, 450);
  tasks[0](); await settle(); equal(calls, 0);
  tasks[1](); await settle(); equal(calls, 1); equal(seen.results.length, 1);
});

Deno.test('forward search and reverse lookup share cancellation; no stale search list reappears', async () => {
  const pending = deferred(), seen = observer(); let calls = 0;
  const fetcher: typeof fetch = () => ++calls === 1 ? pending.promise : Promise.resolve(response('Calle del pin, Comitán'));
  const session = new AddressLookupSession(config, fetcher);
  const search: AddressRequest = { query: 'Calle de prueba', proximity: point };
  session.lookup(search, seen.handlers); session.lookup({ point }, seen.handlers); await settle();
  pending.resolve(response('Resultado de búsqueda anterior')); await settle();
  equal(seen.results.map(rows => rows[0].address), ['Calle del pin, Comitán']);
});

Deno.test('no street coverage remains an empty result instead of a fabricated address', async () => {
  const seen = observer();
  const fetcher: typeof fetch = async () => Response.json({ type: 'FeatureCollection', features: [] });
  new AddressLookupSession(config, fetcher).lookup({ point }, seen.handlers); await settle();
  equal(seen.results, [[]]); equal(seen.errors, []);
});

Deno.test('provider failure is visible once; only a new explicit selection starts another request', async () => {
  const seen = observer(); let calls = 0;
  const fetcher: typeof fetch = async () => ++calls === 1 ? new Response('provider body', { status: 429 }) : response();
  const session = new AddressLookupSession(config, fetcher);
  session.lookup({ point }, seen.handlers); await settle();
  equal(calls, 1); equal(seen.results, []); assert(seen.errors[0] instanceof AddressLookupError);
  session.lookup({ point }, seen.handlers); await settle(); equal(calls, 2); equal(seen.results.length, 1);
});
