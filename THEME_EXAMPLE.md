# Clean & Mindful Theme - Example Usage

## Generic Card Component with New Visual Identity

```tsx
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows, calmStyles } from '@/constants/theme';

interface CardProps {
  title: string;
  subtitle?: string;
  isActive?: boolean;
  onPress?: () => void;
}

export const MindfulCard = ({ title, subtitle, isActive, onPress }: CardProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isActive && styles.cardActive,
        pressed && styles.cardPressed,
      ]}
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,        // 24px - pill shape
    padding: spacing.lg,                  // 32px - generous breathing room
    marginBottom: spacing.md,             // 20px - spacious gaps
    borderWidth: 1,
    borderColor: colors.border,           // Subtle rgba(168, 230, 207, 0.1)
    ...shadows.medium,                    // Soft diffused shadow
  },
  
  cardActive: {
    borderColor: colors.borderActive,     // Slightly more visible mint
    backgroundColor: 'rgba(168, 230, 207, 0.05)', // Subtle mint tint
    ...shadows.focus,                     // Gentle elevation boost
  },
  
  cardPressed: {
    backgroundColor: colors.surfaceHighlight, // #3A4240
    transform: [{ scale: 0.98 }],         // Minimal squish (calm, not bouncy)
  },
  
  title: {
    fontSize: typography.sizes.lg,        // 18px
    fontWeight: typography.weights.medium, // 500 (not bold)
    color: colors.text.primary,           // #F0F7F4 off-white
    marginBottom: spacing.xs,             // 6px
  },
  
  subtitle: {
    fontSize: typography.sizes.sm,        // 14px
    fontWeight: typography.weights.regular, // 400
    color: colors.text.secondary,         // #8B9E96 sage gray
    lineHeight: 20,                       // Comfortable reading
  },
});
```

## Button Example (Pill-shaped Primary Action)

```tsx
const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: colors.primary,      // #A8E6CF mint green
    borderRadius: borderRadius.round,     // Full pill shape
    paddingVertical: spacing.md,          // 20px vertical
    paddingHorizontal: spacing.lg,        // 32px horizontal
    alignItems: 'center',
    ...shadows.medium,
  },
  
  buttonText: {
    fontSize: typography.sizes.md,        // 16px
    fontWeight: typography.weights.medium, // 500 (readable, not bold)
    color: colors.background,             // #1C2120 dark text on mint
  },
});
```

## Color Palette Visual Reference

### Background Layers
- **Canvas**: `#1C2120` - Deep charcoal with green undertone (matte, not pure black)
- **Surface**: `#2C3331` - Cards, modals, elevated elements
- **Highlight**: `#3A4240` - Pressed/hover states

### Text Hierarchy
- **Primary**: `#F0F7F4` - Main text (off-white, reduces eye strain)
- **Secondary**: `#8B9E96` - Subtitles, metadata (sage gray)
- **Tertiary**: `#6B7C75` - Placeholders, low emphasis

### Accent Colors
- **Primary**: `#A8E6CF` - Mint green (buttons, active states, checks)
- **Success**: `#A8E6CF` - Same as primary (consistency > variety)
- **Warning**: `#FDFD96` - Pale yellow (soft alert)
- **Error**: `#FF8B94` - Salmon red (gentle, not alarming)

### Design Principles Applied
1. **No Neon Glows**: Replaced with soft diffused shadows (shadowOpacity: 0.08-0.12)
2. **Pill Shapes**: borderRadius 24-30px for friendly, organic curves
3. **Generous Spacing**: padding/margin increased 50% (md: 16→20, lg: 24→32)
4. **Lighter Fonts**: Medium (500) instead of Bold (700) for calmness
5. **Subtle Borders**: rgba with 0.1-0.3 opacity instead of solid bright colors
6. **Whitespace Priority**: Increased all spacing values for breathing room
7. **Matte Finish**: No glossy effects, reflections, or metallic sheens

### Haptic Alignment
- Changed `crispClick` from Heavy→Medium (less aggressive)
- Keep Light for most interactions (soft taps)
- Success vibration remains gentle notification
