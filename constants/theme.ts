/**
 * Smartlist Theme
 * 🎨 Soft Focus (Pastel Dark)
 * Inspirado en Catppuccin - Velvet backgrounds, pastel energy, frosted glass
 */

export const colors = {
  // 1️⃣ EL LIENZO (Backgrounds - Velvet)
  background: '#1E1E2E',      // Deep Dream - Violeta-gris mate
  surface: '#313244',         // Soft Layer - Grafito suave para cards/modals
  surfaceHighlight: '#45475A', // Highlight layer
  surfaceElevated: '#45475A', // Hover/pressed states
  
  // 4️⃣ TEXTO (Lectura Cómoda)
  textPrimary: '#CDD6F4',     // Cloud White - Blanco hueso/nube
  textSecondary: '#A6ADC8',   // Mist Grey - Gris niebla
  textTertiary: '#6C7086',    // Overlay Grey - Texto terciario
  disabled: '#585B70',        // Low emphasis
  
  // 2️⃣ LA ENERGÍA (Pastel Dopamine)
  primary: '#CBA6F7',         // Lavender Haze - Creatividad, calma, magia
  primaryDim: '#8966C2',      // Versión oscura para fondos
  primaryContent: '#1E1E2E',  // Texto sobre el color primario
  primaryDark: '#8966C2',     // Alias para compatibilidad
  primaryLight: '#DFC0FF',    // Lighter lavender for highlights
  
  // STATUS COLORS
  success: '#A6E3A1',         // Matcha Latte - Crecimiento orgánico, frescura
  warning: '#F9E2AF',         // Cream Yellow - Advertencias suaves
  danger: '#F38BA8',          // Soft Coral - Corrige sin regañar
  accent: '#FAB387',          // Peach Fuzz - Calidez, cercanía
  
  // UI States (Frosted glass - más opaco/esmerilado)
  border: 'rgba(203, 166, 247, 0.12)',  // Subtle lavender tint
  borderActive: 'rgba(203, 166, 247, 0.35)',
  
  // Glass effect colors - Frosted, no brillante
  glass: 'rgba(49, 50, 68, 0.8)',      // Frosted surface más opaco
  glassBorder: 'rgba(203, 166, 247, 0.2)',
  glassStrong: 'rgba(49, 50, 68, 0.95)', // Para modals importantes
};

// 🌅 Gradients for buttons and accents
export const gradients = {
  // Digital Sunset (Tendencia 2026) - Lavender to Peach
  sunset: ['#CBA6F7', '#FAB387'],
  digitalSunset: { start: '#CBA6F7', end: '#FAB387' }, // Para LinearGradient
  
  // Lavender Dream
  lavender: ['#CBA6F7', '#DFC0FF'],
  lavenderDream: { start: '#CBA6F7', end: '#DFC0FF' },
  
  // Matcha Mist
  success: ['#A6E3A1', '#C6F7C3'],
  matchaMist: { start: '#A6E3A1', end: '#C6F7C3' },
  
  // Coral Glow
  danger: ['#F38BA8', '#FFBDC9'],
};

// Soft, diffused elevation shadows with pastel glow
export const shadows = {
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  // Lavender glow for primary actions
  glow: {
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  // Peach glow for accents
  accentGlow: {
    shadowColor: '#FAB387',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
};

// Increased spacing for breathing room
export const spacing = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 32,
  xl: 48,
  xxl: 64,
};

// Exaggerated rounded corners for "squishy" feel
export const borderRadius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,    // Extra rounded for cards
  '2xl': 40, // Very squishy
  '3xl': 48, // Maximum squish
  full: 9999,
};

// Typography - Recommend using Nunito, Varela Round, or Quicksand
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '500' as const,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
};

// Velvet Dark design utilities
export const velvetStyles = {
  // Frosted glass card
  glass: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.xl,
  },
  // Subtle border for cards
  subtleBorder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Active state with lavender highlight
  activeAccent: {
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: 'rgba(203, 166, 247, 0.08)',
  },
  // Squishy pill-shaped button
  pillButton: {
    borderRadius: 9999,
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  // Card with frosted glass effect
  card: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 24,
    ...shadows.medium,
  },
  // Primary gradient button (Digital Sunset)
  gradientButton: {
    borderRadius: borderRadius.xl,
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
};

// Alias for backwards compatibility
export const calmStyles = velvetStyles;

export default {
  colors,
  gradients,
  shadows,
  spacing,
  borderRadius,
  typography,
  velvetStyles,
  calmStyles,
};

