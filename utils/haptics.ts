import * as Haptics from "expo-haptics";

// ============================================
// HAPTICS WRAPPER
// Agrupa todo el feedback háptico en una sola
// capa para poder desactivarlo/ajustarlo luego.
// ============================================

export const hapticLight = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const hapticMedium = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

export const hapticHeavy = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
};

// Feedback de selección (avance entre preguntas, toggles)
export const hapticSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const hapticSuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
};

export const hapticWarning = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
    () => {},
  );
};

export const hapticError = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
    () => {},
  );
};
