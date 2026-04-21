/**
 * Custom hook para obtener el espacio (inset) que ocupa el TabBar flotante
 * Útil para aplicar paddingBottom en ScrollViews/FlatLists y evitar que el contenido
 * quede oculto detrás de la floating island
 */

import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_BAR_HEIGHT = 64;

/**
 * Hook que retorna el padding bottom necesario para evitar que el contenido
 * quede oculto detrás del TabBar flotante, adaptándose al inset real del dispositivo
 */
export function useBottomTabInset() {
  const insets = useSafeAreaInsets();
  // TAB_BAR_HEIGHT + system nav bar inset + 10px breathing room
  return TAB_BAR_HEIGHT + insets.bottom + 10;
}

/**
 * Ejemplo de uso en una pantalla:
 * 
 * const bottomInset = useBottomTabInset();
 * 
 * return (
 *   <ScrollView 
 *     contentContainerStyle={{ paddingBottom: bottomInset }}
 *   >
 *     // Contenido aqui
 *   </ScrollView>
 * );
 */
