/**
 * Smartlist Theme
 * Clean & Mindful Design - Calm Technology with Mint Green accent
 * Inspired by peace, focus, and organic softness
 */

export const colors = {
  // Base Colors (Deep Charcoal Canvas)
  background: '#1C2120',    // Deep charcoal with subtle green undertone
  surface: '#2C3331',       // Slightly elevated surfaces
  surfaceElevated: '#3A4240', // Hover/pressed states
  
  // Text Colors (Soft and readable)
  textPrimary: '#F0F7F4',     // Off-white with mint hint
  textSecondary: '#8B9E96',   // Sage gray for subtitles
  textTertiary: '#6B7C75',    // Muted gray-green
  disabled: '#4A5550',        // Low emphasis
  
  // Brand Colors (Purple)
  primary: '#8334D2',         // Purple - Main accent
  primaryDark: '#6b2aae',     // Darker purple for pressed states
  primaryLight: '#9b4fe6',    // Lighter purple for highlights
  
  // Status Colors (Soft and muted)
  success: '#A8E6CF',         // Mint green for success
  warning: '#FDFD96',         // Pale yellow
  danger: '#FF8B94',          // Salmon red (soft, not aggressive)
  
  // UI States (Subtle and organic)
  border: 'rgba(168, 230, 207, 0.1)',  // Very subtle mint tint
  borderActive: 'rgba(168, 230, 207, 0.3)',
};

// Soft, diffused elevation shadows (no glow)
export const shadows = {
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  // Subtle depth for special states
  focus: {
    shadowColor: '#A8E6CF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};

// Increased spacing for breathing room
export const spacing = {
  xs: 6,    // Increased for breathing room
  sm: 12,   // More generous
  md: 20,   // Enhanced whitespace
  lg: 32,   // Spacious
  xl: 48,   // Very spacious
  xxl: 64,  // Maximum breathing room
};

// Pill-shaped border radius
export const borderRadius = {
  sm: 12,   // Softer corners
  md: 18,   // Friendly curves
  lg: 24,   // Pill-like
  xl: 30,   // Maximum softness
  full: 9999, // Perfect circles
};

// Lighter font weights for calmness
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '600' as const,  // Semibold instead of Bold
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '500' as const,  // Medium instead of Semibold
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '500' as const,  // Medium instead of Semibold
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '500' as const,  // Medium instead of Semibold
    lineHeight: 16,
  },
};

// Calm design utilities (replacing neonStyles)
export const calmStyles = {
  // Subtle border for cards
  subtleBorder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Active state with soft highlight
  activeAccent: {
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: 'rgba(168, 230, 207, 0.05)',
  },
  // Pill-shaped button
  pillButton: {
    borderRadius: 9999,
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  // Card with soft elevation
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 32,
    ...shadows.medium,
  },
};

export default {
  colors,
  shadows,
  spacing,
  borderRadius,
  typography,
  calmStyles,
};

