import { Link, type LinkProps } from 'react-router-dom';
import { useSiteJourney } from '../hooks/useSiteJourney';
import { horizontalJourneyScroller, visibleJourneyBounds } from '../lib/siteJourney';

export function RestaurantMotionLink({ restaurantId, image, onClick, ...props }: LinkProps & { restaurantId: string; image?: string | null }) {
  const { departRestaurant } = useSiteJourney();
  const layout = props.className?.includes('eats-mobile-row-card') ? 'mobile-row' : props.className?.includes('eats-mobile-restaurant-card') ? 'mobile-list' : 'desktop';
  return <Link {...props} data-restaurant-motion-card={restaurantId} data-restaurant-motion-layout={layout} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank' || props.download || !image) return;
    const media = event.currentTarget.querySelector<HTMLImageElement>('img:not([aria-hidden="true"])');
    if (!media?.complete || !media.naturalWidth) return;
    const bounds = media && visibleJourneyBounds(media);
    if (bounds) departRestaurant({ id: restaurantId, image, bounds, listing: { layout, railLeft: horizontalJourneyScroller(event.currentTarget)?.scrollLeft || 0 } });
  }} />;
}
