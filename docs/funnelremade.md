Quiero SIMPLIFICAR la arquitectura actual de recepción del funnel web-to-app de Brainy.

IMPORTANTE:
No estamos reconstruyendo todo desde cero.
Ya existe una implementación robusta con:

- web_funnel_plans
- claim-funnel-plan
- Supabase Auth
- OTP
- RevenueCat redemption
- persistencia AsyncStorage
- idempotencia
- materialización de plan
- login como entry point universal

Quiero reutilizar esas piezas, pero cambiar la UX y el routing.

==================================================
OBJETIVO DE PRODUCTO
==================================================

El nuevo flujo definitivo debe ser:

WEB

Funnel completado
↓
Email
↓
Paywall
↓
Purchase / Free Trial
↓
Plan + compra quedan asociados al email
↓
Email de confirmación:
“Tu Brainy está listo.
Abre Brainy e inicia sesión con este mismo correo.”
↓

APP

Abrir Brainy
↓
LOGIN ORIGINAL
↓
Introducir email
↓
OTP enviado al correo
↓
Verificar OTP
↓
Supabase user autenticado
↓
buscar automáticamente plan web pendiente
↓
RevenueCat identity
↓
redimir compra web si corresponde
↓
materializar plan
↓
hábitos/tareas/rutinas/huevos ya presentes
↓
HOME

El usuario NO debe necesitar:

- abrir un deep link especial;
- copiar un token;
- navegar manualmente por /claim;
- navegar por /plan-ready;
- entender RevenueCat redemption links;
- volver a configurar hábitos.

==================================================
1. PRINCIPIO CENTRAL
==================================================

El email verificado por Supabase OTP pasa a ser el mecanismo de descubrimiento del plan.

IMPORTANTE:

El cliente NO debe enviar arbitrariamente:

findPlan("email@ejemplo.com")

La identidad debe derivarse exclusivamente de la sesión autenticada.

Después del OTP:

Supabase JWT
↓
auth.uid()
auth email verificado
↓
backend busca un web_funnel_plan pendiente para ese email.

El email del request NO debe considerarse una credencial.

==================================================
2. CONSERVAR LOGIN ORIGINAL
==================================================

NO crear una pantalla nueva.

NO crear:

- FunnelLogin
- FunnelOtp
- RestorePlanLogin

Reutilizar:

app/login.tsx
src/components/LoginModal.tsx
AuthContext

La pantalla original de login sigue siendo el entry point universal para cualquier usuario sin sesión.

Actualmente esto ya está implementado:

sin sesión
→ /login

Conservarlo.

==================================================
3. UX DEL LOGIN
==================================================

Quiero simplificar también el login.

No debe necesitar saber de antemano si el usuario viene del funnel.

La experiencia normal puede ofrecer:

- email / OTP
- password si ya existe
- Google
- Apple

Pero para nuevos usuarios debemos poder usar:

Email
↓
Enviar OTP
↓
Código
↓
Sesión

No hace falta mostrar un banner especial de:

“Tenemos un claim pendiente”

si todavía no sabemos que existe.

Primero autenticamos.

DESPUÉS descubrimos automáticamente si existe un plan.

==================================================
4. USUARIO ORGÁNICO / ASO / DIRECTO
==================================================

Este flujo debe seguir funcionando perfectamente.

Instala Brainy
↓
login original
↓
OTP/signup/login
↓
backend busca plan web pendiente
↓
NO encuentra ninguno
↓
usuario nuevo → onboarding actual
↓
Brainy

NO bloquear usuarios que nunca hicieron el funnel.

NO exigir compra web.

NO exigir claim token.

NO exigir RevenueCat redemption.

==================================================
5. USUARIO DEL FUNNEL
==================================================

El usuario completó el funnel con:

usuario@gmail.com

Después abre Brainy.

Flujo:

login original
↓
usuario@gmail.com
↓
OTP
↓
verifyOtp
↓
Supabase session
↓
buscar plan pendiente automáticamente
↓
plan encontrado
↓
restaurarlo
↓
saltar onboarding
↓
HOME con sus datos ya creados

El usuario debe ver sus hábitos/tareas/rutinas/huevos desde la primera entrada real a la app.

==================================================
6. NUEVA EDGE FUNCTION
==================================================

