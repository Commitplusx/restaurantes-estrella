import { createContext } from 'react';
export interface SiteMotionPreference { readonly enabled: boolean }
export const SITE_MOTION_PREFERENCE: SiteMotionPreference = Object.freeze({ enabled: true });
export const SiteMotionContext = createContext<SiteMotionPreference | null>(null);
export const SITE_EASE = [.16, 1, .3, 1] as const;
