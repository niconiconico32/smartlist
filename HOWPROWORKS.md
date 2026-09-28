# Cómo funciona el Modo Pro en Brainy

## Descripción general

Brainy es una app de rutinas y tareas diarias orientada a personas con ADHD. El modo Pro es un sistema de suscripción que desbloquea funcionalidades premium mediante RevenueCat como backend de pagos.

---

## Stack tecnológico

- **Framework:** Expo (React Native) v55, Expo Router
- **Estado global:** Zustand con persistencia en AsyncStorage
- **Pagos/Suscripciones:** RevenueCat SDK (`react-native-purchases` v10 + `react-native-purchases-ui` v10)
- **Analytics:** PostHog
- **Backend principal:** Supabase

---

## Arquitectura del sistema Pro

### 1. Fuente de verdad local: `proStore` (Zustand)

**Archivo:** `src/store/proStore.ts`

Es el store central que contiene y persiste el estado Pro:

```typescript
interface ProStoreState {
  isPro: boolean;              // flag principal de pro
  streakShieldCount: number;   // 0-2 escudos por semana
  lastShieldRefillDate: string | null;  // última recarga (lunes)
  pendingShieldOffer: boolean; // oferta de escudo pendiente
  isLoaded: boolean;           // true cuando se hidrató desde AsyncStorage
}
```

Persistencia: AsyncStorage bajo la clave `@smartlet_pro_store`.

Métodos clave:
- `load()` — hidrata el store desde AsyncStorage. Incluye limpieza legacy de trials antiguos.
- `activatePermanentPro()` — establece `isPro = true` y persiste.
- `cancelPermanentPro()` — establece `isPro = false` y persiste.
- `rechargeShieldsIfNeeded()` — recarga escudos a 2 si es lunes y no se recargó hoy.
- `activateShieldOffer()` / `consumeShield()` / `clearPendingShieldOffer()` — manejo del streak shield.
- `togglePro()` — **dev only**, cambia isPro directo sin RevenueCat.

### 2. RevenueCat y entitlement: `purchases.ts`

**Archivo:** `src/utils/purchases.ts`

Configura el SDK de RevenueCat con:
- `ENTITLEMENT_ID = 'brainy Pro'` — el entitlement que identifica pro en RevenueCat.
- `OFFERING_ID` desde `EXPO_PUBLIC_REVENUECAT_OFFERING_ID` (default `'default'`).
- API keys por plataforma desde variables de entorno.

Funciones principales:
- `configurePurchases()` — inicializa RevenueCat con la API key de la plataforma.
- `loginUser(userId)` — loguea al usuario en RevenueCat (usa el ID de Supabase Auth).
- `getCustomerInfo()` — obtiene info actual del usuario desde RevenueCat.
- `isPremiumActive(customerInfo)` — verifica si `'brainy Pro'` está en `entitlements.active`.
- `getOffering(offeringId?)` — obtiene un offering específico (force fetch desde la nube).
- `purchasePackage(pkg)` — ejecuta la compra y retorna resultado.
- `restorePurchases()` — restaura compras previas.

Manejo de Expo Go: en Expo Go todas las funciones son no-op (retornan datos falsos), ya que RevenueCatUI requiere development build.

### 3. Bridge RevenueCat → proStore: `PurchasesContext.tsx`

**Archivo:** `src/contexts/PurchasesContext.tsx`

Provider React que:
1. Al montarse: configura RevenueCat, loguea al usuario, obtiene offerings y sincroniza estado premium.
2. Expone `syncPremiumStatus(info)` — función puente que llama a `proStore.activatePermanentPro()` o `cancelPermanentPro()` según lo que diga RevenueCat.
3. Provee hooks `usePurchases()` con métodos: `purchasePackage()`, `restorePurchases()`, `refreshCustomerInfo()`.

### 4. Sincronización en tiempo real: `_layout.tsx`

**Archivo:** `app/_layout.tsx`

Dos mecanismos paralelos mantienen `isPro` sincronizado sin depender solo del contexto:

1. **RevenueCat CustomerInfoUpdateListener** — listener global que se dispara ante cualquier cambio en la información del cliente (compra desde otro dispositivo, expiración, etc.).
2. **AppState change listener** — al volver de background, refresca `customerInfo` y sincroniza.

Ambos llaman a `proStore.activatePermanentPro()` / `cancelPermanentPro()`.

### 5. Paywall nativo: `PaywallModal.tsx`

