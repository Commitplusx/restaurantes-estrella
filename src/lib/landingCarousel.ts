/** Keep the same campaign selected when public refresh adds or reorders banners. */
export function carouselPosition(keys: readonly string[], selected: string | null): number {
  const position = selected === null ? -1 : keys.indexOf(selected);
  return position < 0 ? 0 : position;
}
export function carouselMove(keys: readonly string[], current: number, direction: number): string | null {
  if (!keys.length) return null;
  return keys[((current + direction) % keys.length + keys.length) % keys.length];
}
/** Prepare the current image and its two neighbours, regardless of banner count. */
export function prepareCarouselImage(position: number, current: number, count: number): boolean {
  if (count < 1 || position < 0 || position >= count) return false;
  const distance = Math.abs(position - current);
  return distance <= 1 || distance === count - 1;
}
