import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { promotionCartIssues, validatePromotionRows, type PromotionDelivery, type PromotionIssue } from '../lib/promotionRules';

export async function checkPromotionEligibility(restaurantId: string, ids: string[], mode: PromotionDelivery, signal?: AbortSignal): Promise<PromotionIssue[]> {
  if (!ids.length) return [];
  if (ids.length > 100 || ids.some(id => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error('Revisa las promociones de tu carrito.');
  const { data, error } = await supabase.from('menu_promociones')
    .select('id,restaurante_id,titulo,activa,tipos_pedido,dias_aplicacion,fecha_fin')
    .eq('restaurante_id', restaurantId).in('id', ids).limit(100)
    .abortSignal(signal ?? AbortSignal.timeout(8000));
  if (error) throw new Error('No pudimos comprobar las promociones. Tu carrito sigue aquí; vuelve a intentar.');
  return promotionCartIssues(ids, validatePromotionRows(data, restaurantId), mode);
}

interface Eligibility { key: string; status: 'loading' | 'ready' | 'error'; issues: PromotionIssue[]; message?: string }
export function usePromotionEligibility(restaurantId: string | undefined, ids: string[], mode: PromotionDelivery | null) {
  const idsKey = [...new Set(ids)].sort().join(',');
  const [retryCount, setRetryCount] = useState(0);
  const key = `${restaurantId || ''}:${idsKey}:${mode || ''}:${retryCount}`;
  const [state, setState] = useState<Eligibility>({ key: '', status: 'loading', issues: [] });
  const retry = useCallback(() => setRetryCount(count => count + 1), []);
  useEffect(() => {
    if (!idsKey || !mode) return;
    if (!restaurantId) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    void checkPromotionEligibility(restaurantId, idsKey.split(','), mode, controller.signal)
      .then(issues => { if (active) setState({ key, status: 'ready', issues }); })
      .catch((error: unknown) => { if (active) setState({ key, status: 'error', issues: [], message: error instanceof Error ? error.message : 'No pudimos comprobar las promociones.' }); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [restaurantId, idsKey, mode, key, retryCount]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') retry(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [retry]);
  const current: Eligibility = !idsKey || !mode ? { key, status: 'ready', issues: [] }
    : state.key === key ? state : { key, status: 'loading', issues: [] };
  return { ...current, blocked: current.status !== 'ready' || current.issues.length > 0, retry };
}