Crear una Edge Function nueva:

restore-funnel-plan

o adaptar la existente si hacerlo es significativamente más limpio.

Preferencia:

restore-funnel-plan

La función NO recibe email.

El cliente solo invoca:

supabase.functions.invoke("restore-funnel-plan")

La función debe:

1. validar JWT;
2. obtener usuario autenticado;
3. obtener auth.uid();
4. obtener el email VERIFICADO de Supabase Auth;
5. normalizar email:
   - lowercase
   - trim
6. buscar web_funnel_plans compatible.

Criterios conceptuales:

email normalizado = auth email
status IN (pending, claiming, claimed) y no expirado
claimed_by_user_id NULL (primera reclamación) o = auth.uid() (retry/replay)

Preferir el plan más reciente válido si existieran varios.

No asumir silenciosamente qué hacer con múltiples planes.
Implementar una política determinista y documentarla.

==================================================
7. SEGURIDAD
==================================================

La consulta del plan ocurre SERVER-SIDE.

NO crear una política pública:

SELECT web_funnel_plans WHERE email = ...

El cliente nunca debe poder enumerar planes por email.

web_funnel_plans debe continuar protegido por RLS.

El service role puede utilizarse dentro de Edge Function, nunca en la app.

==================================================
8. RELACIÓN CON claim-funnel-plan
==================================================

Actualmente claim-funnel-plan:

- recibe token;
- busca sha256(token);
- valida estado;
- usa auth.uid();
- materializa plan;
- es idempotente.

NO perder esta lógica.

Actualmente esa idempotencia evita recrear datos si el plan ya fue reclamado. Esa propiedad debe conservarse. El sistema actual ya trata `alreadyClaimed` como éxito. :contentReference[oaicite:1]{index=1}

Puedes:

A)
hacer que restore-funnel-plan localice el plan y reutilice internamente la lógica de materialización;

o

B)
refactorizar la materialización a una función/RPC común que puedan usar tanto claim-funnel-plan como restore-funnel-plan.

Preferir B si evita duplicar lógica.

NO mantener dos implementaciones separadas de:

- creación de hábitos;
- rutinas;
- huevos;
- user_state;
- idempotencia.

==================================================
9. MATERIALIZACIÓN
==================================================

Al restaurar exitosamente el funnel deben aparecer exactamente los datos que el usuario definió en web.

Mantener el modelo ya existente.

Tareas normales:
→ user_state.activities

Rutinas:
→ routines

Pasos de rutinas:
→ routine_tasks

Huevos:
→ user_eggs / sincronización correspondiente

NO generar contenido distinto.

NO volver a elegir hábitos.

NO pedir onboarding nuevamente.

==================================================
10. “6 HÁBITOS”
==================================================

Si el contrato actual del funnel produce 6 hábitos:

el backend debe materializar esos 6.

No hardcodear artificialmente “6” si el payload real puede variar en el futuro.

Usar el contenido real de:

web_funnel_plans.plan

Después devolver un resumen:

{
  restored: true,
  activitiesCount,
  routinesCount,
  eggsCount,
  ...
}

==================================================
11. REVENUECAT / COMPRA WEB
==================================================

El funnel web compra mediante:

RevenueCat Web SDK
↓
Stripe Billing
↓
brainy Pro

La compra ocurre ANTES de que exista una cuenta Supabase.

Por eso seguimos necesitando RevenueCat redemption.

PERO:

el usuario ya NO debería tener que llegar con:

brainy://claim?...redeem_url=...

La redemption debe descubrirse junto con el plan.

==================================================
12. GUARDAR REDEMPTION DEL LADO WEB/BACKEND
==================================================

Modificar el contrato de web_funnel_plans si es necesario para que el backend pueda asociar la compra web pendiente con ese plan.

Debe existir una forma segura de almacenar:

- información necesaria para RevenueCat redemption;
- asociada al plan;
- NO accesible públicamente;
- NO enviada a analytics;
- NO mostrada en logs.

Si RevenueCat devuelve una redemption URL desde el funnel web:

guardar esa información de forma segura en backend al completar la compra.

Por ejemplo conceptualmente:

revenuecat_redemption_url

o estructura equivalente.

IMPORTANTE:

Esta columna NO debe tener SELECT público.

