import { supabase } from '@/src/lib/supabase';
import { useEffect, useState } from 'react';
import { SHOP_ITEMS, ShopItem } from '../config/shopItems';

/**
 * useShopItems
 *
 * Devuelve el catálogo de la tienda mezclando items locales (bundleados)
 * con los que vengan de Supabase:
 *   - Items existentes: precio e isPro se actualizan desde Supabase.
 *   - Items nuevos (solo en Supabase): se añaden al final con imageUri.
 *
 * Falla en silencio: si no hay conexión, se muestran solo los items locales.
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

        const localIds = new Set(SHOP_ITEMS.map((i) => i.id));

        // Actualizar precio e isPro en items locales existentes
        const updated = SHOP_ITEMS.map((local) => {
          const remote = data.find((r) => r.id === local.id);
          if (!remote) return local;
          return {
            ...local,
            price: remote.price,
            isPro: remote.is_pro ?? local.isPro,
          };
        });

        // Agregar items nuevos que solo existen en Supabase
        const remoteOnly = data
          .filter((r) => !localIds.has(r.id) && r.image_url)
          .map((r) => ({
            id: r.id,
            name: r.name,
            price: r.price,
            isPro: r.is_pro ?? false,
            type: r.type as 'background' | 'outfit',
            imageUri: r.image_url as string,
            sort_order: r.sort_order,
          }));

        setItems([...updated, ...remoteOnly]);
      })
      .catch(() => {
        // Fail open: mantener items locales
      });
  }, []);

  return items;
}
