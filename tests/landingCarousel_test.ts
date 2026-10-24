import { carouselPosition, carouselMove, startCarouselTransition, finishCarouselTransition, type CarouselSlide, type CarouselSelection } from '../src/lib/landingCarousel.ts';
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
Deno.test('rapid gestures replace the outgoing snapshot rather than accumulating image planes', () => {
  const first: CarouselSlide = { key: 'banner:a', banner: { id: 'a', titulo: 'A', imagen_url: '/a.webp' } };
  const second: CarouselSlide = { key: 'banner:b', banner: { id: 'b', titulo: 'B', imagen_url: '/b.webp' } };
  const initial: CarouselSelection = { key: first.key, direction: 1, previous: null, revision: 0 };
  const enteringSecond = startCarouselTransition(initial, first, second.key, 1);
  assert(enteringSecond.previous === first && enteringSecond.revision === 1);
  const interrupted = startCarouselTransition(enteringSecond, second, 'discovery', 1);
  assert(interrupted.previous === second && interrupted.revision === 2);
  assert(finishCarouselTransition(interrupted, enteringSecond.revision) === interrupted);
  const settled = finishCarouselTransition(interrupted, interrupted.revision);
  assert(settled.previous === null && settled.key === 'discovery');
});
Deno.test('reverse navigation keeps its direction and unchanged selection starts no extra animation', () => {
  const current: CarouselSlide = { key: 'discovery' };
  const initial: CarouselSelection = { key: current.key, direction: 1, previous: null, revision: 3 };
  assert(startCarouselTransition(initial, current, current.key, -1) === initial);
  const reversed = startCarouselTransition(initial, current, 'banner:a', -1);
  assert(reversed.direction === -1 && reversed.previous === current && reversed.revision === 4);
});
