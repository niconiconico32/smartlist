# E2E — Handoff final del funnel web (Brainy app)

Validación integral de la ruta `brainy://claim?token=...&redeem_url=...` +
Redemption Link de RevenueCat sobre un **development build** (Expo Go NO vale).

## Qué valida

| # | Validación | Cómo (runner / UI) (runner → `scripts/e2e-handoff.mjs`, UI → Maestro) |
|---|---|---|
| 1 | Deep link `brainy://claim?token=...&redeem_url=...` parseado | El runner construye el link desde env y Maestro lo abre (`openLink`) |
| 2 | Persistencia del handoff pendiente | El link se abre E inmediatamente el app persiste ambos valores (AsyncStorage); se conservan durante login |
| 3 | Login / auth | Maestro entra al modal de email y firma con `BRAINY_TEST_*` |
| 4 | `Purchases.logIn(user.id)` | Verificado server-side: `original_app_user_id` == `user.id` en RevenueCat REST |
| 5 | `redeemWebPurchase()` | Entitlement `brainy Pro` activo vía RevenueCat REST |
| 6 | `claim-funnel-plan` | El app lo llama; verificado en Supabase (plan `claimed`, ligado al user) |
| 7 | Plan materializado | Conteos en Supabase: +2 actividades, +3 rutinas, +3 pasos (vacío omitido), +1 huevo; merge conserva datos legacy |
| 8 | Navegación a `/plan-ready` | Maestro: `planReadyTitle` visible |
| 9 | Reapertura del MISMO link sin duplicar | 2ª apertura del mismo link → conteos S2 == S1 (idénticos) + entitlement sigue activo |
| 10 | Claim-only sin redención | `--claim-only`: mismo flujo sin ninguna interacción RC |

La verificación **no simula una segunda compra**: la reapertura reutiliza el
mismo link (RevenueCat lo trata como ya canjeado; el app, como `alreadyClaimed`).

## Prerrequisitos

1. **Development build instalado** en el simulador/emulador, con los schemes
   `brainy` y `rc-f91d4f2118` (ya en `app.json`). Generación:
   - iOS: `npx expo run:ios` (dev client) o `eas build --profile development --platform ios`
   - Android: `npx expo run:android` o `eas build ...`
   El runner aborta si `com.brainyahdh.app` no está instalado. **Expo Go falla**
   (RevenueCat no se configura con `isExpoGo`).
