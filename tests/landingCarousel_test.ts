import { carouselPosition, carouselMove, prepareCarouselImage } from '../src/lib/landingCarousel.ts';
function assert(value: unknown): asserts value { if (!value) throw new Error('Expected condition'); }
Deno.test('a refreshed or reordered campaign list preserves the selected identity', () => {
  assert(carouselPosition(['banner:b', 'banner:a', 'discovery'], 'banner:a') === 1);
  assert(carouselPosition(['banner:new', 'banner:b', 'banner:a', 'discovery'], 'banner:a') === 2);
});
Deno.test('initial and removed campaigns select the first current slide; an empty list still has discovery', () => {
  assert(carouselPosition(['banner:a', 'discovery'], null) === 0);
  assert(carouselPosition(['banner:b', 'discovery'], 'banner:removed') === 0);
  assert(carouselPosition(['discovery'], 'banner:removed') === 0);
});
Deno.test('both directions wrap correctly with one or several slides', () => {
  const keys = ['banner:a', 'banner:b', 'discovery'];
  assert(carouselMove(keys, 0, -1) === 'discovery');
  assert(carouselMove(keys, 2, 1) === 'banner:a');
  assert(carouselMove(['discovery'], 0, 1) === 'discovery');
  assert(carouselMove([], 0, 1) === null);
});
Deno.test('image preparation covers each manual neighbour and never prepares more than three', () => {
  for (let count = 1; count <= 6; count++) for (let active = 0; active < count; active++) {
    const prepared = Array.from({ length: count }, (_, index) => index).filter(index => prepareCarouselImage(index, active, count));
    assert(prepared.length <= 3 && prepared.includes(active));
    assert(prepared.includes((active + 1) % count));
    assert(prepared.includes((active + count - 1) % count));
  }
  assert(!prepareCarouselImage(-1, 0, 6) && !prepareCarouselImage(6, 0, 6));
});
