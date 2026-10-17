import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Restaurante } from '../lib/supabase'
import { parseRestaurantBranches, publicRestaurantFamily, RESTAURANT_PUBLIC_FIELDS, UUID_PATTERN } from '../lib/restaurantBranches'

export function useRestaurantFamily(restaurant: Restaurante | null) {
  const rootId = restaurant?.matriz_id || restaurant?.id
  const [family, setFamily] = useState<Restaurante[]>([])
  const [error, setError] = useState('')
  const [attempt, retry] = useState(0)
  useEffect(() => {
    if (!rootId || !UUID_PATTERN.test(rootId)) return
    const controller = new AbortController()
    async function load() {
      try {
        const { data, error } = await supabase.from('storefront_restaurants').select(RESTAURANT_PUBLIC_FIELDS)
          .or(`id.eq.${rootId},matriz_id.eq.${rootId}`).eq('activo', true).eq('perfil_completo', true).limit(101)
          .abortSignal(AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])).returns<unknown>()
        if (error) throw error
        const parsed = publicRestaurantFamily(parseRestaurantBranches(data), rootId!)
        if (!controller.signal.aborted) { setFamily(parsed); setError('') }
      } catch {
        if (!controller.signal.aborted) { setFamily([]); setError('No pudimos consultar las sucursales. Puedes reintentarlo.') }
      }
    }
    void load()
    return () => controller.abort()
  }, [rootId, attempt])
  return { family: family.filter(r => r.id === rootId || r.matriz_id === rootId), error, retry: () => retry(value => value + 1) }
}
