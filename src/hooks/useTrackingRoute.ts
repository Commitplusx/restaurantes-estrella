import {useEffect, useRef, useState} from 'react';
import type {DeliveryCoordinates} from '../lib/deliveryLocation';
import {parseTrackingRoute, trackingRouteUrl} from '../lib/trackingRoute';
import type {TrackingRoute} from '../lib/trackingRoute';
import {isPublicMapboxToken} from '../lib/deliveryLocation';

export function useTrackingRoute(active: boolean, from: DeliveryCoordinates | null, to: DeliveryCoordinates | null) {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() || '';
  const lastStarted = useRef(0);
  const [result, setResult] = useState<{destinationKey: string; route: TrackingRoute} | null>(null);
  const fromLat = from?.lat, fromLng = from?.lng, toLat = to?.lat, toLng = to?.lng;
  const destinationKey = `${toLat}:${toLng}`;
  useEffect(() => {
    if (!active || fromLat === undefined || fromLng === undefined || toLat === undefined || toLng === undefined || !isPublicMapboxToken(token)) {lastStarted.current = 0; return;}
    let alive = true;
    const controller = new AbortController();
    // Trailing refresh keeps the latest coordinates without requesting every GPS update.
    const timeout = window.setTimeout(() => {
      lastStarted.current = Date.now();
      void fetch(trackingRouteUrl({lat:fromLat,lng:fromLng}, {lat:toLat,lng:toLng}, token), {signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)])})
        .then(async response => {
          if (!response.ok) throw new Error('route_unavailable');
          const value: unknown = await response.json();
          const next = parseTrackingRoute(value);
          if (alive) setResult({destinationKey,route:next});
        }).catch(() => {if (alive) setResult(null);});
    }, Math.max(0, lastStarted.current + 30000 - Date.now()));
    return () => {alive = false; window.clearTimeout(timeout); controller.abort();};
  }, [active, fromLat, fromLng, toLat, toLng, token, destinationKey]);
  return active && from && to && result?.destinationKey === destinationKey ? result.route : null;
}
