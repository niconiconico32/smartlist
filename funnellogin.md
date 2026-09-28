Quiero actualizar el flujo inicial de Brainy para soportar correctamente el nuevo funnel web-to-app.

IMPORTANTE:
- NO crear una nueva pantalla de login.
- Debemos reutilizar y adaptar la pantalla de login ORIGINAL que ya existe en la app.
- La pantalla de login debe convertirse en el punto inicial para usuarios no autenticados.
- Actualmente los nuevos usuarios llegan directamente al onboarding: eso debe cambiar.
- Los usuarios ya autenticados deben seguir entrando directamente a la app.

========================================
ARQUITECTURA OBJETIVO
========================================

USUARIO QUE VIENE DEL FUNNEL:

Funnel web
↓
Email
↓
Paywall
↓
Purchase / Free Trial
↓
Success
↓
Open Brainy
↓
LOGIN ORIGINAL / OTP
↓
Supabase user
↓
RevenueCat identity
↓
Redeem web purchase
↓
Claim funnel plan
↓
Crear los 6 hábitos
↓
App

USUARIO QUE DESCUBRE BRAINY DIRECTAMENTE:

App Store / ASO / tráfico directo
↓
Abrir Brainy
↓
LOGIN ORIGINAL
↓
nuevo usuario
↓
ONBOARDING ACTUAL
↓
App

USUARIO EXISTENTE:

Abrir Brainy
↓
sesión Supabase existente
↓
App

No bloquear ni perjudicar a usuarios que no vienen del funnel.

========================================
1. NUEVO ENTRY FLOW DE LA APP
========================================

Actualmente un usuario nuevo/no autenticado entra directamente al onboarding.

Cambiar esto.

A partir de ahora:

- Si existe una sesión Supabase válida:
  → continuar directamente a la app.

- Si NO existe sesión:
  → mostrar primero la pantalla de login ORIGINAL de Brainy.

NO crear:
- LoginFunnelScreen
- FunnelAuthScreen
- nueva pantalla duplicada de autenticación

Reutilizar el componente/ruta de login existente.

La pantalla de login pasa a ser el entry point general para cualquier usuario no autenticado.

========================================
2. DOS CONTEXTOS PARA EL MISMO LOGIN
========================================

La misma pantalla de login debe soportar dos contextos.

A) NORMAL

Usuario abrió Brainy normalmente.

No existe ningún funnel pendiente.

El login debe funcionar como actualmente:

- login usuario existente
- signup nuevo usuario
- Google
- Apple
- email
- cualquier método ya existente

Si el usuario crea una cuenta nueva por esta vía:

→ continuar al ONBOARDING ACTUAL.

No modificar ni eliminar el onboarding existente.

Queremos:

Login
→ nuevo usuario normal
→ onboarding existente
→ Brainy

B) FUNNEL

Existe un handoff pendiente proveniente de web.

Por ejemplo:

- claimToken
- redemptionInfo / redemption URL
- email del funnel

En este caso seguimos mostrando EXACTAMENTE la misma pantalla de login.

Pero se puede adaptar su contenido/contexto para facilitar OTP.

Ejemplo:

“Tu plan Brainy está listo”

“Confirma tu correo para continuar”

Email:
ni***@gmail.com

[Enviar código]

NO construir una nueva pantalla completa para esto.

Debe ser una variante/estado de la pantalla de login existente.

========================================
3. HANDOFF DEL FUNNEL
========================================

La app recibirá datos provenientes del funnel.

Puede existir:

claimToken

RevenueCat redemption information

email

Al recibirlos:

1. validar estructura básica;
2. guardar temporalmente los datos;
3. NO intentar reclamar el plan todavía si no existe sesión;
4. abrir/reutilizar la pantalla de login original.

Persistir temporalmente en AsyncStorage para sobrevivir:

- cierre de app
- background
- OAuth
- reload

Ejemplo conceptual:

brainy_pending_funnel_handoff

{
  claimToken,
  redemptionUrl,
  email
}

No mandar estos datos a analytics.

========================================
4. EMAIL DEL FUNNEL
========================================

Si el handoff contiene email:

NO volver a pedirlo innecesariamente.

La pantalla de login original debe poder recibir:

initialEmail

y prellenarlo.

Ejemplo:

usuario@gmail.com

Mostrarlo enmascarado cuando sea apropiado:

us***@gmail.com

Permitir:

“Usar otro correo”

como opción secundaria.

El email NO es la identidad definitiva del plan.

El claimToken sigue siendo la credencial para reclamar el plan.

========================================
5. OTP
========================================

Para usuarios provenientes del funnel queremos priorizar OTP.

Usar Supabase Auth.

Si la pantalla de login actual todavía no soporta OTP:

AGREGAR OTP DENTRO DE LA PANTALLA EXISTENTE.

NO crear otra pantalla de login separada.

Puede ser un estado interno:

loginMode = "normal"
loginMode = "funnelOtp"

Flujo:

