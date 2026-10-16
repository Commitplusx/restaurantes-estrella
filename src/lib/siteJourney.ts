import { createContext } from 'react';

export interface JourneyBounds { left: number; top: number; width: number; height: number }
export interface RestaurantDeparture { id: string; image: string; bounds: JourneyBounds }
export interface SiteJourney {
  incomingRestaurantId: string | null;
  departRestaurant: (departure: RestaurantDeparture) => void;
  arriveRestaurant: (id: string, bounds: JourneyBounds) => void;
  addProduct: (image: string, bounds: JourneyBounds) => void;
}
export const SiteJourneyContext = createContext<SiteJourney | null>(null);

export function visibleJourneyBounds(element: Element): JourneyBounds | null {
  const bounds = element.getBoundingClientRect();
  if (bounds.width < 1 || bounds.height < 1 || bounds.bottom <= 0 || bounds.top >= window.innerHeight
    || bounds.right <= 0 || bounds.left >= window.innerWidth) return null;
  return { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height };
}
