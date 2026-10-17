export interface MediaLayout { top: number; width: number; height: number }
export interface ScrollSectionLayout { height: number; viewport: number }

export function mediaViewportProgress(progress: number, section: ScrollSectionLayout, media: MediaLayout): number {
  if (![progress, section.height, section.viewport, media.top, media.height].every(Number.isFinite)
    || section.viewport <= 0 || section.height <= 0 || media.height <= 0) return .5;
  return Math.max(0, Math.min(1, (progress * (section.height + section.viewport) - media.top) / (section.viewport + media.height)));
}

/** Reserve travel space inside the photograph; the complete source image stays visible. */
export function mediaTravelBudget(media: MediaLayout, requested: number, pointer: number) {
  if (![media.width, media.height, requested, pointer].every(Number.isFinite) || media.width < 8 || media.height < 8) {
    return { travel: 0, pointer: 0, insetX: 0, insetY: 0 };
  }
  const safePointer = Math.min(Math.max(pointer, 0), media.width * .035, media.height * .025, 4);
  const travel = Math.min(Math.max(requested, 0), media.height * .075, 18);
  return { travel, pointer: safePointer, insetX: safePointer + 2, insetY: travel + safePointer + 2 };
}

export function cinematicTravel(progress: number, travel: number): number {
  if (!Number.isFinite(progress) || !Number.isFinite(travel) || travel <= 0) return 0;
  return Math.sin((Math.max(0, Math.min(1, progress)) - .5) * Math.PI) * travel;
}