email
↓
sendOtp()
↓
usuario introduce código
↓
verifyOtp()
↓
Supabase session

Reutilizar servicios Auth existentes siempre que sea posible.

No reemplazar Google/Apple/email/password actuales.

========================================
6. USUARIO FUNNEL DESPUÉS DEL OTP
========================================

Una vez autenticado:

obtener:

session.user.id

Este será el identificador canónico.

Después ejecutar EN ESTE ORDEN:

1. asegurar RevenueCat identity;
2. redimir compra web;
3. reclamar plan;
4. materializar los hábitos;
5. entrar a Brainy.

========================================
7. REVENUECAT IDENTITY
========================================

Antes de redimir:

ejecutar o asegurar:

Purchases.logIn(session.user.id)

NO usar una identidad RevenueCat anónima como identidad final.

Queremos:

Supabase auth.users.id
=
RevenueCat App User ID

Esperar confirmación de identity/login antes de continuar con redemption.

========================================
8. REDEEM WEB PURCHASE
========================================

Si existe RevenueCat redemption pendiente:

usar las APIs oficiales ya disponibles en react-native-purchases:

parseAsWebPurchaseRedemption(...)

redeemWebPurchase(...)

Adaptar exactamente a la versión instalada del SDK.

No asumir signatures sin comprobar typings.

Después verificar:

customerInfo.entitlements.active["brainy Pro"]

Si el entitlement está activo:

purchaseRedemptionComplete = true

IMPORTANTE:

El usuario YA compró o inició free trial en web.

NO mostrar otro paywall.

========================================
9. CLAIM DEL PLAN
========================================

Después de tener usuario Supabase autenticado:

usar:

claim-funnel-plan

Input:

claimToken

La función debe asociar el plan al:

auth.uid()

y materializar las entidades.

No mandar user_id desde cliente.

========================================
10. LOS 6 HÁBITOS
========================================

El plan del funnel debe producir finalmente 6 hábitos reales de Brainy.

No crear hábitos antes del claim.

El backend/app debe tomar el plan temporal y convertirlo al modelo real existente.

Resultado esperado:

6 hábitos creados para ese usuario.

Si existen sub-tareas/rutinas/huevos asociados:

materializarlos utilizando las estructuras existentes.

No duplicar hábitos si el claim se reintenta.

========================================
11. IDEMPOTENCIA
========================================

El flujo debe soportar:

- abrir link dos veces;
- cerrar/reabrir app;
- OTP dos veces;
- redemption ya completado;
- claim ya completado.

Nunca duplicar:

- hábitos;
- rutinas;
- huevos;
- plan.

Si el plan ya fue reclamado por el mismo usuario:

tratarlo como éxito.

========================================
12. FINAL DEL FLUJO FUNNEL
========================================

Después de:

✓ usuario autenticado
✓ RevenueCat identificado
✓ purchase redimida
✓ brainy Pro activo
✓ plan reclamado
✓ 6 hábitos creados

mostrar una transición breve usando UI existente o una pantalla mínima compatible con el diseño actual:

“Tu Brainy está listo”

“Tus 6 hábitos ya están preparados.”

CTA:

“Empezar”

Después:

→ app principal.

NO mandar al onboarding normal.

El usuario del funnel ya hizo su onboarding/personalización en web.

========================================
13. USUARIO NORMAL / ASO / DIRECTO
========================================

Esto es crítico.

Un usuario que instala Brainy directamente desde App Store/Google Play debe poder usar la app normalmente.

Flujo:

instala app
↓
no tiene sesión
↓
LOGIN ORIGINAL
↓
signup
↓
ONBOARDING ACTUAL
↓
Brainy

NO exigir:

- claimToken
- compra web
- funnel
- redemption URL

No mostrar errores porque no existe funnel.

No bloquear acceso porque no compró previamente.

El onboarding actual debe permanecer como experiencia predeterminada para un nuevo usuario normal.

========================================
14. USUARIO EXISTENTE
========================================

Si ya existe sesión:

App launch
↓
auth session válida
↓
Brainy

No mostrar:

- login
- onboarding
- funnel claim

excepto si explícitamente abrió un funnel handoff pendiente.

Si un usuario existente abre un link de funnel:

usar su sesión actual para:

RevenueCat identity
→ redemption
→ claim

sin pedir login nuevamente.

========================================
15. ROUTING / DECISIÓN INICIAL
========================================

Centralizar la decisión.

Conceptualmente:

if (authenticated && pendingFunnel) {
  processFunnelHandoff()
}

else if (authenticated) {
  goToApp()
}

else if (pendingFunnel) {
  goToExistingLogin({ mode: "funnel" })
}

else {
  goToExistingLogin({ mode: "normal" })
}

Después de signup normal:

if (!pendingFunnel) {
  goToExistingOnboarding()
}

Después de auth funnel:

if (pendingFunnel) {
  processFunnelHandoff()
}

No repartir estas reglas arbitrariamente entre muchas pantallas.

