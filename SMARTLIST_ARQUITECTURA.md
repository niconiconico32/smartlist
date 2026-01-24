# 📱 SmartList - Documentación Técnica

## 🏗️ Arquitectura

### Stack Tecnológico
| Capa | Tecnología |
|------|------------|
| **Framework** | React Native + Expo (~54.0.27) |
| **Navegación** | Expo Router (file-based routing) |
| **Estado** | useState/useCallback + AsyncStorage |
| **Estilos** | NativeWind (TailwindCSS) + StyleSheet |
| **Animaciones** | React Native Reanimated (~4.1.1) |
| **Backend** | Supabase (Edge Functions en Deno) |
| **Notificaciones** | expo-notifications |

### Estructura de Carpetas
```
smartlist/
├── app/                    # Rutas (Expo Router)
│   ├── (tabs)/             # Tab Navigator
│   │   ├── index.tsx       # Tab Tareas
│   │   ├── two.tsx         # Tab Rutinas  
│   │   └── swipeable-layout.tsx  # Layout principal
│   ├── _layout.tsx         # Root layout
│   ├── onboarding.tsx      # Onboarding
│   └── paywall.tsx         # Paywall
├── src/
│   ├── components/         # Componentes reutilizables
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilidades (Supabase, Storage, Notifications)
│   ├── store/              # Estado global (taskStore)
│   └── styles/             # Estilos compartidos
├── supabase/functions/     # Edge Functions
│   ├── divide-task/        # Dividir tarea con IA
│   ├── parse-recipe/       # Parsear recetas
│   └── transcribe-task/    # Transcripción de voz
└── constants/              # Colores y temas
```

---

## 🎯 Funcionalidades Principales

### 1. Tab Tareas (`index.tsx`)
- ✅ Crear tareas con texto o voz
- ✅ Subtareas automáticas (IA divide tareas complejas)
- ✅ Modo Focus/Ejecución de tareas
- ✅ Tareas recurrentes (diaria, semanal, etc.)
- ✅ Celebración con confetti al completar
- ✅ **Streak se activa al completar cualquier tarea**

### 2. Tab Rutinas (`two.tsx`)
- ✅ Rutinas por días de la semana
- ✅ Tareas arrastrables (reordenar)
- ✅ Recordatorios con notificaciones
- ✅ Reset automático cada día nuevo
- ✅ **Streak se activa al completar una rutina entera**

### 3. Sistema de Racha/Streak 🔥
- Badge animado en `FocusHeroCard`
- Se activa al:
  - Completar una tarea (Tab Tareas)
  - Completar una rutina entera (Tab Rutinas)
- Solo cuenta 1 vez por día
- Se reinicia si pasa más de 1 día sin actividad

### 4. Calendario Semanal (`WeeklyCalendar.tsx`)
- Muestra puntos de actividad por día
- Selector de fecha

### 5. Notificaciones (`notificationService.ts`)
- Recordatorios de rutinas
- Programables por hora

---

## 🔄 Flujos Principales

### Flujo de Tareas
```
Usuario abre app
    ↓
Tab Tareas (index.tsx)
    ↓
[+] FAB o botón de voz
    ↓
TaskModalNew.tsx (crear tarea)
    ↓
Supabase divide-task (si tiene subtareas)
    ↓
ActivityButton.tsx (mostrar tarea)
    ↓
Tap → FocusModeScreen.tsx (ejecutar)
    ↓
Completar → Streak actualizado 🔥
```

### Flujo de Rutinas
```
Usuario swipea a Tab Rutinas
    ↓
two.tsx (lista de rutinas del día)
    ↓
RoutineCard.tsx (tarjeta de rutina)
    ↓
Tap → RoutineDetailModal.tsx (ver/completar tareas)
    ↓
Todas completadas → Streak actualizado 🔥
    ↓
Botón editar → EditRoutineModal.tsx (reordenar)
    ↓
FAB → CreateRoutineModal.tsx (nueva rutina)
```

### Flujo de Streak
```
Usuario completa tarea/rutina
    ↓
onTaskCompleted() / onRoutineCompleted()
    ↓
updateStreakOnTaskComplete() en swipeable-layout.tsx
    ↓
Verificar si ya contó hoy
    ↓
Si no: incrementar streak + guardar fecha
    ↓
FocusHeroCard muestra badge 🔥 con animación pulsante
```

---

## 🗄️ Persistencia (AsyncStorage)

| Key | Contenido |
|-----|-----------|
| `@smartlist_activities` | Tareas del usuario |
| `@smartlist_routines` | Rutinas con sus tareas |
| `@smartlist_routines_last_reset` | Fecha del último reset de rutinas |
| `@smartlist_streak` | `{ count: number, lastCompletedDate: string }` |

---

## 🎨 Componentes Principales

| Componente | Propósito |
|------------|-----------|
| `FocusHeroCard` | Hero card con frases motivacionales + badge streak |
| `WeeklyCalendar` | Calendario horizontal con actividad |
| `LiquidFAB` | Botón flotante animado |
| `ActivityButton` | Tarjeta de tarea individual |
| `RoutineCard` | Tarjeta de rutina |
| `CreateRoutineModal` | Modal para crear rutinas |
| `EditRoutineModal` | Modal para editar rutinas (drag & drop) |
| `RoutineDetailModal` | Modal para ver/completar tareas |
| `TaskModalNew` | Modal para crear tareas |
| `FocusModeScreen` | Pantalla de ejecución de tarea |
| `SubtaskListScreen` | Lista de subtareas |
| `SuccessScreen` | Celebración con confetti |

---

## 🔧 Edge Functions (Supabase)

| Función | Propósito |
|---------|-----------|
| `divide-task` | Divide tareas complejas en subtareas con IA |
| `transcribe-task` | Transcribe audio a texto |
| `parse-recipe` | Parsea recetas de cocina |

---

## 📦 Dependencias Clave

- **expo-blur**: Efectos de glassmorphism
- **react-native-reanimated**: Animaciones fluidas
- **react-native-draggable-flatlist**: Listas arrastrables
- **expo-haptics**: Feedback táctil
- **expo-notifications**: Notificaciones locales
- **lucide-react-native**: Iconos
- **date-fns**: Manejo de fechas

---

## 🎨 Paleta de Colores

```typescript
// constants/theme.ts
colors = {
  lavender: '#CBA6F7',    // Primary
  peach: '#FAB387',       // Accent
  dark: '#1E1E2E',        // Text
  flamingo: '#F2CDCD',    // Secondary
  mauve: '#DDB6F2',       // Tertiary
}
```

---

*Documento generado el 20 de Enero, 2026*
