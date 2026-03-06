/**
 * Configuración global para botones importantes de la aplicación
 * Estos estilos mantienen consistencia visual entre el FAB y los botones principales
 */

import { colors } from './theme';

// Colores del gradiente principal (igual que el FAB - mezcla con colors.primary)
export const PRIMARY_GRADIENT_COLORS = ['#ECF230', '#F2E852'] as const;

// Estilos compartidos para botones principales
export const primaryButtonStyles = {
  borderRadius: 32,
  overflow: 'hidden' as const,
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.25,
  shadowRadius: 12,
  elevation: 10,
};

export const primaryButtonGradient = {
  flexDirection: 'row' as const,
  paddingVertical: 18,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

export const primaryButtonText = {
  fontSize: 16,
  fontWeight: '700' as const,
  color: colors.background, // Texto oscuro sobre gradiente claro
};

// Para botones circulares (como el FAB)
export const circularButtonStyles = {
  width: 70,
  height: 70,
  borderRadius: 35,
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.25,
  shadowRadius: 12,
  elevation: 10,
  overflow: 'hidden' as const,
};

export const circularButtonGradient = {
  width: '100%',
  height: '100%',
  borderRadius: 35,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
