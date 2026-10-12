import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { currentLoyalty, isLoyaltyPhone, parseLoyaltyResult } from '../lib/checkoutLoyalty';
import type { LoyaltySnapshot } from '../lib/checkoutLoyalty';

export function useCheckoutLoyalty(input: string) {
  const phone = input.replace(/\D/g, '');
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<LoyaltySnapshot | null>(null);
  const key = useMemo(() => ({ phone, attempt }), [phone, attempt]);

  useEffect(() => {
    if (!isLoyaltyPhone(phone)) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const {data,error}=await supabase.functions.invoke('auth-otp',{
          body:{action:'checkout-benefit-preview',telefono:phone},
          signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)]),
        });
        if (!active) return;
        const result = parseLoyaltyResult(data, error);
        if (result.status === 'error') console.warn('checkout_loyalty_lookup_failed');
        setSnapshot({ key, result });
      } catch {
        if (!active) return;
        console.warn('checkout_loyalty_lookup_failed');
        setSnapshot({ key, result: { status: 'error' } });
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [phone, key]);

  return { loyalty: currentLoyalty(phone, key, snapshot), retry: () => setAttempt(value => value + 1) };
}
