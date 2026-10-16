import { useContext } from 'react';
import { SiteMotionContext } from '../lib/siteMotion';
export function useSiteMotion() {
  const preference = useContext(SiteMotionContext);
  if (!preference) throw new Error('SiteMotionProvider is required');
  return preference;
}
