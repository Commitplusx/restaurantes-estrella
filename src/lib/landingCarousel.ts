import type { LandingBanner } from './landingBanner';

/** Keep the same campaign selected when public refresh adds or reorders banners. */
export function carouselPosition(keys: readonly string[], selected: string | null): number {
  const position = selected === null ? -1 : keys.indexOf(selected);
  return position < 0 ? 0 : position;
}
export function carouselMove(keys: readonly string[], current: number, direction: number): string | null {
  if (!keys.length) return null;
  return keys[((current + direction) % keys.length + keys.length) % keys.length];
}
export type CarouselSlide = { key: string; banner: LandingBanner } | { key: 'discovery'; banner?: never };
export type CarouselDirection = -1 | 1;
export interface CarouselSelection { key: string | null; direction: CarouselDirection; previous: CarouselSlide | null; revision: number }

/** One outgoing snapshot only, including when another gesture interrupts it. */
export function startCarouselTransition(selection: CarouselSelection, current: CarouselSlide, nextKey: string, direction: CarouselDirection): CarouselSelection {
  return current.key === nextKey ? selection : { key: nextKey, direction, previous: current, revision: selection.revision + 1 };
}
/** A completed older animation cannot clear the currently outgoing plane. */
export function finishCarouselTransition(selection: CarouselSelection, revision: number): CarouselSelection {
  return selection.revision === revision && selection.previous ? { ...selection, previous: null } : selection;
}
