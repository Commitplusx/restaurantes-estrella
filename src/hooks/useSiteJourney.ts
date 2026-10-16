import { useContext } from 'react';
import { SiteJourneyContext } from '../lib/siteJourney';

export function useSiteJourney() {
  const journey = useContext(SiteJourneyContext);
  if (!journey) throw new Error('SiteJourneyProvider is required.');
  return journey;
}
