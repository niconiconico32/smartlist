# 🧪 Modo Developer - Brainy

## Configuración

Los botones de prueba y funcionalidades de desarrollo se controlan desde:
📁 `constants/config.ts`

## Para Producción (Play Store)

```typescript
export const DEV_MODE = false; // o simplemente __DEV__
export const SHOW_TEST_BUTTONS = false;
```

## Para Development/Testing

```typescript
export const DEV_MODE = __DEV__ || true;
export const SHOW_TEST_BUTTONS = true;
```

## ¿Qué se oculta en producción?

✅ Botones de prueba en la pantalla principal:
- Explorar Onboarding
- Última Pantalla (Chart)
- Ver Paywall
- Racha Día 1
- Racha Día 5

## Cambiar antes de hacer build de producción:

1. Abrir `constants/config.ts`
2. Cambiar `SHOW_TEST_BUTTONS = false`
3. Hacer build: `eas build --platform android --profile production`

## Nota

Por defecto usa `__DEV__` que automáticamente es:
- `true` en desarrollo (expo start)
- `false` en builds de producción

Si quieres forzar modo developer en un build, cambia a:
```typescript
export const SHOW_TEST_BUTTONS = __DEV__ || true;
```
