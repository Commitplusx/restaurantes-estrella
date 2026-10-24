import { useEffect, useSyncExternalStore } from 'react';
import { PublicResource } from '../lib/publicResource';

export function usePublicResource<T>(resource: PublicResource<T>) {
  const snapshot = useSyncExternalStore(resource.subscribe, resource.snapshot);
  useEffect(() => {
    const refresh = () => {
      resource.expire();
      if (document.visibilityState === 'visible' && navigator.onLine !== false) void resource.refresh();
    };
    void resource.refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, Math.max(60_000, resource.policy.freshFor));
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [resource]);
  return {
    ...snapshot,
    data: resource.visible(),
    loading: resource.visible() === undefined && snapshot.error === null,
    refresh: () => resource.refresh(true),
  };
}
