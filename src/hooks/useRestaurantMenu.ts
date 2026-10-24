import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { publicMenuResource } from '../lib/publicMenuCatalog';
import { currentMenuPromotions, publicMenuIsPaused, type MenuPauseEvent } from '../lib/publicMenuData';
import { usePublicResource } from './usePublicResource';

export function useRestaurantMenu(identifier: string | undefined) {
  const resource = useMemo(() => publicMenuResource(identifier || ''), [identifier]);
  const query = usePublicResource(resource);
  const restaurantId = query.data?.restaurante.id;
  const [pausedEvent, setPausedEvent] = useState<MenuPauseEvent | null>(null);
  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    const refresh = () => {
      if (!active) return;
      resource.invalidate();
      // A change received during a fetch invalidates its response. One shared
      // follow-up obtains the new version, with no unbounded retry loop.
      void resource.refresh().then(() => { if (active) void resource.refresh(); });
    };
    const channel = supabase.channel(`public:menu_cached:${restaurantId}`);
    for (const table of ['menu_items', 'menu_combos', 'menu_promociones', 'menu_categorias', 'cupones_restaurante']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `restaurante_id=eq.${restaurantId}` }, refresh);
    }
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'restaurantes', filter: `id=eq.${restaurantId}` }, payload => {
      const row: unknown = payload.new;
      if (typeof row === 'object' && row !== null && 'activo' in row && typeof row.activo === 'boolean') {
        setPausedEvent({ id: restaurantId, paused: row.activo === false, observed: resource.snapshot().data });
      }
      refresh();
    }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [resource, restaurantId]);
  return {
    ...query,
    promos: useMemo(() => currentMenuPromotions(query.data?.promos || []), [query.data]),
    restaurantePausado: publicMenuIsPaused(query.data, pausedEvent),
  };
}