NO almacenar redemption data en analytics.

NO imprimirla en logs.

==================================================
13. RESTORE + REVENUECAT
==================================================

Después del OTP:

restore-funnel-plan puede devolver al cliente, únicamente para el usuario autenticado y verificado:

- existePlan
- plan metadata necesaria
- redemption info pendiente, si existe
- estado de restauración

Entonces la APP ejecuta:

1. Purchases.logIn(auth.uid())
2. parseAsWebPurchaseRedemption(...)
3. redeemWebPurchase(...)
4. verificar:

customerInfo.entitlements.active["brainy Pro"]

5. materializar/reclamar plan si todavía no fue materializado.

Revisar APIs exactas de la versión instalada de react-native-purchases.

NO asumir signatures.

==================================================
14. ORDEN RECOMENDADO
==================================================

Después del OTP:

authenticated
↓
restore lookup
↓
plan encontrado
↓
Purchases.logIn(auth.uid())
↓
redeem compra web
↓
verificar brainy Pro
↓
materializar plan
↓
completeOnboarding
↓
sync
↓
HOME

Si el plan no tiene purchase/redemption pendiente, manejarlo según el estado real sin inventar un entitlement.

==================================================
15. FALLAS PARCIALES
==================================================

Este punto es obligatorio.

Caso:

RevenueCat redemption ✓
materialización ✗

Resultado:

- conservar Pro;
- reintentar materialización;
- NO volver a cobrar;
- NO volver a hacer signup.

Caso:

materialización ✓
RevenueCat redemption ✗

Resultado:

- NO duplicar plan;
- permitir retry solo de redemption.

Caso:

redemption ya realizada

→ tratar como éxito.

Caso:

plan ya claimed por mismo usuario

→ éxito idempotente.

Caso:

plan pertenece a otro usuario

→ error seguro.

==================================================
16. ESTADO INTERNO
==================================================

Internamente puede existir algo como:

checking
no_plan
plan_found
identifying_revenuecat
redeeming
restoring
complete
error

PERO:

NO convertir cada estado en una pantalla/ruta distinta.

La UX debe ser simple.

==================================================
17. UX DE RESTAURACIÓN
==================================================

Después del OTP, si se encuentra plan:

mostrar dentro del flujo actual una vista/loading sencilla:

“Preparando tu Brainy…”

Ejemplos opcionales:

✓ Recuperando tu plan
✓ Preparando tus hábitos
✓ Sincronizando tus compañeros

Duración solo la necesaria para operaciones reales.

NO crear una nueva pestaña de navegación.

Al terminar:

router.replace("/(tabs)")

El usuario entra directamente al Home.

==================================================
18. ELIMINAR /CLAIM COMO PASO DE UX
==================================================

Actualmente app/claim.tsx orquesta:

- RevenueCat
- claim
- sync
- errores

y maneja muchos estados. :contentReference[oaicite:2]{index=2}

Quiero sacar `/claim` del CAMINO PRINCIPAL del usuario.

NO borrar inmediatamente lógica útil.

Primero:

- extraer lógica reutilizable;
- moverla a services/hooks/orchestrator;
- dejar claim.tsx como fallback temporal si hace falta.

El objetivo final es que:

OTP
→ restore orchestrator
→ HOME

sin navegación visible:

/claim
→ /plan-ready
→ /(tabs)

==================================================
19. /PLAN-READY
==================================================

app/plan-ready.tsx deja de ser necesaria en el flujo normal.

NO necesitamos una pantalla adicional que diga:

“Tu plan está listo”

si el usuario puede entrar directamente a Home y verlo.

Puede mantenerse temporalmente durante migración, pero no debe ser requisito.

==================================================
20. DEEP LINKS
==================================================

Actualmente existen:

brainy://claim?token=...
brainy://claim/<token>
rc-...://...

y el sistema tiene listeners warm/cold. :contentReference[oaicite:3]{index=3}

Quiero reducir esta complejidad.

Para el flujo normal funnel → email → app:

NO se necesita deep link con claim token.

El usuario abre Brainy normalmente.

Mantener únicamente los deep links técnicamente necesarios como:

- OAuth
- RevenueCat fallback/redemption si RevenueCat lo requiere
- compatibilidad con links antiguos

NO hacer que el nuevo funnel dependa de ellos.

