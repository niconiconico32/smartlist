# 🐛 Debug Panel

Panel flotante de desarrollo que aparece solo en modo `__DEV__`.

## 🎯 Ubicación

Botón rojo flotante en la esquina inferior derecha de la pantalla principal (encima del tab bar).

## ✨ Funcionalidades

### 🔧 Acciones Rápidas

- **Borrar Tareas**: Elimina todas las tareas de AsyncStorage sin afectar rachas
- **Resetear Racha**: Limpia los datos de racha
- **Borrar Todo**: Limpia completamente AsyncStorage (requiere reinicio)
- **Recargar Datos**: Refresca la vista de datos del panel

### 🔥 Simular Rachas

Botones rápidos para probar pantallas de racha:
- 1, 3, 5, 7, 14, 30 días
- Activa automáticamente `StreakSuccessScreen`

### 📊 Visor de AsyncStorage

Muestra en tiempo real:
- **Tareas**: JSON completo de todas las actividades guardadas
- **Racha**: Datos de streak actuales
- Scroll independiente para cada sección

### ℹ️ App Info

Información de la build actual:
- Package name
- Versión
- Entorno (DEV/PROD)

## 🚀 Uso

1. Abre la app en modo desarrollo (`npm start`)
2. Verás el botón rojo en la esquina inferior derecha
3. Toca para abrir el panel
4. El panel se muestra como modal desde abajo

## 🔐 Seguridad

El panel **SOLO aparece cuando `__DEV__ === true`**, es decir:

- ✅ Visible en: `npm start` / development builds
- ❌ NO visible en: production builds (`eas build --profile production`)

## 🎨 Diseño

- Color distintivo rojo (#FF6B6B) para diferenciarlo de funcionalidad productiva
- Icono de Bug (🐛) para identificación visual
- Modal oscuro coherente con el theme de la app

## 📝 Código

Componente: `src/components/DebugPanel.tsx`
Integración: `app/(tabs)/index.tsx`

## 🔄 Cómo Desactivar

Si necesitas desactivar temporalmente:

```typescript
// constants/config.ts
export const SHOW_DEBUG_PANEL = false; // Agregar esta línea

// Y luego en index.tsx
{DEV_MODE && SHOW_DEBUG_PANEL && <DebugPanel ... />}
```

O simplemente comenta la línea del render en `index.tsx`.
