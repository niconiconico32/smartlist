/**
 * Custom hook para obtener el espacio (inset) que ocupa el TabBar flotante
 * Útil para aplicar paddingBottom en ScrollViews/FlatLists y evitar que el contenido
 * quede oculto detrás de la floating island
 */

export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_BOTTOM_MARGIN = 30;
export const TAB_BAR_TOTAL_INSET = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + 10; // +10 para espacio extra

/**
 * Hook que retorna el padding bottom necesario para evitar que el contenido
 * quede oculto detrás del TabBar flotante
 */
export function useBottomTabInset() {
  return TAB_BAR_TOTAL_INSET; // ~104px
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
