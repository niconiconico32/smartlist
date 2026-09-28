# Manual técnico — Recepción de datos del funnel web en la app

> Cómo llegan desde la web de compra (funnel) a la app los datos del plan
> comprado, y por qué está armado así. Readme técnico, no guía de testing
> (esos son `webtoapptests.md` y `e2e/HANDOFF-E2E.md`).
>
> **v2 (funnelremade, 2026-09-16)**: el camino principal ya NO usa deep link ni
> token. El usuario entra con el login normal (OTP/Google/Apple) y la app
> **descubre el plan por su email verificado** (`restore-funnel-plan`). Los
> deep links (`brainy://claim`, `rc-...://`) y `/claim` quedan como **fallback
> legacy**. Ver §12. El resto de este documento describe ese camino legacy, que
> sigue operativo.
>
> **v3 (email+OTP final, 2026-09-17)**: el flujo principal es:
> `restore-funnel-plan` (SÓLO discovery, sin materializar) →
> `Purchases.logIn` → redeem del Redemption Link persistido por la web →
> `finalize-funnel-plan` (verificación server-side de la entitlements "brainy
> Pro" con SECRET API KEY → recién ahí `claim_funnel_plan`). La redempción
> expirada NUNCA materializa: RevenueCat re-envía un link nuevo al email de
> facturación y el plan queda para recovery.

## 1. El problema

Cuando alguien compra en la web, la app necesita:

1. **No cobrar dos veces** (la compra ya se pagó en Stripe/web).
2. **Materializar el plan** (rutinas, hábitos, huevos) **una sola vez**.
3. **Llegar al usuario correcto**, haya o no sesión previa, y sin obligarlo a
   "registrarse" de nuevo con contraseña.

La pieza central es: **la web nunca le manda el plan a la app por QR/valor
directo**. En su lugar crea una fila en Supabase (`web_funnel_plans`) y la
app recibe **solo una referencia** (un `token`) vía deep link.

```
WEB (compras)                    SUPABASE                       APP (móvil)
├─ crea web_funnel_plans ───────►├─ claim_token_hash: sha256(token)
│   status: pending                │  plan: JSON (rutinas/hábitos)
│   email: email de compra       │  email
│                                ├─ edge function claim-funnel-plan
│   deep link con token ────────►└─ (auth.uid() lo reclama) ──► materializa plan
```

El plan **nunca viaja por la URL**. Por la URL solo viaja un `token` de
un solo uso que la app canjea contra el backend autenticado.

## 2. Contrato de datos

### 2.1 Tabla `web_funnel_plans` (Supabase)

Campos usados:

| Campo | Origen | Uso |
|---|---|---|
| `claim_token_hash` | web | `sha256(token)`; la app nunca ve el hash |
| `status` | web | `pending` = plan listo para reclamar |
| `plan` | web | JSON con `tasks`/`routines`/`egg` |
| `email` | web | email de la compra (UI prefill, NO credencial) |
| `source` / `campaign` | web | origen (analytics / no duplicados) |
| `claimed_by_user_id` | RPC | se setea al reclamar → idempotencia (antes `user_id`) |

### 2.1.1 Contrato canónico del payload `plan` (v1) — CONGELADO (2026-09-17)

El backend (y solo el backend) consume este contrato desde
`web_funnel_plans.plan`:

```jsonc
{
  "version": 1,
  "tasks": [            // actividades independientes
    { "title": "Tarea", "emoji": "✨",
      "subtasks": [{ "title": "Sub-paso", "duration": 5 }] }
  ],
  "routines": [ {      // rutinas
    "name": "Rutina",
    "icon": "Sun",
    "days": [0, 2, 4],
    "steps": [ { "title": "Paso 1", "duration": 5 },
               { "title": "Paso 2", "duration": 10 } ],   // ← CANÓNICO
    "egg": { "catalogId": 2 }        // entero > 0, presente en egg_catalog
  } ]
}
```

- **`routines[].steps[].title|duration` ES el campo canónico.** Lo leen
  `_shared/funnel.ts:93` (`buildRoutines`) y el RPC `claim_funnel_plan`
  (`v_routine->'steps'`). `routines[].tasks` es **legacy/incorrecto**: el
  backend lo IGNORA por completo (por eso `routineTasks=0` en planes web).
  - **Coordinación con el agente de la web:** en `funnel.html` /
    `brainy-daily-routines.json` los pasos se emiten como `routine.tasks` —
    hay que cambiarlo a `routine.steps` en el repo WEB. **No se arregla desde
    este repo.**

### 2.2 Edge function `claim-funnel-plan`

- Recibe `{ token }`.
- Busca por `sha256(token)`, valida `status IN (pending, claiming)` (el RPC
  decide retry por el mismo dueño).
- Reclama para `auth.uid()`; si ya tiene `claimed_by_user_id` set, responde
  `alreadyClaimed` (idempotente — **no re-crea nada**).
- Crea rutinas/hábitos/huevos y devuelve un resumen (`ClaimSummary`).

Códigos de error (`ClaimErrorCode`): `invalid_token`, `token_expired`,
`already_claimed`, `plan_not_ready`, `forbidden`, `unknown`
(`src/lib/funnelClaim.ts:36-43`, `normalizeErrorCode` en `:361`).

## 3. Canales de entrada (deep links)

La app acepta 3 formatos (`parseHandoffUrl` en `src/lib/funnelClaim.ts:111`):

| Formato | Ejemplo |
|---|---|
| Query | `brainy://claim?token=<CLT>&redeem_url=<URL>&email=<EM>` |
| Path | `brainy://claim/<token>` |
| Redemption Link | `rc-<appid>://...` (RevenueCat) |

Notas del parseo:

- `redeem_url` suele venir **encodeado** → se decodifica hasta 2 niveles
  (`decodePossiblyEncodedUrl`, `funnelClaim.ts:90`).
- `email` se normaliza a minúsculas.
- Una URL `rc-...` se reconoce por prefijo y se trata como **solo**
  redemption (sin claim token).

## 4. Persistencia en AsyncStorage (el "handoff pendiente")

Todo lo recibido se guarda **al vuelo** y sobrevive a: kill de la app,
cierre, redirecciones OAuth/Apple, reload y cambios de fondo/foreground.

| Key | Qué guarda | Se borra |
|---|---|---|
| `brainy_pending_claim_token` | token (privacy: nunca a analytics) | al claim OK **o** error terminal (`funnelClaim.ts:342`) |
| `brainy_pending_redemption_url` | RC Redemption Link | al redeem OK (`claim.tsx:177`) |
| `brainy_pending_funnel_email` | email de compra (prefill UI) | al completar TODO el flujo (`claim.tsx:265`) |
| `brainy_claim_summary` | resumen para pantalla PlanReady | al terminar (PlanReady) |

**Principio**: un token que da error "de red" **NO se borra** (se puede
reintentar); un error terminal (vencido, inválido, pertence a otra cuenta,
otra vez reclamado) **SÍ lo invalida** para no dejar basura
(`handleFailedClaim`, `funnelClaim.ts:338-347`).

## 5. Recepción del deep link (`app/_layout.tsx`)

Dos escuchas en paralelo:

- **Warm** (app ya abierta): `Linking.addEventListener("url")`
  (`_layout.tsx:445`) → parsea → persiste token/redeem/email →
  `router.replace("/claim")`.
- **Cold** (app cerrada): `Linking.getInitialURL()` (`_layout.tsx:471`).
  `brainy://claim` lo resuelve expo-router solo; pero `rc-<appid>://` **no**
  mapea a ninguna ruta → se captura aquí, se persiste y se enruta a `/claim`.

Ambos guardan primero (AsyncStorage) y navegan después, para que aunque la
navegación pete, el handoff no se pierda.

## 6. Máquina de routing

Dos efectos en `app/_layout.tsx` (rutas en `RootLayoutNav`):

1. **Routing de sesión** (`_layout.tsx:335`):
   - Sin sesión → `/login` (entry point universal).
   - Real user en `/login` → `handoff? → /claim : onboarding? → /onboarding-v3 : /(tabs)`
     (`_layout.tsx:362-377`).
2. **Plumbing de handoff** (`_layout.tsx:403`): si hay token/redeem pendiente
   y hay sesión real y no estamos ya en `/claim` → `router.replace("/claim")`.
   Cubre email/Google/Apple login, OAuth redirects, reloads y ciclos de vida.

Resultado: **donde sea que la app "despierte" con un handoff pendiente,
siempre termina en `/claim`** si ya hay usuario real, o en `/login` si aún no
(para pedir identidad sin tocar el token).

## 7. `app/claim.tsx` — la orquestación

`gatherAndRun` (`claim.tsx:269`) junta parámetros de la URL **o** el estado
pendiente (gana el de la URL), los persiste y ejecuta `process` (`claim.tsx:132`).

Etapas (`buildSteps`, `claim.tsx:49`):

1. **`pro`** (solo si hay `redeem_url`):
   - `ensureRevenueCatLogin(userId)` — vincula RC al usuario de Supabase
     (redemptionService.ts:43). Sin esto un usuario RC anónimo recibiría el
     entitlement sin ser la persona correcta.
   - `redeemWebPurchaseFromUrl(url)` — `parseAsWebPurchaseRedemption` +
     `redeemWebPurchase` (redemptionService.ts:58). Clasifica:
     `success | error | invalid_token | expired | belongs_to_other_user | not_configured`.
   - En éxito: borra la URL pendiente y `activatePermanentPro` (proStore).
2. **`plan`** (si hay claim token): `claimFunnelPlan(token)` (idempotente,
   `funnelClaim.ts:267`, in-flight único por token). `alreadyClaimed` cuenta
   como éxito.
3. **`routines` / `pets`**: `completeOnboarding` (si se claimó) +
   `syncEggsWithCloud` → el usuario ve el plan al instante.

Desenlace (`claim.tsx:212-253`): una máquina pequeña decide `done → plan_ready
| home` o `error → network | invalid/expired_redemption | other_user |
claim_failed | redemption_failed`.

Errores y CTAs (`claim.tsx:381-410`):

| Error | CTA primario | CTA secundario |
|---|---|---|
| `network` | Reintentar (todo) | — |
| `claim_failed` | Reintentar claim (`retryClaim`) | Ir a mi plan |
| `redemption_failed` | Reintentar redemption (`retryRedemption`) | Ir a mi plan |
| `other_user` | Entrar con otra cuenta (`switchAccount` = signOut→login) | Ir a mi plan |
| `invalid/expired` | Ir a mi plan | — |

`retryAll`, `retryClaim`, `retryRedemption` re-ejecutan SOLO la etapa que
falló (nunca re-cobran ni re-crean el plan), porque los refs
(`claimTokenRef`/`redemptionUrlRef`) persisten en memoria.

Al **terminar con éxito** se limpia también el email pendiente
(`claim.tsx:265`); `completeOnboarding` evita que el plan recién reclamado
se pierda por onboarding.

## 8. El login contextual para usuarios SIN sesión

Esto es donde la integración se siente "pesada", y conviene entender por qué:

- Un deep link llega con token, pero **no hay usuario** en el dispositivo.
- El edge function recuperará el plan con `auth.uid()`, así que **hay que
  tener una cuenta**. Para no obligar a elegir contraseña el funnel usa un
  **login por OTP (magic link / código)**.

Cómo funciona (`app/login.tsx`, `LoginModal`):

1. `login.tsx:57` detecta handoff pendiente → banner de funnel + prefill del
   email enmascarado (`fu***@brainyadhd.com`).
2. `LoginModal` en modo `funnel` ofrece OTP: `AuthContext.sendOtp(email)`
   (signInWithOtp, `AuthContext.tsx:384`) → `verifyOtp(email, token)`
   (`AuthContext.tsx:403`, `verifyOtp{type:"email"}`).
3. Al verificar, Supabase crea/abre la sesión real → el routing de
   `_layout.tsx` manda a `/claim` → el token (que seguía pendiente en
   AsyncStorage) se canjea.

**Matiz clave**: el email del funnel es SOLO prefill/UX. La credencial real
es el **claim token** que quedó persistido. Por eso el email no viaja a
analytics ni se trunca como identidad (`funnelClaim.ts:189-193`).

## 9. Privacidad y seguridad (reglas que mantenemos)

- El `token` de claim **nunca** va a PostHog. Solo flags `hasClaimToken`, y
  eventos anónimos: `funnel_claim_received`, `funnel_claim_started/success/
  failed`, `web_redemption_*` (funnelClaim.ts:148-159, 66).
- El `email` del funnel tampoco viaja a analytics.
- El `obfuscatedEmail` de RevenueCat (expired) se usa solo en el copy del
  error, no se loguea (redemptionService.ts:28).
- No hay claves service_role en el cliente; el claim se hace con la sesión
  del usuario (`supabase.functions.invoke` con JWT).

## 10. Mapa de archivos

| Archivo | Rol |
|---|---|
| `src/lib/funnelClaim.ts` | parseo, persistencia AsyncStorage, claim edge fn, idempotencia, analytics |
| `src/lib/redemptionService.ts` | RC login + redeem Web Purchase + clasificación |
| `app/_layout.tsx` | routing de sesión + plumbing de handoff + warm/cold links |
| `app/claim.tsx` | pantalla/orquestación: pasos, errores, retry, plan_ready |
| `app/login.tsx` | entry point universal; banner funnel + prefill email |
| `src/components/LoginModal.tsx` | modal login orgánico + variante OTP funnel |
| `src/contexts/AuthContext.tsx` | `sendOtp` / `verifyOtp`, sesión |
| `app/plan-ready.tsx` | resumen post-claim (lee `ClaimSummary`) |
| `scripts/e2e-handoff.mjs` | seed/verify para E2E manual y automatizado |

## 11. Costos y posibles simplificaciones

Lo que aporta complejidad hoy:

1. **Redemption Link** (`redeem_url`): solo aplica si hay compra vía Stripe
   web. Si todo el funnel es compra in-app o el Pro se gestiona solo por el
   claim, este camino es prescindible — **pero** hoy por hoy es lo que
   garantiza "no cobrar en la app".
2. **OTP / email pendiente**: es la UX del usuario sin sesión. Si se decide
   que el usuario SIEMPRE pasa por login con contraseña (o siempre por
   Google/Apple), el OTP y `brainy_pending_funnel_email` se pueden dejar.
   En ese caso `/claim` sigue igual: el token pendiente se mantiene y tras
   el login se retoma.
3. **3 formatos de URL**: se pueden reducir a uno solo
   (`brainy://claim?token=...&redeem_url=...`) si la web deja de emitir
   path-form y los RC links se resuelven via `rc-...` solo en frío.

Lo que NO conviene simplificar: la **persistencia anticipada** (guardar el
handoff antes de navegar) y la **idempotencia del claim**, porque de ahí
depende que una compra no se duplique ni se pierda con un cierre de la app.

---

## 12. (v2) Camino principal: restore por email verificado

Regla de oro: **el plan se descubre por la identidad del usuario, no por un
token**. El login del app vuelve a ser el de siempre y el funnel ya no añade
pasos ni banners.

```
WEB                              SUPABASE                         APP
├─ compra (Stripe) ─────────────►├─ web_funnel_plans
│                                │    email = email de compra
│  escribe revenuecat_redemption_│    revenuecat_redemption_url  (privada)
│  url (service_role)            │    status = pending
│                                │
│  (sin deep link)               ├─ edge fn restore-funnel-plan (JWT)
└─ "instala la app y entra      │    auth.uid() → email verificado
   con este correo"            │    → match + claim_funnel_plan (RPC)
                                │    → devuelve plan + redemption URL
                                └──────────────────────────────►│ login normal
                                                                 │ (OTP-primero)
                                                                 ▼
                                                          overlay "Preparando…"
                                                                 ▼
                                                               HOME
```

### 12.1 Columna nueva (privada)

`web_funnel_plans.revenuecat_redemption_url TEXT` (migración
`supabase/migrations/20260916_funnel_redemption_restore.sql`).

- La escribe la **web** (service_role) tras compra/trial.
- Nunca sale por RLS (ni anon ni authenticated), ni analytics, ni logs.
- Se consume (→ NULL) con `consume_funnel_redemption(p_plan_id)`, que valida
  `claimed_by_user_id = auth.uid()`. Idempotente.
- Índice `(email, status, created_at DESC)` para el lookup.

### 12.2 Edge function `restore-funnel-plan`

- `verify_jwt = true`. Identidad = JWT (no body). Email = `user.email`
  verificado, normalizado.
- Selecciona **un solo** plan: `status IN (pending, claiming, claimed)`, no
  expirado, `ORDER BY created_at DESC` top-1.
  - `pending` libre (`claimed_by_user_id IS NULL`) → materializa con el MISMO
    RPC `claim_funnel_plan` (idempotente, sin duplicar lógica con la web).
  - `claiming` del mismo usuario → **retry idempotente** por el mismo RPC
    (un claim interrumpido no se "roba": otro usuario/NULL → `403 forbidden`).
  - `claimed` del mismo usuario → replay idempotente (no re-crea nada).
  - `claimed` (o `claiming`) de otro usuario → `403 forbidden` (no filtra datos).
- Devuelve `{ restored, alreadyRestored, planId, summary, redemption:{pending,url?} }`
  o `{ restored:false }`.

> **Contrato único (2026-09-17)**: `web_funnel_plans` usa
> `status IN (pending, claiming, claimed, expired)` y `claimed_by_user_id`
> (reemplaza a `user_id`/`draft`/`completed`). La web escribe `pending`;
> el RPC adquiere `claiming + claimed_by_user_id = auth.uid()` AL INICIO de la
> materialización y pasa a `claimed` solo al terminar; si falla, mantiene
> `claiming + owner` para que el mismo usuario reintente sin duplicar
> (función `claim_funnel_plan` + migración
> `20260917_funnel_plans_single_contract.sql`). ⚠️ Coordinación: el repo web NO
> debe aplicar su migración `20260916000000_secure_funnel_plans_claim.sql`;
> esta migración del app es la única fuente de la transformación.

> **Regla de compañeros (2026-09-18, migración `20260918_funnel_plan_egg_reuse.sql`)**:
> toda rutina funnel que pide `egg.catalogId` termina con EXACTAMENTE un
> compañero. Resolución determinista por rutina:
> 1. **Huevo solicitado**: no poseído → crear `user_eggs` y vincularlo;
>    poseído con `routine_id IS NULL` → reutilizar la fila (conserva XP/pet);
>    poseído y asignado a otra rutina → NO se mueve, pasa al fallback.
> 2. **Fallback**: huevo propio libre (`routine_id IS NULL`), prefiriendo el
>    conjunto de huevos del plan y luego el id menor; si no, huevo activo del
>    catálogo no poseído (mismo orden) → se desbloquea.
> 3. **Sin candidato** → error `egg_unavailable` (P0001): el RPC hace rollback
>    de toda la materialización y el plan queda `claiming + owner` para reintentar
>    (nunca se deja una rutina sin compañero en silencio).
> Invariantes: `UNIQUE(user_id, egg_id)` intacto, nunca se mueve un huevo ya
> asignado, y `eggCatalogId`/`eggCount`/`__materialized` reportan el compañero
> REAL asignado (creado o reutilizado). Tests:
> `npm run test:e2e:funnel-eggs` (`scripts/e2e-funnel-eggs.mjs`).

### 12.3 Cliente

| Archivo | Rol |
|---|---|
| `src/lib/funnelRestore.ts` | invoke + `consumeFunnelRedemption` + tipos + analytics |
| `src/hooks/useFunnelRestore.ts` | orquestador post-login (single-flight por userId): restore → `completeOnboarding` → redeem best-effort |
| `src/store/redemptionStore.ts` | estado persistido de la redemptión pendiente (banner Home) |
| `src/components/RestoringOverlay.tsx` | overlay: spinner "Preparando…" → tarjeta "Tu Brainy está listo" (conteos reales) + CTA "Empezar" → HOME |
| `src/components/LoginModal.tsx` | login **OTP-primero** (sin rama/banner funnel) |
| `app/login.tsx` | entry point universal, sin banner de funnel |
| `app/_layout.tsx` | routing: legacy handoff → `/claim`; si no, `restore-funnel-plan` → HOME |
| `app/(tabs)/index.tsx` | `RedemptionBanner`: reintento no bloqueante |

### 12.4 Redemption y reintentos (no bloqueante)

La redemptión RC corre **best-effort** dentro del restore. Si falla:

- **Red/transitorio** → banner en HOME ("No pudimos confirmar tu suscripción.
  Reintentar"). El retry re-ejecuta **solo** `redeemWebPurchase` (nunca
  re-materializa ni re-cobra).
- **Terminal** (expired / invalid / de otra cuenta) → banner informativo, sin
  retry, con vía de soporte.
- Éxito → `consume_funnel_redemption` (invalida la URL) y se oculta el banner.

### 12.5 Login OTP-primero

- Paso 1: email → `sendOtp` (Supabase `signInWithOtp`, auto-crea la cuenta).
- Paso 2: código → `verifyOtp` → sesión.
- Enlace "Entrar con contraseña" para cuentas existentes; Google/Apple intactos.
- Ya **no** hay modo signup con contraseña ni banner `funnelLoginHint`.

### 12.6 Analytics (spec §30)

`funnel_restore_check_started`, `funnel_restore_not_found`,
`funnel_restore_found`, `funnel_restore_materialization_started/success/failed`,
`funnel_restore_complete`; y para redemptión
`web_purchase_redemption_started/success/failed`. Los eventos legacy
(`funnel_claim_*`, `web_redemption_*`) siguen para el camino compat.

### 12.7 Qué se mantiene tal cual

- El RPC `claim_funnel_plan` y la idempotencia del claim (compartidos).
- `/claim`, `/plan-ready`, los 3 formatos de deep link y el login contextual
  legacy: **fallback**, para links ya emitidos.