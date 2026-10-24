import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Restaurante } from '../lib/supabase'
import { parseRestaurantBranches, publicRestaurantFamily, RESTAURANT_PUBLIC_FIELDS, UUID_PATTERN } from '../lib/restaurantBranches'
import { PublicResource, PublicResourcePool } from '../lib/publicResource'
import { usePublicResource } from './usePublicResource'

const families = new PublicResourcePool<Restaurante[]>(20)

export function useRestaurantFamily(restaurant: Restaurante | null) {
  const rootId = restaurant?.matriz_id || restaurant?.id
  const resource = useMemo(() => families.get(rootId || '', () => new PublicResource(async signal => {
        if (!rootId || !UUID_PATTERN.test(rootId)) return []
        const { data, error } = await supabase.from('storefront_restaurants').select(RESTAURANT_PUBLIC_FIELDS)
          .or(`id.eq.${rootId},matriz_id.eq.${rootId}`).eq('activo', true).eq('perfil_completo', true).limit(101)
          .abortSignal(signal).returns<unknown>()
        if (error) throw error
        return publicRestaurantFamily(parseRestaurantBranches(data), rootId)
  })), [rootId])
  const query = usePublicResource(resource)
  return { family: (query.data || []).filter(r => r.id === rootId || r.matriz_id === rootId), error: query.error ? 'No pudimos actualizar las sucursales. Puedes reintentarlo.' : '', retry: query.refresh }
}