2. **Maestro** (`brew install maestro` o desde [docs.maestro.dev](https://docs.maestro.dev)).
   Override del binario: `MAESTRO_BIN=/ruta/a/maestro`.
3. **Supabase** credenciales del proyecto `smartlist-backend` ya desplegado.

## Variables de entorno

| Variable | Obligatoria | Significado |
|---|---|---|
| `SUPABASE_URL` | sí | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | sí | anon key (para sign-in del usuario de prueba) |
| `SUPABASE_SERVICE_KEY` | sí | service_role key (setup del plan + limpieza) |
| `BRAINY_CLAIM_TOKEN` | en claim-only / full con token | token de claim del funnel |
| `BRAINY_REDEMPTION_URL` | en full | Redemption Link `rc-<appid>://…` de RevenueCat |
| `REVENUECAT_PUBLIC_KEY` | en full | public API key del proyecto RevenueCat (para el check REST de Pro) |
| `BRAINY_TEST_EMAIL` + `BRAINY_TEST_PASSWORD` | opcional | cuenta Supabase preexistente; si faltan, el script crea un usuario temporal y lo elimina al final |
| `MAESTRO_BIN` | opcional | binario de Maestro |

## Cómo ejecutar

```bash
# Modo completo (redemption + claim)
export SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_KEY=...
export BRAINY_CLAIM_TOKEN=... BRAINY_REDEMPTION_URL=... REVENUECAT_PUBLIC_KEY=...
npm run test:e2e:handoff

# Solo claim (sin RevenueCat)
export ... BRAINY_CLAIM_TOKEN=...
npm run test:e2e:handoff:claim-only

# Si no quieres que Maestro toque la UI (pasos manuales en consola)
npm run test:e2e:handoff -- --manual
```

El runner: detecta plataforma (`--platform=ios|android`), comprueba dev build y
Maestro, crea/resuelve el usuario, siembra el plan `completed` **solo si el
token aún no tiene plan** (en un E2E real ese plan lo crea el funnel tras la
compra sandbox), ejecuta `01-handoff-open` → verifica backend + RC →
`02-handoff-reopen` → verifica de nuevo (no-dup) → limpia.

> La siembra del plan NO es una compra: replica el resultado final del funnel
> para poder ejercitar `claim-funnel-plan`. En la validación definitiva, el plan
> llegará del propio funnel con el token real de un redemption link de sandbox.

## Política de secretos

- Los valores solo entran por variables de entorno.
- Ningún log, fixture, reporte (`e2e/.artifacts/`, gitignored) o screenshot
  contiene claim token, redemption URL, JWT, email o API keys.
- El runner hace `checkNoSecrets()` antes de cada línea de log: lanza error en
  lugar de filtrar un secreto.
- Los flujos Maestro referencian `${VAR}`; los valores nunca se escriben en el repo.

## Pasos que requieren ejecución MANUAL (no automatizables de forma fiable)

El canje RC ocurre dentro del app (automático) una vez el link existe. Lo que
**no** puede hacer el runner de forma fiable:

1. **Obtener un Redemption Link real de sandbox** (fuera de este workspace):
   - Stripe (test mode) + RevenueCat: genera un link de redención para la
     suscripción y una compra web sandbox, desde el dashboard de RevenueCat
     (Redemption Links) o la URL que genera el funnel web tras la compra.
   - El resultado es un URL tipo `rc-f91d4f2118://...` -> es tu `BRAINY_REDEMPTION_URL`.
   - El claim token del funnel web es tu `BRAINY_CLAIM_TOKEN`.
2. **Estado inicial limpio del dispositivo**: sin sesión previa (ni anónima ni
   logueada) antes del primer run. Si el simulador conserva una sesión
   anónima, el login-upgrade cambia la UI; usa un simulador recién instalado o
   borra la app.
3. (Solo si Maestro/StoreKit fallara) runbook manual:
   ```bash
   # 1) prepara y deja el dispositivo listo
   npm run test:e2e:handoff -- --manual
   # te imprime (redactado) el openurl a ejecutar:
   xcrun simctl openurl booted "brainy://claim?token=***&redeem_url=***"
   ```
   1. Abre la URL en el simulador.
   2. Haz login con el usuario de prueba si te lo pide.
   3. Espera a ver "Tu plan está aquí 🎉" (wizard "Preparando tu Brainy…" antes).
   4. Vuelve a abrir la MISMA URL y confirma que no se duplica nada.
   5. Pulsa ENTER: el runner verifica backend + RevenueCat y limpia.
4. **Verificación final**: `RUN ALL E2E CHECKS PASSED`. Eso NO declara el E2E
   completo: el criterio de cierre es haber ejecutado la suite con un Redemption
   Link generado por una **compra sandbox real** del funnel (paso 1 anterior).

## Escenarios cubiertos (17)

`handoff_full` (token+RC+claim), `handoff_redemption_only` (RC sin token),
`claim_only`, `reopen_no_dup`, `merge_legacy`, `expired`, `invalid_token`,
`belongs_to_other_user`, `claim_failed` (reintentar), `redemption_failed`
(reintentar), `error_network` (reintentar), perfil anónimo → login, y UI
(deep link frío y cálido). Los estados terminales de RC (`EXPIRED`,
`INVALID_TOKEN`, `PURCHASE_BELONGS_TO_OTHER_USER`) se ejercitan de forma nativa
en la pantalla de claim (wizard/errors) y se cubren en `app/claim.tsx`; las
combinaciones de error/degradado requieren simular la respuesta de RC y no
entran en la ejecución feliz del runner.

## Notas de plataforma

- iOS: el simulador debe estar `booted`; Maestro usa `openLink` (nativo de schemes).
- Android: `adb` visible; requiere el empaquetado con los 2 schemes en el intent
  filter (dev build de `expo run:android`).
- Ambos schemes (`brainy`, `rc-f91d4f2118`) conviven (requisito del funnel).