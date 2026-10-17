import { useLayoutEffect, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { SiteMotionContext, SITE_MOTION_PREFERENCE } from '../lib/siteMotion';
import './siteMotion.css';
import { SiteJourneyProvider } from './SiteJourneyProvider';

export function SiteMotionProvider({ children }: { children: ReactNode }) {
  // Full motion is the product policy explicitly requested by Kaleb.
  useLayoutEffect(() => {
    const previous = document.body.dataset.eatsMotion;
    document.body.dataset.eatsMotion = 'full';
    return () => { if (previous) document.body.dataset.eatsMotion = previous; else delete document.body.dataset.eatsMotion; };
  }, []);
  return <SiteMotionContext.Provider value={SITE_MOTION_PREFERENCE}>
    <MotionConfig reducedMotion="never"><SiteJourneyProvider>{children}</SiteJourneyProvider></MotionConfig>
  </SiteMotionContext.Provider>;
}
