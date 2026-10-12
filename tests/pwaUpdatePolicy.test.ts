import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpdateProbe, isUpdateBlocked } from '../src/lib/pwaUpdatePolicy.ts';

test('updates cannot reload customer checkout or authentication forms', () => {
  for (const path of ['/menu/makitan/carrito', '/menu/global/carrito/', '/login', '/portal/perfil']) assert.equal(isUpdateBlocked(path), true);
  for (const path of ['/', '/beneficios', '/menu/makitan', '/tracker/123']) assert.equal(isUpdateBlocked(path), false);
});

test('checks skip offline, hidden and installing states, then throttle eligible attempts', async () => {
  let eligible = false;
  let installing = false;
  let time = 0;
  let calls = 0;
  const check = createUpdateProbe({ update: async () => { calls++; }, eligible: () => eligible,
    installing: () => installing, now: () => time, onError: () => assert.fail('unexpected update failure') });
  await check();
  eligible = true; installing = true;
  await check();
  assert.equal(calls, 0);
  installing = false;
  await check(); await check();
  assert.equal(calls, 1);
  time = 60_000;
  await check();
  assert.equal(calls, 2);
});

test('concurrent events share one check and failure remains observable and recoverable', async () => {
  let calls = 0;
  let errors = 0;
  let time = 0;
  let finish: (() => void) | undefined;
  const check = createUpdateProbe({ update: async () => {
    calls++;
    if (calls === 1) await new Promise<void>(resolve => { finish = resolve; });
    if (calls === 1) throw new Error('network unavailable');
  }, eligible: () => true, installing: () => false, now: () => time, onError: () => { errors++; } });
  const first = check();
  time = 60_000;
  await check();
  assert.equal(calls, 1);
  assert.ok(finish); finish();
  await first;
  assert.equal(errors, 1);
  await check();
  assert.equal(calls, 2);
});
