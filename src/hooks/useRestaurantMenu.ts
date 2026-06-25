import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Restaurante, MenuCategoria, MenuPromocion } from '../lib/supabase';

// Helpers locales
export interface MenuItem {
  id: string;
  restaurante_id: string;
  categoria_id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  foto_url?: string;
  activo: boolean;
  agotado: boolean;
  grupo_opciones_id?: string;
  cartItemTipo?: 'item' | 'combo' | 'promo';
}

export interface Opcion {
  id: string;
  nombre: string;
  precio_extra: number;
}

export interface GrupoOpciones {
  id: string;
  nombre: string;
  requerido: boolean;
  multi_seleccion: boolean;
  opciones: Opcion[];
}

export interface MenuCombo {
  id: string;
  restaurante_id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  foto_url?: string;
  activo: boolean;
}

// CACHE GLOBAL PARA CARGA INSTANTÁNEA
const menuCache: Record<string, {
  restaurante: Restaurante;
  categorias: MenuCategoria[];
  items: MenuItem[];
  combos: MenuCombo[];
  promos: MenuPromocion[];
  timestamp: number;
}> = {}

export function useRestaurantMenu(id: string | undefined) {
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [restaurantePausado, setRestaurantePausado] = useState(false);
  const [categorias, setCategorias] = useState<MenuCategoria[]>([]);
  const [productos, setProductos] = useState<MenuItem[]>([]);
  const [promociones, setPromociones] = useState<MenuPromocion[]>([]);
  const [combos, setCombos] = useState<MenuCombo[]>([]);
  const [gruposOpciones, setGruposOpciones] = useState<GrupoOpciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchMenuData(silently = false) {
      if (!id) return null;
      try {
        if (!silently) {
          setLoading(true);
          setError(null);
        }

        // Resolutor de slug a ID real (igual que en el original)
        let actualId = id;
        if (id && isNaN(Number(id)) && id.length < 20) {
          const { data: resBySlug } = await supabase.from('restaurantes').select('id').eq('slug', id.toLowerCase()).maybeSingle();
          if (resBySlug) actualId = resBySlug.id;
        }

        const [resRes, resCat, resProd, resProm, resComb, resGrup] = await Promise.all([
          supabase.from('restaurantes').select('*').eq('id', actualId).single(),
          supabase.from('menu_categorias').select('*').eq('restaurante_id', actualId).eq('activa', true).order('orden', { ascending: true }),
          supabase.from('menu_items').select('*').eq('restaurante_id', actualId).eq('disponible', true).order('orden'),
          supabase.from('menu_promociones').select('*').eq('restaurante_id', actualId).eq('activa', true).gte('fecha_fin', new Date().toISOString()),
          supabase.from('menu_combos').select('*').eq('restaurante_id', actualId).eq('disponible', true),
          supabase.from('menu_grupos_opciones').select('*, opciones:menu_opciones(*)').eq('restaurante_id', actualId)
        ]);

        if (resRes.error) throw resRes.error;

        const currentDay = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'][new Date().getDay()];
        const validPromos = (resProm.data || []).filter(p => {
          if (p.dias_aplicacion && p.dias_aplicacion.length > 0 && !p.dias_aplicacion.includes(currentDay)) return false;
          return true;
        });

        // Guardar en caché
        menuCache[id] = {
          restaurante: resRes.data,
          categorias: resCat.data || [],
          items: resProd.data as unknown as MenuItem[] || [],
          combos: resComb.data as unknown as MenuCombo[] || [],
          promos: validPromos,
          timestamp: Date.now()
        };

        if (isMounted) {
          setRestaurante(resRes.data);
          setCategorias(resCat.data || []);
          setProductos(resProd.data as unknown as MenuItem[] || []);
          setCombos(resComb.data as unknown as MenuCombo[] || []);
          setPromociones(validPromos);
          if (resGrup.data) setGruposOpciones(resGrup.data as unknown as GrupoOpciones[]);
          if (!silently) setLoading(false);
        }

        return actualId;
      } catch (err: any) {
        if (isMounted) setError(err.message || "Error al cargar menú");
        if (isMounted && !silently) setLoading(false);
        return null;
      }
    }

    async function load() {
      // 1. Caché para carga instantánea
      if (id && menuCache[id]) {
        const cached = menuCache[id];
        setRestaurante(cached.restaurante);
        setCategorias(cached.categorias);
        setProductos(cached.items);
        setCombos(cached.combos);
        setPromociones(cached.promos);
        setLoading(false);
        
        if (Date.now() - cached.timestamp > 60000) {
          fetchMenuData(true);
        }
      } else {
        await fetchMenuData();
      }

      // 2. Realtime Subscriptions
      let actualRestId = id;
      if (id && menuCache[id]) actualRestId = menuCache[id].restaurante.id;
      else if (restaurante) actualRestId = restaurante.id;

      if (!actualRestId) return;

      const realtimeChannel = supabase.channel(`public:menu_updates:${actualRestId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `restaurante_id=eq.${actualRestId}` }, () => fetchMenuData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_combos', filter: `restaurante_id=eq.${actualRestId}` }, () => fetchMenuData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_promociones', filter: `restaurante_id=eq.${actualRestId}` }, () => fetchMenuData(true))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurantes', filter: `id=eq.${actualRestId}` }, (payload) => {
          const nuevo = payload.new as Restaurante;
          if (nuevo.activo === false) setRestaurantePausado(true);
          else if (nuevo.activo === true) {
            setRestaurantePausado(false);
            fetchMenuData(true);
          } else fetchMenuData(true);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(realtimeChannel);
      };
    }

    const cleanupRealtime = load();

    return () => {
      isMounted = false;
      cleanupRealtime.then(cleanup => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, [id]);

  return {
    restaurante,
    restaurantePausado,
    categorias,
    productos,
    promociones,
    combos,
    gruposOpciones,
    loading,
    error,
    refresh: () => setRestaurante(null) // trigger reload if needed
  };
}
