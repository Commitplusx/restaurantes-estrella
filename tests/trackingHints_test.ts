import { createTrackingHints } from '../src/lib/trackingHints.ts';
const assert = (value: unknown) => { if (!value) throw new Error('Assertion failed'); };
const tick = () => new Promise<void>(resolve => queueMicrotask(resolve));

Deno.test('home and floating tracker share one channel until the last release', async () => {
  let connects = 0, stops = 0, first = 0, second = 0;
  const emitters: (() => void)[] = [];
  const watch = createTrackingHints((_topic, changed) => {
    connects++; emitters.push(changed);
    return () => { stops++; return Promise.resolve(); };
  }, () => { throw new Error('Unexpected connection failure'); });
  const releaseFirst = watch('same', () => { first++; });
  const releaseSecond = watch('same', () => { second++; });
  assert(connects === 1); emitters[0](); assert(first === 1 && second === 1);
  releaseFirst(); releaseFirst(); await tick();
  emitters[0](); assert(first === 1 && second === 2 && stops === 0);
  releaseSecond(); await tick(); assert(stops === 1);
});

Deno.test('remount while unsubscribe is pending waits before reconnecting', async () => {
  let connects = 0, finish = () => {};
  const watch = createTrackingHints(() => {
    connects++;
    return () => new Promise<void>(resolve => { finish = resolve; });
  }, () => {});
  const release = watch('same', () => {});
  release(); await tick();
  const releaseNext = watch('same', () => {});
  assert(connects === 1); finish(); await tick(); assert(connects === 2);
  releaseNext(); await tick(); finish(); await tick();
});

Deno.test('StrictMode cleanup and immediate remount reuse the channel', async () => {
  let connects = 0, stops = 0;
  const watch = createTrackingHints(() => {
    connects++; return () => { stops++; return Promise.resolve(); };
  }, () => {});
  watch('same', () => {})();
  const release = watch('same', () => {});
  await tick(); assert(connects === 1 && stops === 0);
  release(); await tick();
});
