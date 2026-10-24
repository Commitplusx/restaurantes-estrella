import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { backendRestricted } from '../lib/backendAvailability';
import { cachedLandingCatalog, catalogPage, invalidateLandingCatalog, landingCategories, landingPromotions, landingCoupons, landingBanners } from '../lib/publicLandingCatalog';

export function useLandingCatalog() {
  const [state, setState] = useState(cachedLandingCatalog);
  const [catalogError, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const appliedAttempt = useRef(0);
  const failedPage = useRef<number | null>(null);
  useEffect(() => {
    let active = true;
    const resources = Array.from({ length: Math.max(state.page, failedPage.current ?? 0) + 1 }, (_, index) => catalogPage(index));
    const sync = () => {
      if (!active) return;
      if (failedPage.current !== null) {
        const failed = catalogPage(failedPage.current);
        if (failed.visible() !== undefined && !failed.snapshot().error) failedPage.current = null;
      }
      setState(cachedLandingCatalog());
      const error = [...resources, ...(failedPage.current === null ? [] : [catalogPage(failedPage.current)])]
        .map(resource => resource.snapshot().error).find(Boolean);
      setError(error?.message || '');
      setBusy(resources.some(resource => resource.snapshot().fetching));
    };
    const unsubscribe = resources.map(resource => resource.subscribe(sync));
    const refresh = (force = false) => {
      resources.forEach(resource => resource.expire());
      if (!force && (document.hidden || navigator.onLine === false)) return;
      // Page ranges can move when a restaurant is added/deleted: revalidate all
      // loaded ranges together; the parser and assembled snapshot deduplicate IDs.
      void Promise.all(resources.map(resource => resource.refresh(force))).then(sync);
    };
    const force = appliedAttempt.current !== attempt;
    appliedAttempt.current = attempt;
    void Promise.all(resources.map(resource => resource.refresh(force))).then(sync);
    const onResume = () => refresh();
    window.addEventListener('focus', onResume);
    window.addEventListener('online', onResume);
    document.addEventListener('visibilitychange', onResume);
    const timer = window.setInterval(onResume, 60_000);
    sync();
    const channel = backendRestricted() ? null : supabase.channel('public:landing_catalog_cached')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurantes' }, () => {
        if (!active) return;
        invalidateLandingCatalog(); landingCategories.invalidate(); landingPromotions.invalidate();
        void Promise.all(resources.map(resource => resource.refresh())).then(() => refresh());
        void landingCategories.refresh(); void landingPromotions.refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_promociones' }, () => {
        if (!active) return;
        landingPromotions.invalidate(); void landingPromotions.refresh().then(() => landingPromotions.refresh());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cupones_plataforma' }, () => {
        if (!active) return;
        landingCoupons.invalidate(); void landingCoupons.refresh().then(() => landingCoupons.refresh());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_banners' }, () => {
        if (!active) return;
        landingBanners.invalidate(); void landingBanners.refresh().then(() => landingBanners.refresh());
      }).subscribe();
    return () => {
      active = false; unsubscribe.forEach(stop => stop()); clearInterval(timer);
      window.removeEventListener('focus', onResume); window.removeEventListener('online', onResume);
      document.removeEventListener('visibilitychange', onResume);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [state.page, attempt]);
  const loadMore = useCallback(async () => {
    if (busy || !state.hasMore || state.page >= 9) return;
    setBusy(true);
    const next = catalogPage(state.page + 1);
    await next.refresh();
    failedPage.current = next.snapshot().error ? state.page + 1 : null;
    setState(cachedLandingCatalog());
    setError(next.snapshot().error?.message || '');
    setBusy(false);
  }, [busy, state.hasMore, state.page]);
  return {
    restaurantes: [...new Map(state.restaurants.map(row => [row.id, row])).values()],
    loading: !state.available && !catalogError,
    loadingMore: busy,
    catalogError,
    hasMore: state.hasMore,
    loadMore,
    retry: () => setAttempt(value => value + 1),
  };
}