==================================================
21. COMPATIBILIDAD CON LINKS ANTIGUOS
==================================================

No rompas inmediatamente usuarios que pudieran tener un:

brainy://claim...

válido.

Mantener parseHandoffUrl y la infraestructura antigua durante una etapa de compatibilidad.

Si llega un claim link antiguo:

procesarlo correctamente.

Pero el nuevo flujo principal es:

email + OTP + backend lookup.

==================================================
22. ASYNCSTORAGE
==================================================

Actualmente existen:

brainy_pending_claim_token
brainy_pending_redemption_url
brainy_pending_funnel_email
brainy_claim_summary

y sobreviven cierres/OAuth. :contentReference[oaicite:4]{index=4}

No borrar soporte de golpe.

Pero el nuevo happy path NO debería necesitar:

brainy_pending_claim_token
brainy_pending_funnel_email

porque:

- el email viene de Supabase Auth;
- el plan se descubre server-side.

Mantener keys antiguas para backward compatibility mientras migra el sistema.

Documentar cuáles quedan legacy.

==================================================
23. EMAIL DE CONFIRMACIÓN
==================================================

La app no envía este email, pero su arquitectura debe asumir el siguiente copy/flujo:

Después de compra:

“Tu Brainy está listo”

“Abre Brainy e inicia sesión con:
usuario@gmail.com”

“Te enviaremos un código para verificar tu correo.”

No asumir que el usuario llega pulsando un botón especial.

Debe poder:

1. cerrar navegador;
2. buscar Brainy manualmente;
3. instalarla desde App Store;
4. escribir el mismo email;
5. recibir OTP;
6. obtener automáticamente su plan.

ESTE ES UN CRITERIO DE ACEPTACIÓN CRÍTICO.

==================================================
24. ONBOARDING
==================================================

Mantener onboarding existente.

Después de autenticar:

RESTORE LOOKUP

Si:

plan pendiente encontrado
→ restore
→ completeOnboarding
→ HOME

Si:

no hay plan
y usuario nuevo
→ onboarding-v3

Si:

no hay plan
y usuario existente
→ HOME

No cambiar contenido del onboarding.

==================================================
25. LOGIN ENTRY POINT
==================================================

Mantener:

sin sesión
→ /login

Esto ya se implementó y es correcto. :contentReference[oaicite:5]{index=5}

No volver al comportamiento antiguo de mandar nuevos usuarios directamente al onboarding.

==================================================
26. GOOGLE / APPLE
==================================================

OTP será el happy path recomendado para el funnel.

Pero no romper:

- Sign in with Apple
- Google
- password/email existentes

Si el usuario del funnel usa Google/Apple y Supabase devuelve el MISMO email verificado que tiene el plan:

también debería poder encontrarse el plan.

Si el provider devuelve otro email:

NO asociar automáticamente el plan por heurísticas.

==================================================
27. MULTIPLES PLANES PARA UN EMAIL
==================================================

Definir explícitamente comportamiento.

Recomendación:

buscar únicamente planes:

status IN (pending, claiming, claimed)
no expirados

ordenar:

created_at DESC

reclamar el más reciente.

Pero:

si existe una razón de negocio para restaurar varios planes, reportarla antes de implementar.

No materializar automáticamente múltiples funnels.

==================================================
28. EMAIL NORMALIZATION
==================================================

Normalizar consistentemente en web y backend:

lowercase
trim

No realizar transformaciones agresivas tipo:

- eliminar puntos de Gmail;
- eliminar +aliases;

porque podrían asociar cuentas incorrectamente.

==================================================
29. IDEMPOTENCIA
==================================================

Debe mantenerse como propiedad central.

Actualmente el backend ya evita recrear plan al repetir claim. :contentReference[oaicite:6]{index=6}

La nueva restauración también debe soportar:

OTP dos veces
app reopen
network retry
restore function repetida
same email login nuevamente

sin duplicar:

- tasks
- routines
- eggs
- activities

==================================================
30. ANALYTICS
==================================================

Eventos sugeridos:

auth_login_view
auth_otp_sent
auth_otp_verified

funnel_restore_check_started
funnel_restore_not_found
funnel_restore_found

revenuecat_identity_ready
web_purchase_redemption_started
web_purchase_redemption_success
web_purchase_redemption_failed

