import { Link, type LinkProps } from 'react-router-dom';
import { useSiteJourney } from '../hooks/useSiteJourney';
import { visibleJourneyBounds } from '../lib/siteJourney';

export function RestaurantMotionLink({ restaurantId, image, onClick, ...props }: LinkProps & { restaurantId: string; image?: string | null }) {
  const { departRestaurant } = useSiteJourney();
  return <Link {...props} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !image) return;
    const media = event.currentTarget.querySelector('img:not([aria-hidden="true"])');
    const bounds = media && visibleJourneyBounds(media);
    if (bounds) departRestaurant({ id: restaurantId, image, bounds });
  }} />;
}
