import type { DeliveryCoordinates } from './deliveryLocation';

export interface DeliveryQuote {
  key: string;
  price: number;
  outsideCoverage: boolean;
  loading: boolean;
}

export function parseDeliveryPrice(value: unknown): number | null {
  const price = typeof value === 'number' ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export function quoteForLocation(point: DeliveryCoordinates | null, delivery: boolean, quote: DeliveryQuote | null) {
  const required = delivery && point !== null;
  const key = required ? `${point.lat},${point.lng}` : '';
  const current = required && quote?.key === key ? quote : null;
  return {
    costoEnvioBase: current?.price ?? 0,
    fueraDeCobertura: current?.outsideCoverage ?? false,
    calculandoEnvio: required && (!current || current.loading),
  };
}