funnel_restore_materialization_started
funnel_restore_materialization_success
funnel_restore_materialization_failed

funnel_restore_complete

NO enviar:

email
OTP
redemption URL
claim tokens
plan JSON completo

==================================================
31. LIMPIEZA DE ARQUITECTURA
==================================================

Una vez que el nuevo camino esté probado:

identificar qué puede marcarse deprecated:

- funnel-specific login banner
- pending funnel email
- claim-token happy-path routing
- /claim navigation
- /plan-ready
- multiple claim URL formats

NO eliminarlos en el mismo paso si son necesarios para compatibilidad.

Primero dejar:

new path = default
old path = compatibility fallback

Después podremos eliminarlos en otro PR.

==================================================
32. NO HACER
==================================================

NO:

- crear nuevas pestañas;
- crear nueva pantalla de login;
- hacer que el usuario copie códigos distintos del OTP;
- depender de claimToken para el nuevo happy path;
- depender de deep link para encontrar el plan;
- buscar planes desde cliente por email;
- exponer SELECT de web_funnel_plans;
- poner service_role en app;
- volver a mostrar paywall después de compra web;
- crear hábitos desde el cliente si backend ya los materializa;
- eliminar onboarding orgánico;
- bloquear usuarios que no hicieron funnel;
- romper Apple/Google login;
- duplicar lógica de materialización.

==================================================
33. CRITERIOS DE ACEPTACIÓN
==================================================

CASO A — Funnel happy path

Usuario:
1. termina funnel en web;
2. usa user@example.com;
3. inicia trial/compra;
4. cierra el navegador;
5. instala Brainy manualmente desde App Store;
6. abre Brainy;
7. ve login ORIGINAL;
8. escribe user@example.com;
9. recibe OTP;
10. introduce OTP;
11. Supabase crea/recupera cuenta;
12. app encuentra automáticamente su plan;
13. RevenueCat queda asociado al Supabase user;
14. compra web se redime;
15. brainy Pro está activo;
16. plan se materializa;
17. usuario entra a HOME;
18. sus hábitos/tareas/rutinas/huevos ya están presentes.

NO abrió ningún deep link especial.

CASO B — Usuario orgánico

App Store
→ Brainy
→ login
→ OTP/signup
→ no existe web plan
→ onboarding existente
→ HOME

CASO C — Usuario existente

Abrir app
→ sesión válida
→ HOME

CASO D — mismo usuario reinstala

Login mismo email
→ plan ya reclamado
→ NO duplicar datos
→ HOME

CASO E — redemption falla

Plan no se duplica.
No volver a cobrar.
Permitir retry.

CASO F — materialización falla

Pro permanece.
Permitir retry.
No duplicar datos.

CASO G — legacy deep link

brainy://claim?...
→ sigue funcionando durante periodo de compatibilidad.

==================================================
34. ANTES DE MODIFICAR
==================================================

Primero inspecciona y reporta:

1. implementación actual de web_funnel_plans;
2. claim-funnel-plan;
3. app/claim.tsx;
4. funnelClaim.ts;
5. redemptionService.ts;
6. AuthContext;
7. LoginModal;
8. app/login.tsx;
9. _layout routing;
10. completeOnboarding;
11. cómo se materializan actualmente tasks/routines/eggs;
12. si existe ya una forma backend de guardar RevenueCat redemption info.

Después propón el diff mínimo.

No hagas un refactor masivo sin necesidad.

==================================================
35. ENTREGA
==================================================

Al terminar reporta:

- migraciones creadas/modificadas;
- Edge Functions creadas/modificadas;
- servicios/hooks extraídos;
- routing anterior vs nuevo;
- qué rutas quedan solo como legacy;
- cómo se hace matching por email verificado;
- cómo se protege contra account takeover;
- cómo se obtiene/redime RevenueCat purchase;
- cómo se conserva idempotencia;
- cómo se decide onboarding vs restored plan;
- qué AsyncStorage keys quedan deprecated;
- tests realizados;
- TODOs.

Además actualizar:

funnel-handoff-tecnico.md

para documentar la NUEVA arquitectura.

El README debe dejar muy claro que:

el happy path ya NO depende del claim token/deep link.

No declares que algo funciona si no fue probado.