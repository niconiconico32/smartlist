import { supabase } from "@/src/lib/supabase";
import { EGG_METADATA, EggRarity } from "@/src/store/eggStore";
import { useEffect, useState } from "react";
import { ImageSourcePropType } from "react-native";

// ─── Public type ─────────────────────────────────────────────────────────────

/**
 * A single egg entry usable by display components.
 * Mirrors the shape of EGG_METADATA entries but with `id: number` (not the
 * narrow EggId union) so remote-only entries with ids > 18 are also supported.
 */
export type CatalogEgg = {
  id: number;
  name: string;
  rarity: EggRarity;
  cost: number;
  /** Egg sprite — bundled require() or remote { uri } from Supabase Storage. */
  image: ImageSourcePropType;
  /** Pet sprite (evolved form) — bundled require() or remote { uri }. */
  petImage: ImageSourcePropType;
};

// ─── Local fallback catalog ───────────────────────────────────────────────────
// Built from the bundled EGG_METADATA — guarantees offline support and is the
// starting state returned synchronously before the Supabase fetch completes.

const LOCAL_CATALOG: CatalogEgg[] = EGG_METADATA.map((m) => ({
  id: m.id,
  name: m.name,
  rarity: m.rarity,
  cost: m.cost,
  image: m.image,
  petImage: m.petImage,
}));

let cachedCatalog: CatalogEgg[] | null = null;
let catalogRequest: Promise<CatalogEgg[]> | null = null;

function mergeCatalog(data: any[]): CatalogEgg[] {
  const localIds = new Set(LOCAL_CATALOG.map((e) => e.id));
  const remoteById = new Map(data.map((entry) => [entry.id, entry]));

  const updated = LOCAL_CATALOG.map((local) => {
    const remote = remoteById.get(local.id);
    if (!remote) return local;
    return {
      ...local,
      image: remote.egg_image_url
        ? ({ uri: remote.egg_image_url } as ImageSourcePropType)
        : local.image,
      petImage: remote.pet_image_url
        ? ({ uri: remote.pet_image_url } as ImageSourcePropType)
        : local.petImage,
    };
  });

  const remoteOnly = data
    .filter((r) => !localIds.has(r.id) && r.egg_image_url && r.pet_image_url)
    .map((r) => ({
      id: r.id as number,
      name: r.name as string,
      rarity: r.rarity as EggRarity,
      cost: r.cost as number,
      image: { uri: r.egg_image_url } as ImageSourcePropType,
      petImage: { uri: r.pet_image_url } as ImageSourcePropType,
    }));

  return [...updated, ...remoteOnly];
}

async function fetchCatalog(): Promise<CatalogEgg[]> {
  const { data } = await supabase
    .from("egg_catalog")
    .select("id, name, rarity, cost, egg_image_url, pet_image_url")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  return data?.length ? mergeCatalog(data) : LOCAL_CATALOG;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useEggCatalog
 *
 * Returns the merged egg/pet catalog:
 *   - Starts synchronously with LOCAL_CATALOG (bundled assets — works offline).
 *   - Fetches `egg_catalog` from Supabase and applies overrides:
 *       · Existing entries (id 1-18): egg_image_url / pet_image_url override
 *         the bundled require() if set (null = keep bundled).
 *       · New entries (id 19+): added with remote { uri } images.
 *   - Fails silently: if the fetch fails, the local catalog is returned as-is.
 *
 * URL convention (Supabase Storage bucket: `pets`):
 *   egg image → https://<project>/storage/v1/object/public/pets/eggs/egg19.png
 *   pet image → https://<project>/storage/v1/object/public/pets/pets/pet19.png
 */
export function useEggCatalog(enabled = true): CatalogEgg[] {
  const [catalog, setCatalog] = useState<CatalogEgg[]>(
    () => cachedCatalog ?? LOCAL_CATALOG,
  );

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    if (cachedCatalog) {
      setCatalog(cachedCatalog);
      return;
    }

    if (!catalogRequest) {
      catalogRequest = fetchCatalog().then(
        (result) => {
          cachedCatalog = result;
          return result;
        },
        () => {
          cachedCatalog = LOCAL_CATALOG;
          return LOCAL_CATALOG;
        },
      );
    }

    catalogRequest.then((result) => {
      if (!cancelled) setCatalog(result);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return catalog;
}
