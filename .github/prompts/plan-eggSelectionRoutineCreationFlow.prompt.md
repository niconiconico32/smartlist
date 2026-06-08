## Plan: Egg selection step en el flujo de creación de rutinas

**El flujo actual** auto-asigna el huevo en la primera completación de la rutina (reactivo, invisible para el usuario). La mejor opción es hacer la selección **explícita y visual** durante la creación, con un paso final pixel-art.

---

### Phase 1 — Añadir Step 5 "Choose your pet" en `src/components/CreateRoutineModal.tsx`

1. Importar `EggId`, `EGG_METADATA` y `useEggStore` desde el store
2. Computar `availableEggs = useEggStore(s => s.getAvailableEggs())` en el componente
3. Añadir estado local `selectedEggId: EggId | null` (default: id del primer huevo libre)
4. Añadir el Step 5 al wizard, **solo si `availableEggs.length > 0`**:
   - Dos tarjetas pixel-art (una por huevo libre): imagen del `EGG_METADATA` + label "Pet 1" / "Pet 2"
   - Borde/highlight en la tarjeta seleccionada
   - Si no hay huevos libres → el step no aparece, sin fricción
5. Extender el tipo del callback `onCreateRoutine` para incluir `eggId?: EggId`

### Phase 2 — Asignar el huevo en `app/(tabs)/swipeable-layout.tsx` *(depende de Phase 1)*

6. En `handleCreateRoutine`, después de que `routineService.createRoutine()` devuelva el `routine.id`:
   - Si `eggId` está presente → llamar `useEggStore.getState().assignEggToRoutine(eggId, routine.id)` inmediatamente

### Phase 3 — Eliminar auto-assign reactivo en `app/(tabs)/two.tsx` *(paralela con Phase 2)*

7. En el completion handler (~línea 490): eliminar el bloque `if (!getEggForRoutine(routineId)) { ... auto-assign ... }`. Solo conservar `recordRoutineXp(routineId)`

---

### Relevant files

- `src/components/CreateRoutineModal.tsx` — nuevo step visual + extender callback
- `app/(tabs)/swipeable-layout.tsx` — `handleCreateRoutine`: llamar `assignEggToRoutine` post-create
- `app/(tabs)/two.tsx` — eliminar bloque auto-assign en completion handler
- `src/store/eggStore.ts` — solo lectura: `getAvailableEggs`, `assignEggToRoutine`, `EGG_METADATA`

---

### Verification

1. Crear rutina con huevo disponible → huevo aparece asignado en el slide "pet" del `RoutineDetailModal` sin necesidad de completar la rutina
2. Crear rutina cuando ambos huevos están ocupados → el Step 5 no aparece, la rutina se crea sin huevo
3. Borrar una rutina → su huevo vuelve a quedar libre (comportamiento existente intacto)
4. Completar una rutina → XP sigue acumulándose correctamente via `recordRoutineXp`

---

### Decisions

- **Auto-assign vs. selección explícita**: se opta por selección explícita — el usuario ve su "huevo" desde el primer momento, reforzando el mechanic
- **Skip si no hay huevos libres**: siempre habran huevos libres o mascotas. Por ahora, solo tenemos dos huevos creados. pero quiero implementar la logica de categorias de huevos desde el principio, entonces tendremos 8 huevos comunes, 5 raros y 3 legendarios. el usuario puede crear rutinas aunque no haya huevos libres, pero no podrá asignar un huevo hasta que libere uno o compre uno nuevo.
- **Fuera de scope**: añadir más huevos a `EGG_METADATA`, nombre de huevo personalizable, pantalla de gestión de huevos.
- **Crear la logica de compra con coronas**: los huevos raros cuestan 1500 coronas cada uno y los legendarios 5000 coronas. recuerda que tenemos una seccion en la app para comprar fondos y skins. para que entiendas y emplees la logica.


---

### Open Questions

1. **Nombre de los huevos**: `EGG_METADATA` actualmente no tiene campo `name`. ¿Añadir nombres descriptivos ("Fire Egg", "Ice Egg") o usar labels genéricos ("Pet 1", "Pet 2")? sii, añadir. IMPORTANTE: el nombre no es editable, la tarjeta de seleccion de huevo tiene dos tabs egss and pets. por ahora solo tenemos 2 huevos, pero implementa ahora la logica de categorias de huevos, tendremos 8 huevos Comunes, 5 huevos raros y 3 legendarios. entonces el nombre del huevo es importante para generar expectativa y deseo de coleccionarlos. el nombre se muestra en la tarjeta de seleccion de huevo, en el detalle de rutina y en la pantalla de gestion de huevos (futura). El usuario no necesita pagar si quiere huevos comunes, pero si quiere huevos raros o legendarios, si necesita pagar. los huevos raros cuestan 1500 coronas cada uno y los legendarios 5000 coronas. en la tab pet pon placeholders de nombres de mascotas (Dragon, Phoenix, etc) para generar expectativa. estos no se podran comprar ni seleccionar por ahora, pero es importante mostrarlo desde el principio para generar deseo de coleccionarlos.
2. **¿El step aparece siempre o solo si hay ≥1 huevo libre?** Si aparece, si no hay huevos habran masctoas, pero como tendre 8 huevos basicos para elegir siempre habra huevos para elegir, entonces el step siempre aparece.


Hazme mas preguntas si necesitas clarificaciones para implementar esta feature..

