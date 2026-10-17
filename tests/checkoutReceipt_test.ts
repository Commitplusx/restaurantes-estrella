import { shouldClearSubmittedCart } from '../src/lib/checkoutReceipt.ts';
const assert = (value: unknown) => { if (!value) throw new Error('Assertion failed'); };
const draft = [{item: {id: 'QA', opcionesSeleccionadas: ['Picante']}, cantidad: 2}];
Deno.test('checkout clears only the confirmed snapshot or its idempotent replay', () => {
  assert(shouldClearSubmittedCart({replayed: false}, draft, structuredClone(draft)));
  assert(shouldClearSubmittedCart({existing_order: true, replayed: true}, draft, structuredClone(draft)));
  assert(!shouldClearSubmittedCart({existing_order: true, replayed: false}, draft, draft));
  assert(!shouldClearSubmittedCart({replayed: false}, [{...draft[0], cantidad: 3}], draft));
  assert(!shouldClearSubmittedCart({replayed: true}, [], draft));
});
