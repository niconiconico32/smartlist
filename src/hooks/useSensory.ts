import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

/**
 * Custom hook para feedback táctil diferenciado
 * Alineado con "Calm Technology" - vibraciones sutiles, cortas y secas
 */
export function useSensory() {
  /**
   * Tap suave para interacciones sutiles (más común)
   * Ej: botones, toggles, gestos ligeros
   */
  const softFeedback = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  /**
   * Celebración suave para completar tareas (calma, no explosiva)
   * Ej: completar tarea, logro tranquilo
   */
  const successFeedback = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  /**
   * Tap mediano para acciones primarias (no pesado ni agresivo)
   * Ej: confirmaciones importantes, navegación
   */
  const crispClick = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  /**
   * Feedback adicional: vibración de advertencia
   * Ej: límite alcanzado, precaución
   */
  const warningFeedback = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  /**
   * Feedback adicional: error
   * Ej: acción no permitida, validación fallida
   */
  const errorFeedback = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  /**
   * Impacto medio para interacciones importantes
   * Ej: selección de item, cambio de tab
   */
  const mediumFeedback = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  return {
    softFeedback,
    successFeedback,
    crispClick,
    warningFeedback,
    errorFeedback,
    mediumFeedback,
  };
}
