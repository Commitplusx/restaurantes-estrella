import { PublicResource, PublicResourcePool, PUBLIC_MENU_POLICY } from '../src/lib/publicResource.ts';
function assert(condition: unknown): asserts condition { if (!condition) throw new Error('Expected condition'); }
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

Deno.test('return navigation reuses recent data with zero additional reads', async () => {
  let clock = 1000, reads = 0;
  const resource = new PublicResource(async () => { reads++; return ['restaurant-a']; }, PUBLIC_MENU_POLICY, () => clock);
  await resource.refresh();
  const first = resource.snapshot();
  for (let visit = 0; visit < 10; visit++) { clock += 1000; await resource.refresh(); equal(resource.visible(), ['restaurant-a']); }
  equal(reads, 1); equal(resource.snapshot(), first);
});
Deno.test('stale data stays visible while one shared request updates it', async () => {
  let clock = 1000, reads = 0;
  const response = deferred<string[]>();
  const resource = new PublicResource(() => ++reads === 1 ? Promise.resolve(['old']) : response.promise, PUBLIC_MENU_POLICY, () => clock);
  await resource.refresh(); clock += 20_001;
  const request = resource.refresh();
  assert(request === resource.refresh()); equal(resource.visible(), ['old']); assert(resource.snapshot().fetching);
  response.resolve(['new']); await request; equal(resource.visible(), ['new']); equal(reads, 2);
});
Deno.test('an invalidated in-flight result cannot overwrite the next server version', async () => {
  const old = deferred<string[]>(); let reads = 0;
  const resource = new PublicResource(() => ++reads === 1 ? old.promise : Promise.resolve(['new']));
  const request = resource.refresh(); resource.invalidate(); old.resolve(['obsolete']); await request;
  equal(resource.visible(), undefined);
  await resource.refresh(); equal(resource.visible(), ['new']); equal(reads, 2);
});
Deno.test('failed revalidation preserves recent data, exposes error and bounds automatic retry', async () => {
  let clock = 1000, reads = 0;
  const resource = new PublicResource(async () => {
    if (++reads > 1) throw new Error('network unavailable'); return ['recent'];
  }, PUBLIC_MENU_POLICY, () => clock);
  await resource.refresh(); clock += 20_001; await resource.refresh();
  equal(resource.visible(), ['recent']); equal(resource.snapshot().error?.message, 'network unavailable');
  for (let attempt = 0; attempt < 10; attempt++) await resource.refresh();
  equal(reads, 2);
  await resource.refresh(true); equal(reads, 3);
  clock += 120_000; await resource.refresh(); equal(resource.visible(), undefined);
});
Deno.test('request deadline releases an unresponsive loader and late success never revives it', async () => {
  const reply = deferred<string[]>(); let aborted = false;
  const resource = new PublicResource(signal => { signal.addEventListener('abort', () => { aborted = true; }); return reply.promise; }, { ...PUBLIC_MENU_POLICY, timeout: 5 });
  await resource.refresh(); assert(aborted); assert(!resource.snapshot().fetching); assert(resource.snapshot().error);
  reply.resolve(['too late']); await Promise.resolve(); equal(resource.visible(), undefined);
});
Deno.test('empty and missing results replace cached catalogues rather than masquerading as errors', async () => {
  let data: string[] | null = ['old'];
  const resource = new PublicResource(async () => data);
  await resource.refresh(); data = []; await resource.refresh(true); equal(resource.visible(), []);
  data = null; await resource.refresh(true); equal(resource.visible(), null); equal(resource.snapshot().error, null);
});
Deno.test('resources and LRU eviction isolate branches and cap inactive entries', async () => {
  const pool = new PublicResourcePool<string[]>(2);
  const create = (id: string) => new PublicResource(async () => [id]);
  const first = pool.get('a', () => create('a'));
  await first.refresh();
  const stop = first.subscribe(() => undefined);
  const second = pool.get('b', () => create('b')); await second.refresh();
  const third = pool.get('c', () => create('c')); await third.refresh();
  equal(pool.size, 2); assert(pool.get('a', () => create('wrong')) === first); equal(first.visible(), ['a']); equal(third.visible(), ['c']);
  assert(pool.get('b', () => create('b2')) !== second); equal(pool.size, 2); stop();
});
Deno.test('expired content is removed and announced even if no new fetch is possible', async () => {
  let clock = 1000, notifications = 0;
  const resource = new PublicResource(async () => ['old'], PUBLIC_MENU_POLICY, () => clock);
  await resource.refresh(); const stop = resource.subscribe(() => { notifications++; });
  clock += PUBLIC_MENU_POLICY.retainFor; resource.expire();
  equal(resource.snapshot().data, undefined); assert(resource.snapshot().error); equal(notifications, 1);
  resource.expire(); equal(notifications, 1); stop();
});
