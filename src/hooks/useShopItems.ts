import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import { SHOP_ITEMS, ShopItem } from '../config/shopItems';

const SHOP_CACHE_KEY = '@smartlist_shop_catalog';

/**
 * useShopItems
 *
 * Devuelve el catálogo de la tienda en modo remote-first con cache local:
 *   - Monta con SHOP_ITEMS (local bundle) → inmediato.
 *   - Carga el cache de AsyncStorage → reemplaza si existe (sin flash).
 *   - Fetch de Supabase en background → merge → actualiza → guarda en cache.
 *   - Fallback offline: si no hay conexión, se muestra el cache o los items locales.
 */
export function useShopItems(): ShopItem[] {
  const [items, setItems] = useState<ShopItem[]>(SHOP_ITEMS);
  const hasHydrated = useRef(false);

  useEffect(() => {
    const localById = new Map(SHOP_ITEMS.map((i) => [i.id, i]));

    const mergeRemote = (data: any[]): ShopItem[] => {
      const merged: ShopItem[] = [];
      for (const remote of data) {
        const local = localById.get(remote.id);

        if (local) {
          merged.push({
            ...local,
            name: remote.name ?? local.name,
            price: remote.price ?? local.price,
            isPro: remote.is_pro ?? local.isPro,
            type: (remote.type as 'background' | 'outfit') ?? local.type,
            imageUri: remote.image_url ?? local.imageUri,
            sort_order: remote.sort_order ?? local.sort_order,
          });
          continue;
        }

        if (remote.image_url) {
          merged.push({
            id: remote.id,
            name: remote.name,
            price: remote.price,
            isPro: remote.is_pro ?? false,
            type: remote.type as 'background' | 'outfit',
            imageUri: remote.image_url,
            sort_order: remote.sort_order,
          });
        }
      }
      return merged;
    };

    // 1. Load from cache instantly (no flash of local-only items)
    AsyncStorage.getItem(SHOP_CACHE_KEY)
      .then((cached) => {
        if (cached && !hasHydrated.current) {
          try {
            const parsed = JSON.parse(cached) as ShopItem[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setItems(parsed);
            }
          } catch {}
        }
      })
      .catch(() => {});

    // 2. Fetch from Supabase in background (stale-while-revalidate)
    supabase
      .from('shop_items')
      .select('id, name, price, is_pro, type, image_url, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(
        ({ data }) => {
          if (!data?.length) return;

          const remoteDriven = mergeRemote(data);
          hasHydrated.current = true;
          setItems(remoteDriven);

          // Persist to cache for next mount
          AsyncStorage.setItem(SHOP_CACHE_KEY, JSON.stringify(remoteDriven)).catch(
            () => {},
          );
        },
        () => {},
      );
  }, []);

  return items;
}
