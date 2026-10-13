import type { DeliveryCoordinates } from './deliveryLocation';

export interface TrackingRoute {
  geometry: {type: 'LineString'; coordinates: [number, number][]};
  durationSeconds: number;
}
function point(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number'
    && Number.isFinite(value[0]) && Number.isFinite(value[1]) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_route');
  return Object.fromEntries(Object.entries(value));
}
export function parseTrackingRoute(value: unknown): TrackingRoute {
  const response = object(value);
  if (response.code !== 'Ok' || !Array.isArray(response.routes) || !response.routes.length) throw new Error('route_unavailable');
  const route = object(response.routes[0]), geometry = object(route.geometry);
  if (geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2
    || geometry.coordinates.length > 20000 || !geometry.coordinates.every(point)
    || typeof route.duration !== 'number' || !Number.isFinite(route.duration) || route.duration < 0) throw new Error('invalid_route');
  return {geometry: {type: 'LineString', coordinates: geometry.coordinates}, durationSeconds: route.duration};
}
export function trackingRouteUrl(from: DeliveryCoordinates, to: DeliveryCoordinates, token: string): string {
  if (!point([from.lng, from.lat]) || !point([to.lng, to.lat]) || !token.startsWith('pk.')) throw new Error('invalid_route_input');
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}`);
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('access_token', token);
  return url.toString();
}
