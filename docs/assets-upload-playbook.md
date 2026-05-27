# Assets Upload Playbook

Guia rapida para dar de alta contenido visual remoto en la app.
Incluye eggs, pets, skins, outfits y fondos.

## 1) Mapa rapido de donde se define cada cosa

- Eggs + Pets (catalogo evolutivo): tabla `egg_catalog`.
- Skins/Fondos/Outfits de tienda: tabla `shop_items`.
- Regla Pro para tienda: columna `is_pro` en `shop_items`.
- Bucket documentado para eggs/pets: `pets`.

Referencias de codigo:
- `src/hooks/useEggCatalog.ts`
- `src/hooks/useShopItems.ts`
- `app/achievements.tsx`
- `supabase/migrations/20260503_shop_items.sql`

## 2) Eggs y Pets (catalogo de evolucion)

La app consume `egg_catalog` con estos campos:
- `id`
- `name`
- `rarity`
- `cost`
- `egg_image_url`
- `pet_image_url`
- `active`
- `sort_order`

Comportamiento importante:
- Si `id` ya existe localmente (1-18), remoto solo pisa imagenes (`egg_image_url`, `pet_image_url`).
- Si `id` es nuevo (19+), se agrega item completo remoto (nombre, rareza, costo, imagenes).
- Para item nuevo remoto se requieren ambas URLs: `egg_image_url` y `pet_image_url`.

Convencion de URLs (segun codigo):
- Egg: `https://<project>.supabase.co/storage/v1/object/public/pets/eggs/egg19.png`
- Pet: `https://<project>.supabase.co/storage/v1/object/public/pets/pets/pet19.png`

SQL base para nuevo egg+pet remoto:

```sql
insert into egg_catalog (
  id,
  name,
  rarity,
  cost,
  egg_image_url,
  pet_image_url,
  sort_order,
  active
)
values (
  19,
  'Nova Egg',
  'rare',
  1500,
  'https://<project>.supabase.co/storage/v1/object/public/pets/eggs/egg19.png',
  'https://<project>.supabase.co/storage/v1/object/public/pets/pets/pet19.png',
  190,
  true
);
```

SQL para actualizar solo imagenes de un egg existente:

```sql
update egg_catalog
set
  egg_image_url = 'https://<project>.supabase.co/storage/v1/object/public/pets/eggs/egg7.png',
  pet_image_url = 'https://<project>.supabase.co/storage/v1/object/public/pets/pets/pet7.png'
where id = 7;
```

## 3) Skins, Fondos y Outfits (tienda)

La app consume `shop_items` con estos campos:
- `id`
- `name`
- `price`
- `is_pro`
- `type` (`background` o `outfit`)
- `image_url`
- `sort_order`
- `active`

Regla Pro (clave):
- Si `is_pro = true`, el item queda bloqueado para usuarios no Pro y abre paywall.
- Si `is_pro = false`, el item es comprable con coronas para todos.

SQL base para alta de fondo Pro:

```sql
insert into shop_items (
  id,
  name,
  price,
  is_pro,
  type,
  image_url,
  sort_order,
  active
)
values (
  'bg_neon_city',
  'Neon City',
  1800,
  true,
  'background',
  'https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>/bg_neon_city.webp',
  210,
  true
);
```

SQL base para alta de outfit no-Pro:

```sql
insert into shop_items (
  id,
  name,
  price,
  is_pro,
  type,
  image_url,
  sort_order,
  active
)
values (
  'outfit_astro_01',
  'Astro Suit',
  1650,
  false,
  'outfit',
  'https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>/outfit_astro_01.webp',
  310,
  true
);
```

Cambiar rapido Pro/no-Pro:

```sql
update shop_items
set is_pro = false
where id = 'bg_neon_city';
```

Desactivar sin borrar:

```sql
update shop_items
set active = false
where id = 'bg_neon_city';
```

## 4) Diferencia importante: item local vs item remoto

Para `shop_items`:
- El catalogo funciona en modo remote-first: si hay rows activos en Supabase,
  la tienda se renderiza desde esos rows.
- Si el `id` coincide con uno local bundleado, remoto puede pisar `name`,
  `price`, `is_pro`, `type`, `image_url` y `sort_order`.
- Si es `id` nuevo remoto, entra como item remoto usando `image_url`.
- `active = false` en Supabase lo oculta, incluso si existe bundleado localmente.

Para `egg_catalog`:
- Si el `id` coincide con local, remoto actualiza solo imagenes.
- Si es `id` nuevo, entra completo desde remoto.

## 5) Checklist de validacion (1 minuto)

1. Verifica que el archivo en Storage tenga URL publica valida.
2. Verifica `active = true`.
3. Verifica `sort_order` para posicion correcta.
4. En tienda, confirma `is_pro` segun lo que quieras bloquear.
5. Reinicia app o refresca pantalla para disparar fetch remoto.
6. Valida en UI:
   - Item Pro: boton PRO/paywall en no-Pro.
   - Item no-Pro: precio normal con coronas.
   - Egg/Pet: imagen de egg y pet cargan sin placeholder.

## 6) Troubleshooting rapido

- No aparece item nuevo en tienda:
  - Revisar `active = true`.
  - Revisar `image_url` no nula y accesible.
  - Revisar `type` valido (`background`/`outfit`).

- Egg nuevo no aparece:
  - Revisar que tenga ambas URLs (`egg_image_url` y `pet_image_url`).
  - Revisar `active = true` y `sort_order`.

- Se ve pero no respeta Pro:
  - Revisar `is_pro` en `shop_items`.
  - Confirmar estado `isPro` del usuario en app.

---

Nota: en este repo la migracion versionada existente para tienda es `supabase/migrations/20260503_shop_items.sql`. Para `egg_catalog`, la app ya lo consulta desde cliente (`useEggCatalog`), aunque su DDL no esta versionado aqui.
