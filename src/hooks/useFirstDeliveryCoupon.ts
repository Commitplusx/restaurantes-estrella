import { useEffect, useState } from 'react';
import { isFirstDeliveryCode, previewFirstDelivery } from '../lib/firstDeliveryCoupon';
interface Check { key: string; phase: 'eligible' | 'ineligible' | 'error'; message: string }
export function useFirstDeliveryCoupon(code: string, phone: string, restaurant: string | undefined, delivery: string | null) {
  const selected = isFirstDeliveryCode(code), normalizedPhone = phone.replace(/\D/g, '');
  const [check, setCheck] = useState<Check | null>(null);
  const [attempt, setAttempt] = useState(0);
  const currentKey = [code.trim().toUpperCase(), normalizedPhone, restaurant, delivery, attempt].join(':');
  const hasDetails = /^\d{10}$/.test(normalizedPhone) && Boolean(restaurant) && delivery === 'domicilio';
  useEffect(() => {
    if (!selected || !hasDetails || !restaurant) return;
    const controller = new AbortController();
    let cancelled = false;
    const start = window.setTimeout(() => {
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      void previewFirstDelivery(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, normalizedPhone, restaurant, controller.signal)
        .then(result => {
          if (!cancelled) setCheck({ key: currentKey, phase: result.eligible ? 'eligible' : 'ineligible',
            message: result.eligible ? 'Estrella aplicado: hasta $50 menos en tu primer envío.' : result.message });
        }).catch(() => {
          if (!cancelled) setCheck({ key: currentKey, phase: 'error', message: 'No pudimos comprobar Estrella. Reintenta sin perder tu pedido.' });
        }).finally(() => window.clearTimeout(timeout));
    }, 350);
    return () => { cancelled = true; window.clearTimeout(start); controller.abort(); };
  }, [selected, hasDetails, restaurant, normalizedPhone, currentKey, attempt]);
  const current = check?.key === currentKey ? check : null;
  const checking = selected && hasDetails && current === null;
  const eligible = selected && hasDetails && current?.phase === 'eligible';
  const message = !selected ? '' : !hasDetails
    ? delivery === 'tienda' ? 'Estrella es para domicilio. Al recoger, el envío ya cuesta $0.'
      : 'Estrella guardado. Completa tu WhatsApp y elige entrega a domicilio para aplicarlo.'
    : checking ? 'Comprobando tu primer envío…' : current?.message ?? '';
  return { selected, eligible, checking, message, failed: current?.phase === 'error',
    retry: () => setAttempt(value => value + 1) };
}
