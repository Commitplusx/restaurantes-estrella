export const FIRST_DELIVERY_CODE = 'ESTRELLA';
export function isFirstDeliveryCode(value: string): boolean { return value.trim().toUpperCase() === FIRST_DELIVERY_CODE; }
export function firstDeliverySaving(shipping: number, eligible: boolean): number {
  if (!eligible || !Number.isFinite(shipping) || shipping < 0) return 0;
  return Math.round(Math.min(shipping, 50) * 100) / 100;
}
export type CouponPreview = { eligible: true } | { eligible: false; message: string };
export async function previewFirstDelivery(url: string, key: string, phone: string, restaurant: string, signal: AbortSignal, transport: typeof fetch = fetch): Promise<CouponPreview> {
  const response = await transport(url + '/functions/v1/auth-otp', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ action: 'checkout-coupon-preview', telefono: phone, codigo: FIRST_DELIVERY_CODE, restaurante_id: restaurant }), signal,
  });
  if (!response.body) throw new Error('No pudimos comprobar Estrella. Intenta de nuevo.');
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > 32768) throw new Error('No pudimos comprobar Estrella. Intenta de nuevo.');
      chunks.push(part.value);
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let raw: unknown;
  try { raw = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error('No pudimos comprobar Estrella. Intenta de nuevo.'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('No pudimos comprobar Estrella. Intenta de nuevo.');
  const data = raw as Record<string, unknown>;
  if (response.ok && data.ok === true && data.max_shipping_discount === 50) return { eligible: true };
  const message = typeof data.error === 'string' && data.error.trim() && data.error.length <= 240
    ? data.error : 'No pudimos comprobar Estrella. Intenta de nuevo.';
  if (response.status === 400) return { eligible: false, message };
  throw new Error(message);
}
