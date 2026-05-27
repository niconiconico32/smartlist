# Auditoria del sistema Pro

## Mecanismo
- RevenueCat con entitlement "brainy Pro", sincronizado hacia Zustand (`proStore`) desde `PurchasesContext`.
- El flag central es `isPro` (persistido en AsyncStorage).

## Features bloqueadas por Pro

### 1) Streak Shield
- Archivo: `src/components/StreakShieldModal.tsx`
- Regla: 2 escudos por semana, recarga los lunes.
- Uso: protege la racha cuando hay un dia perdido.

### 2) Multiplicador de coronas
- Archivo: `src/store/appStreakStore.ts`
- Sin Pro: multiplicador = 1x.
- Con Pro: `1 + streak * 0.15`.

### 3) Widget de pantalla de inicio
- Archivo: `src/widgets/RoutinesWidget.tsx`
- Comportamiento: muestra upsell de Pro cuando `!isPro`.

### 4) Items exclusivos en tienda
- Archivo: `app/achievements.tsx`
- Regla: si `item.isPro && !isPro`, se muestra paywall.

## Que es gratis siempre
- Rutinas y tareas ilimitadas.
- Asistente AI (voz + task breakdown).
- 8 huevos comunes desbloqueados por defecto.
- Sistema de racha base (sin escudos).
- Coronas y tienda basica.
- Notificaciones y onboarding.
- Achievements no-Pro.

## Planes y precios
- Archivo principal: `app/paywall.tsx`
- Mensual: $5.99/mes.
- Anual: $3.99/mes (facturacion anual, -33%).
- Trial 14 dias en paywall principal.
- Trial 7 dias adicional tras primera tarea: `src/components/ProTrialOfferModal.tsx`.

## Bypass DEV
- Archivo: `src/store/proStore.ts`
- Metodo: `togglePro()`
- Nota: permite activar/desactivar Pro localmente para pruebas sin compra real.

## Archivos clave para continuar
- `src/store/proStore.ts`
- `src/contexts/PurchasesContext.tsx`
- `src/utils/purchases.ts`
- `app/paywall.tsx`
- `src/components/ProTrialOfferModal.tsx`
- `src/components/StreakShieldModal.tsx`
- `src/store/appStreakStore.ts`
- `src/widgets/RoutinesWidget.tsx`
- `app/achievements.tsx`