========================================
16. ONBOARDING ACTUAL
========================================

NO eliminarlo.

NO rehacerlo.

NO cambiar su contenido salvo que técnicamente sea necesario para routing.

Debe seguir funcionando para:

- instalaciones orgánicas;
- ASO;
- tráfico directo;
- usuarios nuevos fuera del funnel.

Solo debe saltarse cuando:

pendingFunnel === true
y
el claim fue válido/completado.

========================================
17. LOGIN ORIGINAL
========================================

Antes de implementar:

identificar:

- archivo/ruta real del login actual;
- AuthContext;
- navegación actual;
- lógica signup/login;
- OAuth;
- pantalla onboarding;
- lógica que actualmente manda directamente al onboarding.

Modificar la arquitectura actual en vez de duplicarla.

La pantalla visual original debe seguir siendo el login principal.

========================================
18. ANALYTICS
========================================

Reutilizar PostHog existente.

Eventos sugeridos:

login_view
normal_signup_started
normal_signup_completed

funnel_handoff_received
funnel_login_view
funnel_otp_sent
funnel_otp_verified

revenuecat_identity_ready
web_purchase_redemption_started
web_purchase_redemption_success
web_purchase_redemption_failed

funnel_claim_started
funnel_claim_success
funnel_claim_failed

funnel_plan_ready

No enviar:

- email
- OTP
- claimToken
- redemption token
- redemption URL

========================================
19. ERRORES
========================================

Si falla OTP:

mantener login.

Si falla redemption pero la compra existe:

NO mostrar otro paywall.

Mostrar posibilidad de reintentar.

Si falla claim:

NO crear manualmente hábitos parciales desde UI.

Permitir retry.

Si redemption funciona pero claim falla:

mantener brainy Pro y reintentar solo claim.

Si claim funciona pero redemption tarda:

NO duplicar claim.

========================================
20. ESTADO DEL HANDOFF
========================================

Considerar una pequeña state machine:

received
auth_required
authenticated
revenuecat_identified
purchase_redeemed
plan_claimed
complete

Persistir suficiente estado para recuperar un proceso interrumpido.

========================================
21. LIMPIEZA
========================================

Eliminar pending funnel data SOLO cuando el proceso esté realmente completo.

No borrarlo inmediatamente después de OTP.

Limpiar:

claimToken
redemption data
pending email

cuando:

purchase redemption + claim
hayan terminado correctamente.

========================================
22. CRITERIOS DE ACEPTACIÓN
========================================

Debe funcionar:

A)

Instalación orgánica

Open Brainy
→ login original
→ signup
→ onboarding existente
→ app

B)

Usuario existente

Open Brainy
→ sesión existente
→ app

C)

Usuario funnel nuevo

Open Brainy desde funnel
→ login original en modo funnel
→ email prellenado
→ OTP
→ Supabase user
→ Purchases.logIn
→ redeem web purchase
→ brainy Pro
→ claim plan
→ 6 hábitos
→ app

D)

Usuario funnel ya autenticado

Open funnel link
→ no login
→ RevenueCat redemption
→ claim
→ app

E)

Cerrar la app durante OTP

Reabrir
→ conservar handoff
→ continuar

F)

Cerrar después del pago pero antes del claim

Reabrir
→ continuar sin volver a pagar

G)

Abrir el mismo link dos veces

→ no duplicar hábitos

========================================
23. NO HACER
========================================

NO:

- crear una pantalla de login nueva;
- eliminar la pantalla de login existente;
- mandar nuevos usuarios directamente al onboarding antes del login;
- eliminar el onboarding existente;
- obligar a usuarios orgánicos a tener funnel;
- obligar a usuarios orgánicos a comprar antes de entrar;
- mostrar paywall nativo después de una compra web válida;
- crear otro sistema Auth;
- utilizar email como identidad principal;
- duplicar RevenueCat identity;
- crear hábitos antes de autenticación;
- guardar OTP/token en analytics;
- modificar la web funnel desde este repo.

========================================
24. ANTES DE IMPLEMENTAR
========================================

Primero inspecciona y dime:

1. cuál es exactamente la pantalla de login original;
2. por qué actualmente un usuario nuevo entra directamente al onboarding;
3. dónde está la decisión de routing inicial;
4. cómo se determina actualmente si onboarding fue completado;
5. cómo AuthContext determina la sesión;
6. cómo PurchasesContext hace Purchases.logIn;
7. dónde conviene almacenar pendingFunnelHandoff.

Después implementa el cambio.

========================================
25. ENTREGA FINAL
========================================

Reporta:

- archivos modificados;
- routing anterior vs nuevo;
- cómo se reutilizó el login original;
- cómo se diferencia normal vs funnel;
- cambios OTP;
- cómo sobrevive el handoff durante OAuth/reload;
- RevenueCat redemption;
- claim plan;
- creación de los 6 hábitos;
- cómo se preservó onboarding normal;
- tests realizados;
- TODOs pendientes.

No declares funcional nada que no hayas probado.