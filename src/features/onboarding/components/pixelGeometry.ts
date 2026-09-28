// Geometría pixel compartida para los botones del onboarding.
// Un único path contiguo (cap izquierdo + caja central + cap derecho) evita la
// costura (hairline) entre shapes separadas. La altura es parametrizable para
// botones que crecen con el contenido.
export function pixelButtonPath(width: number, height: number): string {
    return `M0 6 H3 V3 H3 V0 H${width - 6} V3 H${width - 3} V6 H${width} V${height - 6} H${width - 3} V${height - 3} H${width - 6} V${height} H6 V${height - 3} H3 V${height - 6} H0 V6 Z`;
}
