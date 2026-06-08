# Plan: Sistema de Huevos — Backend + Integración

## TL;DR
Crear un Zustand store persistido (`eggStore.ts`) que gestiona 2 huevos, cada uno asociable a una rutina. El store es completamente independiente de la lógica existente de rutinas. La integración en `two.tsx` es de 3 líneas aditivas (import + XP al completar + liberar al borrar) que no pueden romper nada.

---

## Fase 1 — Crear `src/store/eggStore.ts` (nuevo archivo)

**Contenido:**
- `EGG_MAX_XP = 3`
- `EGG_METADATA` — array con `{ id: 1|2, image: require(...egg1.png|egg2.png) }`
- `EggId = 1 | 2`
- `EggData` interface:
  - `id: EggId`
  - `xp: number` — XP historico (0–3), no se resetea al liberar, pero no puede subir de 3
  - `routineId: string | null` — null = libre
  - `lastXpDate: string | null` — "YYYY-MM-DD" para evitar doble conteo
- `useEggStore` con persist en AsyncStorage key `@smartlist_egg_store`
- Acciones:
  - `assignEggToRoutine(eggId, routineId)` — vincula huevo a rutina
  - `freeEgg(routineId)` — libera el huevo de esa rutina
  - `recordRoutineXp(routineId)` — +1 XP si: routineId coincide, xp < 3, lastXpDate ≠ hoy
  - `getEggForRoutine(routineId)` — EggData | null
  - `getAvailableEggs()` — huevos con routineId === null

---

## Fase 2 — Integración en `app/(tabs)/two.tsx` (3 líneas, no rompen nada)

**Paso 2a — Import** (junto a los otros store imports, línea ~23):
```
import { useEggStore } from "@/src/store/eggStore";
```

**Paso 2b — Al completar rutina** (línea 487, justo después de `await recordRoutineCompletion(routineId)`):
```
useEggStore.getState().recordRoutineXp(routineId);
```

**Paso 2c — Al borrar rutina** (línea 317, dentro de `if (success)`, antes de `setRoutines`):
```
useEggStore.getState().freeEgg(id);
```

---

## Archivos afectados
- `src/store/eggStore.ts` — nuevo archivo (crear)
- `app/(tabs)/two.tsx` — 3 líneas aditivas (import + 2 llamadas de store)

## Archivos NO tocados
- `src/lib/routineService.ts` — sin cambios
- `src/types/routine.ts` — sin cambios
- `src/store/routineStreakStore.ts` — sin cambios
- `src/components/CreateRoutineModal.tsx` — sin cambios (la selección de huevo en UI es tarea futura)
- `src/components/RoutineCard.tsx` — sin cambios en esta tarea

---

## Verificación
1. Crear una rutina — el huevo sin asignar aún no gana XP (esperado: necesita UI de selección)
2. Llamar `useEggStore.getState().assignEggToRoutine(1, routineId)` desde DevTools
3. Completar la rutina — `useEggStore.getState().eggs` debe mostrar xp=1, lastXpDate=hoy
4. Completar de nuevo el mismo día — xp debe mantenerse en 1 (no doble conteo)
5. Borrar la rutina — egg debe tener routineId=null, xp=0, maxXp=1

---

## Decisiones
- `xp` no se resetea al liberar el huevo, pero no puede subir de 3. Esto permite que el usuario "guarde" su progreso aunque cambie de rutina, pero sin permitir abusos.
- La selección de huevo en `CreateRoutineModal` es tarea separada — no incluida en este plan
- Sin cambios al schema de Supabase — el estado del huevo es 100% local (AsyncStorage) para evitar complejidad de migraciones y sincronización
- tendremos en el futuro una pantalla con los huevos y sus stats, pero por ahora el foco es solo la lógica de backend y la integración mínima en `two.tsx`