**Archivo:** `src/components/PaywallModal.tsx`

Componente que presenta el paywall nativo de RevenueCatUI:

```
PaywallModal.visible = true
  → configurePurchases()
  → getOffering(offeringId)
  → RevenueCatUI.presentPaywallIfNeeded({
       offering,
       requiredEntitlementIdentifier: 'brainy Pro'
     })
  → resultado:
       PURCHASED / RESTORED → getCustomerInfo()
                              → isPremiumActive()?
                                → proStore.activatePermanentPro()
                                → Haptics success
                                → PostHog event
       CANCELLED             → posthog paywall_dismissed
       NOT_PRESENTED         → usuario ya era Pro
       ERROR                 → posthog paywall_error
```

### 6. Paywall webview alternativo: `app/paywall.tsx`

**Archivo:** `app/paywall.tsx`

Ruta Expo Router con un paywall diseñado a medida (plan mensual $5.99, anual $3.99/mes facturado $47.88/año). Incluye animaciones, FAQ y botón CTA con shimmer. **Nota:** el botón de suscripción tiene un `TODO: Implement subscription logic` — actualmente solo navega de vuelta. Este parece ser un paywall legacy o secundario; el flujo real de compra va por `PaywallModal`.

---

## Features bloqueadas detrás de Pro

| Feature | ¿Cómo se gat锁? | Archivo(s) |
|---------|----------------|------------|
| **Streak Shield (Escudo de racha)** | Solo disponible si `isPro`. Da 2 escudos/semana (se recargan los lunes). Cuando se detecta un día perdido, se activa `pendingShieldOffer`. | `proStore.ts`, `appStreakStore.ts`, `StreakShieldModal.tsx` |
| **Multiplicador de coronas** | `getMultiplier()` retorna `1 + racha * 0.15` si Pro, sino `1`. Afecta coronas ganadas en tareas, logros y rutinas. | `appStreakStore.ts`, `ActivityButton.tsx`, `RoutineCard.tsx`, `achievementsStore.ts` |
| **Widget de pantalla de inicio (Android)** | Si `isPro = false`, el widget muestra una tarjeta de upsell en vez de las rutinas. | `RoutinesWidget.tsx`, `widgetTaskHandler.tsx` |
| **Widget de pantalla de inicio (iOS)** | Mismo comportamiento: si no es Pro, muestra estado de upsell. | `RoutinesIOSWidget.tsx` |
| **Widget con más de 1 rutina** | Usuarios no-Pro solo pueden ciclar 1 rutina en el widget. | `widgetTaskHandler.tsx` |
| **Objetos exclusivos de la tienda** | 13 items (7 fondos, 6 outfits) tienen `isPro: true`. Al tocarlos sin Pro se abre `PaywallModal`. | `shopItems.ts`, `achievements.tsx` |
| **Huevos no-comunes** | Huevos de rareza `rare` o `legendary` requieren Pro. `EggGrid` muestra paywall al intentar abrirlos. | `achievements.tsx`, `eggStore.ts` |

**Siempre gratis:** rutinas y tareas ilimitadas, asistente IA por voz, 8 huevos comunes, racha base, items básicos de tienda, notificaciones, onboarding, logros no-Pro, coronas (con multiplicador 1x).

---

## Flujo completo de activación Pro

```
Usuario toca "Unlock Pro" / item bloqueado / trial en onboarding
    │
    ▼
PaywallModal(visible=true, source, offeringId)
    │
    ▼
RevenueCatUI.presentPaywallIfNeeded()
    │
    ├── NOT_PRESENTED → ya es Pro, no hace nada
    ├── CANCELLED     → log + PostHog event
    ├── ERROR         → log + PostHog event
    ├── RESTORED      → verifica entitlement → activatePermanentPro()
    └── PURCHASED     → getCustomerInfo()
                         → isPremiumActive(info)?
                           → proStore.activatePermanentPro()
                           → isPro = true (Zustand + AsyncStorage)
                           → Haptics notification success
                           → PostHog capture: purchase_completed
    │
    ▼
Componentes suscritos a useProStore() se re-renderizan
Widgets sincronizan vía AsyncStorage (WIDGET_PRO_KEY)
RevenueCat CustomerInfoUpdateListener mantiene sync en tiempo real
```

---

## Planes y precios

Los offerings se configuran desde el dashboard de RevenueCat (no están hardcodeados). Los valores actuales observados:

