import { Link, type LinkProps } from 'react-router-dom';
import { useSiteJourney } from '../hooks/useSiteJourney';
import { horizontalJourneyScroller, visibleJourneyBounds } from '../lib/siteJourney';

export function RestaurantMotionLink({ restaurantId, image, onClick, onPointerDown, onFocus, ...props }: LinkProps & { restaurantId: string; image?: string | null }) {
  const { departRestaurant } = useSiteJourney();
  const layout = props.className?.includes('eats-mobile-row-card') ? 'mobile-row' : props.className?.includes('eats-mobile-restaurant-card') ? 'mobile-list' : 'desktop';
  const prepare = () => {
    if (props.target === '_blank' || props.download) return;
    const path = typeof props.to === 'string' ? props.to : props.to.pathname || '';
    const identifier = /^\/menu\/([a-z0-9-]+)\/?$/i.exec(path)?.[1];
    if (identifier) void import('../lib/publicMenuCatalog')
      .then(module => module.prefetchPublicMenu(identifier))
      .catch(() => console.warn('menu_prefetch_unavailable'));
  };
  return <Link {...props} data-restaurant-motion-card={restaurantId} data-restaurant-motion-layout={layout} onPointerDown={event => {
    onPointerDown?.(event);
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) prepare();
  }} onFocus={event => { onFocus?.(event); if (!event.defaultPrevented) prepare(); }} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank' || props.download || !image) return;
    const media = event.currentTarget.querySelector<HTMLImageElement>('img:not([aria-hidden="true"])');
    if (!media?.complete || !media.naturalWidth) return;
    const bounds = media && visibleJourneyBounds(media);
    if (bounds) departRestaurant({ id: restaurantId, image, bounds, listing: { layout, railLeft: horizontalJourneyScroller(event.currentTarget)?.scrollLeft || 0 } });
  }} />;
}
