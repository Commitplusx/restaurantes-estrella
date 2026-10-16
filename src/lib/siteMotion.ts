import { createContext } from 'react';
export interface SiteMotionPreference { enabled: boolean; toggle: () => void }
export const SiteMotionContext = createContext<SiteMotionPreference | null>(null);
export const SITE_EASE = [.16, 1, .3, 1] as const;