- **Mensual:** $5.99/mes
- **Anual:** $3.99/mes (facturado $47.88/año, marcado como -33% de ahorro)
- **Trial:** 14 días gratis en el paywall principal
- **Reverse trial:** 7 días gratis ofrecido después de completar la primera tarea (`ReverseTrialSlide.tsx`)

---

## Onboarding y trials

El onboarding tiene 3 slides relacionadas con Pro:

1. **`PaywallOnboardingSlide`** — presenta `PaywallModal` con `offeringId: "paywallonboarding"` inmediatamente.
2. **`PaywallSlide`** — slide informativo mostrando los beneficios de Pro con un botón "Continuar".
3. **`ReverseTrialSlide`** — aparece después de completar la primera tarea. Ofrece 7 días de prueba. Al aceptar: llama a `purchasePackage()`, guarda fecha de inicio, agenda notificación de expiración, captura `trial_started` en PostHog.

---

## Manejo de escudos de racha (Streak Shield)

Solo disponible para usuarios Pro:

1. **Recarga:** cada lunes se recargan 2 escudos (`rechargeShieldsIfNeeded()` en `proStore`).
2. **Detección:** en `appStreakStore`, cuando se detecta un día sin abrir la app, verifica `proState.isPro && streakShieldCount > 0`.
3. **Oferta:** activa `pendingShieldOffer = true`, lo que muestra `StreakShieldModal`.
4. **Decisión del usuario:**
   - Usar escudo → `consumeShield()` (reduce contador, salva la racha, captura `streak_shield_used` en PostHog).
   - Rechazar → `clearPendingShieldOffer()` (la racha se reinicia a 1).

---

## Diferimiento entre stores (offline-first)

La app sincroniza items de la tienda desde Supabase (`shop_items` table) pero usa un bundle local como fallback. Los items remotos tienen prioridad y respetan el campo `is_pro`. Esto permite gating remoto sin actualizar la app.

---

## Eventos de analytics (PostHog)

| Evento | Disparo |
|--------|---------|
| `paywall_viewed` | Se abre el PaywallModal |
| `paywall_not_presented` | Usuario ya es Pro |
| `paywall_dismissed` | Usuario cancela |
| `paywall_error` | Error al presentar |
| `purchase_completed` | Compra exitosa |
| `purchase_restored` | Restauración exitosa |
| `trial_started` | Inicia reverse trial de 7 días |
| `streak_shield_used` | Usuario gasta un escudo |
| `streak_lost` | Racha perdida |
| `shop_pro_item_tapped` | Usuario no-Pro toca item exclusivo |

---

## Archivos clave del sistema Pro

| Archivo | Rol |
|---------|-----|
| `src/store/proStore.ts` | Store central de estado Pro (Zustand + AsyncStorage) |
| `src/utils/purchases.ts` | Wrapper de RevenueCat SDK |
| `src/contexts/PurchasesContext.tsx` | Provider React que bridgea RevenueCat → proStore |
| `src/components/PaywallModal.tsx` | Paywall nativo con RevenueCatUI |
| `app/paywall.tsx` | Paywall custom alternativo (legacy, stub) |
| `app/_layout.tsx` | Bootstrap: carga proStore, sincroniza RevenueCat |
| `src/components/StreakShieldModal.tsx` | Modal de oferta de escudo de racha |
| `src/store/appStreakStore.ts` | Store de rachas, integra streak shield |
| `src/store/eggStore.ts` | Store de huevos, gatera huevos no-comunes |
| `src/config/shopItems.ts` | Catálogo de tienda con 13 items exclusivos Pro |
| `src/hooks/useShopItems.ts` | Hook que mergea items locales + remotos |
| `src/components/HamburgerMenu.tsx` | Menú con upsell "Unlock Pro" y restore purchases |
| `src/components/ReverseTrialSlide.tsx` | Reverse trial de 7 días post-primera tarea |
| `src/features/onboarding/components/custom/PaywallSlide.tsx` | Slide informativo de Pro en onboarding |
| `src/features/onboarding/components/custom/PaywallOnboardingSlide.tsx` | Paywall inmediato en onboarding |
| `src/widgets/RoutinesWidget.tsx` | Widget Android con gate Pro |
| `src/widgets/RoutinesIOSWidget.tsx` | Widget iOS con gate Pro |
| `src/widgets/widgetTaskHandler.tsx` | Handler de clicks del widget Android |
| `supabase/migrations/20260503_shop_items.sql` | Migración de tabla shop_items con columna is_pro |
