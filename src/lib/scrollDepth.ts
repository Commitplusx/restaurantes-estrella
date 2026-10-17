import { createContext } from 'react';
import type { MotionValue } from 'framer-motion';
import type { MediaLayout, ScrollSectionLayout } from './scrollGeometry';

export interface LocalScrollDepth {
  layout: MotionValue<ScrollSectionLayout>;
  active: MotionValue<boolean>;
  velocity: MotionValue<number>;
  register: (element: HTMLDivElement, bounds: MotionValue<MediaLayout>, visible: MotionValue<boolean>) => () => void;
}
export const ScrollDepthContext = createContext<{ progress: MotionValue<number>; distance: number; local?: LocalScrollDepth } | null>(null);
