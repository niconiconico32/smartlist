import React from "react";
import Svg, { Path } from "react-native-svg";

// Chevron izquierdo pixel tomado de assets/btn/chevron-left.svg
// (path original con fill="currentColor", aquí recibe el color por prop).
interface Props {
    color?: string;
    size?: number;
}

export default function ChevronLeftIcon({
    color = "#FFFFFF",
    size = 24,
}: Props) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                d="M8 13v-2h2v2zm2-2V9h2v2zm0 4v-2h2v2zm2-6V7h2v2zm0 8v-2h2v2zm2-10V5h2v2zm0 12v-2h2v2z"
                fill={color}
            />
        </Svg>
    );
}
