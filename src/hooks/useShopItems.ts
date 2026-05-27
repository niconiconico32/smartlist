import { supabase } from '@/src/lib/supabase';
import { useEffect, useState } from 'react';
import { SHOP_ITEMS, ShopItem } from '../config/shopItems';

/**
 * useShopItems
 *
 * Devuelve el catálogo de la tienda en modo remote-first:
 *   - Si hay datos remotos activos, la lista visible sale de Supabase.
 *   - Para IDs conocidos localmente, se usa el item local como base/fallback
 *     y se pisan campos remotos (name, price, isPro, type, image_url, sort_order).
 *   - Para IDs nuevos remotos, se construye el item con imageUri.
 *
 * Fallback offline: si no hay conexión o no hay datos remotos, se muestran
 * los items locales bundleados.
 */
export function useShopItems(): ShopItem[] {
  const [items, setItems] = useState<ShopItem[]>(SHOP_ITEMS);

  useEffect(() => {
    supabase
      .from('shop_items')
      .select('id, name, price, is_pro, type, image_url, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (!data?.length) return;

        const localById = new Map(SHOP_ITEMS.map((i) => [i.id, i]));

        // Remote-first: la UI se controla por los rows activos en Supabase.
        const remoteDriven = data
          .map((remote) => {
            const local = localById.get(remote.id);

            if (local) {
              return {
                ...local,
                name: remote.name ?? local.name,
                price: remote.price ?? local.price,
                isPro: remote.is_pro ?? local.isPro,
                type: (remote.type as 'background' | 'outfit') ?? local.type,
                imageUri: remote.image_url ?? local.imageUri,
                sort_order: remote.sort_order ?? local.sort_order,
              };
            }

            if (!remote.image_url) return null;

            return {
              id: remote.id,
              name: remote.name,
              price: remote.price,
              isPro: remote.is_pro ?? false,
              type: remote.type as 'background' | 'outfit',
              imageUri: remote.image_url,
              sort_order: remote.sort_order,
            };
          })
          .filter((item): item is ShopItem => item !== null);

        setItems(remoteDriven);
      })
      .catch(() => {
        // Fail open: mantener items locales
      });
  }, []);

  return items;
}
