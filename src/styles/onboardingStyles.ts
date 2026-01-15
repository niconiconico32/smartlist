/**
 * Onboarding Styles Configuration
 * Cambia los valores aquí para personalizar el diseño del onboarding
 */

// ========== DIMENSIONES ==========
export const ONBOARDING_DIMENSIONS = {
  // Alturas de las secciones
  titleSectionHeight: 100,
  subtitleSectionHeight: 80,
  imageSectionHeight: 280,
  
  // Tamaño de las imágenes
  imageWidth: 260,
  imageHeight: 240,
  
  // Espaciado general
  horizontalPadding: 24,
  verticalGap: 16,
  marginTop: 16,
  marginBottom: 32,
};

// ========== COLORES ==========
export const ONBOARDING_COLORS = {
  background: '#F5F5F5',
  
  // Textos
  titleColor: '#121212',
  subtitleColor: '#666666',
  buttonTextColor: '#FFFFFF',
  optionTextColor: '#374151',
  
  // Botones y elementos
  primaryButton: '#7F00FF',
  optionButtonBg: '#F9FAFB',
  optionButtonBorder: '#E5E7EB',
  activeDot: '#7F00FF',
  inactiveDot: '#7F00FF',
  
  // Sombras
  shadowColor: '#7F00FF',
};

// ========== TIPOGRAFÍA ==========
export const ONBOARDING_TYPOGRAPHY = {
  // Títulos
  titleFontSize: 28,
  titleFontWeight: '900' as const,
  
  // Subtítulos
  subtitleFontSize: 16,
  subtitleFontWeight: '400' as const,
  subtitleLineHeight: 24,
  
  // Opciones
  optionFontSize: 16,
  optionFontWeight: '500' as const,
  
  // Botón
  buttonFontSize: 16,
  buttonFontWeight: '600' as const,
};

// ========== PUNTOS DE PROGRESO ==========
export const ONBOARDING_DOTS = {
  activeDotWidth: 16,
  activeDotHeight: 14,
  inactiveDotWidth: 9,
  inactiveDotHeight: 9,
  gap: 8,
  marginBottom: 40,
  borderRadius: 25,
};

// ========== BOTONES ==========
export const ONBOARDING_BUTTONS = {
  // Botón principal "Comenzar"
  primaryButtonPaddingHorizontal: 40,
  primaryButtonPaddingVertical: 16,
  primaryButtonMinWidth: '80%',
  primaryButtonBorderRadius: 30,
  primaryButtonMarginBottom: 32,
  
  // Botones de opciones
  optionButtonPaddingHorizontal: 24,
  optionButtonPaddingVertical: 20,
  optionButtonBorderRadius: 16,
  optionButtonBorderWidth: 2,
  optionButtonBorderWidthActive: 3,
  optionButtonGap: 12,
};

// ========== SOMBRAS ==========
export const ONBOARDING_SHADOWS = {
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
};
