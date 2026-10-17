import { createContext } from 'react';
import { validJourneyBounds, type JourneyBounds } from './journeyGeometry';

export type { JourneyBounds } from './journeyGeometry';
export interface RestaurantDeparture { id: string; image: string; bounds: JourneyBounds; listing?: { layout: string; railLeft: number } }
export interface SiteJourney {
  incomingRestaurantId: string | null;
  departRestaurant: (departure: RestaurantDeparture) => void;
  arriveRestaurant: (id: string, bounds: JourneyBounds) => void;
  addProduct: (image: string, bounds: JourneyBounds) => void;
}
export const SiteJourneyContext = createContext<SiteJourney | null>(null);

export function horizontalJourneyScroller(element: Element): HTMLElement | null {
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    if (parent.scrollWidth > parent.clientWidth + 1 && /^(auto|scroll)$/.test(getComputedStyle(parent).overflowX)) return parent;
    parent = parent.parentElement;
  }
  return null;
}

export function visibleJourneyBounds(element: Element): JourneyBounds | null {
  const bounds = element.getBoundingClientRect();
  if (!validJourneyBounds(bounds) || bounds.bottom <= 0 || bounds.top >= window.innerHeight
    || bounds.right <= 0 || bounds.left >= window.innerWidth) return null;
  return { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height };
}
