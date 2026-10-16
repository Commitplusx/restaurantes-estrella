import { createContext } from 'react';
import type { MotionValue } from 'framer-motion';
export const ScrollDepthContext = createContext<{ progress: MotionValue<number>; distance: number } | null>(null);
