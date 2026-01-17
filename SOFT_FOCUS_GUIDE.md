# 🎨 Guía Rápida: Soft Focus (Pastel Dark)

## La Paleta

### 1️⃣ El Lienzo (Backgrounds - Velvet)
```tsx
background: '#1E1E2E'  // Deep Dream - Violeta-gris mate
surface: '#313244'     // Soft Layer - Tarjetas/Modales
```

### 2️⃣ La Energía (Pastel Dopamine)
```tsx
primary: '#CBA6F7'    // Lavender Haze - Creatividad, calma, magia
success: '#A6E3A1'    // Matcha Latte - Crecimiento, frescura
accent: '#FAB387'     // Peach Fuzz - Calidez, cercanía
```

### 3️⃣ Los Avisos
```tsx
danger: '#F38BA8'     // Soft Coral - Corrige sin regañar
warning: '#F9E2AF'    // Cream Yellow - Advertencias suaves
```

### 4️⃣ Texto (Lectura Cómoda)
```tsx
textPrimary: '#CDD6F4'    // Cloud White - Blanco hueso
textSecondary: '#A6ADC8'  // Mist Grey - Gris niebla
```

---

## 💡 Recomendaciones UX

### 1. Glassmorphism "Frosted" (No brillante, opaco)
```tsx
import { colors, velvetStyles } from '@/constants/theme';

// Usa esto:
<View style={velvetStyles.glass}>
  {/* backgroundColor: rgba(49, 50, 68, 0.8) - más opaco */}
</View>

// O manualmente:
<View style={{
  backgroundColor: colors.glass,  // rgba(49, 50, 68, 0.8)
  borderWidth: 1,
  borderColor: colors.glassBorder,  // rgba(203, 166, 247, 0.2)
  borderRadius: 32,  // ¡Muy redondeado!
}}>
```

### 2. Bordes Redondeados Exagerados (Squishy)
```tsx
import { borderRadius } from '@/constants/theme';

// En React Native:
borderRadius: borderRadius.xl,   // 32
borderRadius: borderRadius['2xl'], // 40
borderRadius: borderRadius['3xl'], // 48

// En Tailwind (NativeWind):
className="rounded-4xl"  // 32px
className="rounded-5xl"  // 40px
className="rounded-6xl"  // 48px
```

### 3. Gradiente "Digital Sunset" 🌅 (Tendencia 2026)
Para botones principales (CTAs):

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/theme';

<LinearGradient
  colors={gradients.sunset}  // ['#CBA6F7', '#FAB387']
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={{
    borderRadius: 32,
    paddingVertical: 18,
    paddingHorizontal: 32,
  }}
>
  <Text style={{ color: '#1E1E2E', fontWeight: '600' }}>
    Comenzar Tarea
  </Text>
</LinearGradient>
```

### 4. Tipografía
- **Recomendada**: Nunito, Varela Round, o Quicksand (rounded fonts)
- **Peso**: Usa **SemiBold (600)** para que los pasteles se lean bien
- **Evita**: Fuentes muy delgadas (300) con colores pastel

```tsx
import { typography } from '@/constants/theme';

<Text style={[
  typography.h2,  // fontSize: 24, fontWeight: '600'
  { color: colors.textPrimary }
]}>
  Mi Título
</Text>
```

---

## 🎯 Ejemplos Prácticos

### Tarjeta de Tarea (Frosted Glass)
```tsx
import { colors, borderRadius, shadows } from '@/constants/theme';

<View style={{
  backgroundColor: colors.glass,  // Frosted, no brillante
  borderRadius: borderRadius.xl,  // 32 - muy redondeado
  borderWidth: 1,
  borderColor: colors.glassBorder,
  padding: 24,
  ...shadows.medium,
}}>
  <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600' }}>
    Título de la tarea
  </Text>
  <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
    Descripción suave y legible
  </Text>
</View>
```

### Botón de Progreso (Matcha)
```tsx
<Pressable
  style={{
    backgroundColor: colors.success,  // #A6E3A1 - Matcha
    borderRadius: borderRadius.full,  // Pill shape
    paddingVertical: 16,
    paddingHorizontal: 28,
    ...shadows.glow,  // Resplandor lavanda
  }}
>
  <Text style={{ color: colors.background, fontWeight: '600' }}>
    ¡Completado! ✓
  </Text>
</Pressable>
```

### Botón de Eliminar (Soft Coral - no agresivo)
```tsx
<Pressable
  style={{
    backgroundColor: 'rgba(243, 139, 168, 0.15)',  // Coral suave con opacidad
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.danger,  // #F38BA8
    paddingVertical: 12,
    paddingHorizontal: 20,
  }}
>
  <Text style={{ color: colors.danger, fontWeight: '600' }}>
    Eliminar
  </Text>
</Pressable>
```

---

## 🎨 Paleta Completa (Hex)

```
Deep Dream:     #1E1E2E
Soft Layer:     #313244

Lavender Haze:  #CBA6F7
Matcha Latte:   #A6E3A1
Peach Fuzz:     #FAB387
Soft Coral:     #F38BA8
Cream Yellow:   #F9E2AF

Cloud White:    #CDD6F4
Mist Grey:      #A6ADC8
Overlay Grey:   #6C7086
```

---

## 📦 Imports

```tsx
// Todo desde un solo lugar:
import { 
  colors, 
  gradients, 
  shadows, 
  borderRadius, 
  typography,
  velvetStyles 
} from '@/constants/theme';
```

---

**✨ Sensación general**: Flotando en una nube/neblina, blando (squishy), mágico pero tranquilo.
