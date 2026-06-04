# Plan: Separar Inventario y Tienda para Skins/Backgrounds

## Objetivo

Permitir rotación de tienda (bgs/skins/outfits) sin que el usuario pierda acceso a lo comprado, mostrando siempre su inventario personal aparte de la tienda.

---

## 1. Cambios en el modelo de datos (Supabase)

- Agregar columnas a `shop_items`:
  - `visible_in_shop` (boolean, default true)
  - `available_from` y `available_until` (timestamp, opcional)
- Mantener `active = true` para todos los items válidos (no usarlo para rotación).
- La tienda solo muestra items con `visible_in_shop = true` y dentro de ventana (si aplica).

---

## 2. Cambios en el frontend

### a) Nuevo tab/pantalla: Inventario

- Lista todos los backgrounds/outfits que el usuario tiene en `purchasedBackgrounds` y `purchasedOutfits`.
- Permite equipar/des-equipar cualquier item comprado, aunque no esté en tienda.
- Mostrar también los defaults (si aplica).

### b) Tienda

- Solo muestra items activos y visibles según ventana/ciclo.
- Permite comprar (si no se posee) y ver detalles.
- No permite equipar desde aquí, solo comprar.

### c) Refactor hooks

- `useShopItems`: retorna solo items de tienda (visibles y activos).
- Nuevo hook `useInventoryItems`: retorna todos los items que el usuario posee (IDs en store + datos locales/remotos).

---

## 3. Lógica de equipar

- Solo se puede equipar/des-equipar desde Inventario.
- Si un item sale de rotación, sigue equipable si el usuario lo tiene.
- Si se elimina un item de Supabase/Storage, fallback a asset local o placeholder.

---

## 4. UI/UX

- Dos tabs: "Tienda" y "Inventario".
- Inventario puede tener filtros (por tipo, rareza, etc).
- Tienda puede mostrar "¡Nuevo!" o "Rotativo" según ciclo.

---

## 5. Migración

- Actualizar migraciones SQL para nuevas columnas.
- Migrar datos existentes: setear `visible_in_shop` según ciclo actual.
- No tocar `active` de items ya comprados.

---

## 6. Futuro

- Automatizar rotación con cron/función en Supabase.
- Permitir bundles, ofertas, etc.

---

## Referencias

- [src/hooks/useShopItems.ts]
- [src/store/achievementsStore.ts]
- [app/achievements.tsx]
- [docs/assets-upload-playbook.md]

---

Este plan permite máxima flexibilidad y cero frustración para el usuario, y es compatible con la arquitectura actual.
