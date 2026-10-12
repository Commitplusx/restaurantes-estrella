export interface DeliveryCoordinates {
  lat: number;
  lng: number;
}

export interface DeliveryLocation extends DeliveryCoordinates {
  address: string;
}

export interface AddressResult extends DeliveryLocation {
  id: string;
}

export interface MapboxAddressConfig {
  accessToken: string;
  permanentGeocoding: boolean;
}

export class AddressLookupError extends Error {}

export function isDeliveryCoordinates(value: unknown): value is DeliveryCoordinates {
  if (typeof value !== 'object' || value === null) return false;
  if (!('lat' in value) || !('lng' in value)) return false;
  return typeof value.lat === 'number' && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90
    && typeof value.lng === 'number' && Number.isFinite(value.lng) && Math.abs(value.lng) <= 180;
}

export function readSavedCoordinates(saved: string | null): DeliveryCoordinates | null {
  if (!saved) return null;
  try {
    const value: unknown = JSON.parse(saved);
    return isDeliveryCoordinates(value) ? { lat: value.lat, lng: value.lng } : null;
  } catch {
    return null;
  }
}

export function canConfirmLocation(point: DeliveryCoordinates | null, address: string): boolean {
  return isDeliveryCoordinates(point) && address.trim().length >= 5 && address.trim().length <= 300;
}

export function isPublicMapboxToken(value: string): boolean {
  return /^pk\.[A-Za-z0-9._-]+$/.test(value);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAddressResults(value: unknown): AddressResult[] {
  if (!record(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    throw new AddressLookupError('No pudimos leer la respuesta de direcciones. Intenta de nuevo.');
  }
  if (value.features.length > 5) throw new AddressLookupError('La búsqueda devolvió una respuesta inesperada.');
  const results: AddressResult[] = [];
  for (const feature of value.features) {
    if (!record(feature) || !record(feature.geometry) || !record(feature.properties)) continue;
    const coordinates = feature.geometry.coordinates;
    if (feature.geometry.type !== 'Point' || !Array.isArray(coordinates) || coordinates.length !== 2) continue;
    const point = { lng: coordinates[0], lat: coordinates[1] };
    const properties = feature.properties;
    if (properties.feature_type !== 'address' && properties.feature_type !== 'street') continue;
    if (!isDeliveryCoordinates(point) || typeof properties.mapbox_id !== 'string' || !properties.mapbox_id) continue;
    const address = properties.full_address;
    if (typeof address !== 'string' || address.trim().length < 5 || address.length > 300) continue;
    if (record(properties.context) && record(properties.context.country)
      && typeof properties.context.country.country_code === 'string'
      && properties.context.country.country_code.toLowerCase() !== 'mx') continue;
    if (results.some(result => result.id === properties.mapbox_id)) continue;
    results.push({ id: properties.mapbox_id, lat: point.lat, lng: point.lng, address: address.trim() });
  }
  return results;
}

export async function requestAddresses(
  config: MapboxAddressConfig,
  request: { query: string; proximity: DeliveryCoordinates } | { point: DeliveryCoordinates },
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<AddressResult[]> {
  if (!isPublicMapboxToken(config.accessToken) || !config.permanentGeocoding) {
    throw new AddressLookupError('Escribe tu dirección y elige el punto de entrega en el mapa.');
  }
  const endpoint = 'query' in request ? 'forward' : 'reverse';
  const url = new URL(`https://api.mapbox.com/search/geocode/v6/${endpoint}`);
  url.searchParams.set('access_token', config.accessToken);
  url.searchParams.set('permanent', 'true');
  url.searchParams.set('country', 'mx');
  url.searchParams.set('language', 'es');
  url.searchParams.set('types', 'address,street');
  url.searchParams.set('limit', '5');
  if ('query' in request) {
    const query = request.query.trim();
    if (query.length < 3 || query.length > 256 || query.includes(';') || !isDeliveryCoordinates(request.proximity)) {
      throw new AddressLookupError('Escribe una calle y número válidos para buscar.');
    }
    url.searchParams.set('q', query);
    url.searchParams.set('autocomplete', 'false');
    url.searchParams.set('proximity', `${request.proximity.lng},${request.proximity.lat}`);
  } else {
    if (!isDeliveryCoordinates(request.point)) throw new AddressLookupError('Elige un punto válido en el mapa.');
    url.searchParams.set('longitude', String(request.point.lng));
    url.searchParams.set('latitude', String(request.point.lat));
  }
  const response = await fetcher(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    cache: 'no-store',
    credentials: 'omit',
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new AddressLookupError('La búsqueda no está disponible. Escribe tu dirección y ajusta el pin.');
    }
    if (response.status === 429) throw new AddressLookupError('La búsqueda está ocupada. Espera un momento o escribe tu dirección.');
    throw new AddressLookupError('No pudimos buscar la dirección. Intenta de nuevo o escríbela debajo.');
  }
  const payload: unknown = await response.json();
  return parseAddressResults(payload);
}
