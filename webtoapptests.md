| Caso                           | Resultado esperado                            |
| ------------------------------ | --------------------------------------------- |
| Instalación limpia, sin funnel | Login → signup → onboarding                   |
| Usuario existente              | Login/sesión → app                            |
| Funnel + usuario nuevo         | Login contextual → OTP → redeem → claim → app |
| Funnel + usuario ya logueado   | Redeem → claim → app, sin login               |
| Cerrar app antes del OTP       | Continúa handoff                              |
| Cerrar app después de OTP      | Continúa redeem/claim                         |
| Redemption falla               | Retry, sin nuevo paywall                      |
| Claim falla                    | Retry, sin duplicados                         |
| Abrir mismo link 2 veces       | 6 hábitos una sola vez                        |
| Compra web válida              | `brainy Pro` activo y **cero paywall nativo** |
