export interface CheckoutCustomerLoyalty {
  es_vip: boolean;
  saldo: number;
  puntos: number;
  envios_gratis: number;
  nombre: string;
}

export type LoyaltyResult =
  | { status: 'found'; customer: CheckoutCustomerLoyalty }
  | { status: 'not-found' }
  | { status: 'error' };

export type LoyaltyState = LoyaltyResult | { status: 'idle' | 'loading' };
export interface LoyaltyRequestKey { phone: string; attempt: number }
export interface LoyaltySnapshot { key: LoyaltyRequestKey; result: LoyaltyResult }

export function isLoyaltyPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone);
}

function amount(value: unknown, integer = false): number | null {
  if (value === null) return 0;
  const parsed = typeof value === 'number' ? value
    : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 && (!integer || Number.isSafeInteger(parsed)) ? parsed : null;
}

/** A missing row is expected for a new customer; an error is never zero points. */
export function parseLoyaltyResult(data: unknown, error: unknown): LoyaltyResult {
  if (error !== null) return { status: 'error' };
  if (data === null) return { status: 'not-found' };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { status: 'error' };
  const row = data as Record<string, unknown>;
  const puntos = amount(row.puntos, true);
  const envios = amount(row.envios_gratis_disponibles, true);
  const saldo = amount(row.saldo_billetera);
  if (puntos === null || envios === null || saldo === null || typeof row.nombre !== 'string'
    || typeof row.rango !== 'string' || !row.rango
    || (row.es_vip !== null && typeof row.es_vip !== 'boolean')) return { status: 'error' };
  return { status: 'found', customer: {
    es_vip: row.es_vip === true || row.rango === 'vip', saldo, puntos,
    envios_gratis: envios, nombre: row.nombre,
  } };
}

/** Hide a previous phone/retry's response immediately, before effect cleanup runs. */
export function currentLoyalty(phone: string, key: LoyaltyRequestKey, snapshot: LoyaltySnapshot | null): LoyaltyState {
  if (!isLoyaltyPhone(phone)) return { status: 'idle' };
  return snapshot?.key === key ? snapshot.result : { status: 'loading' };
}
