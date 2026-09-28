import React from "react";
import Svg, { Path } from "react-native-svg";

// Check pixel tomado de assets/btn/check.svg
// (path original con fill="currentColor", aquí recibe el color por prop).
interface Props {
    color?: string;
    size?: number;
}

export default function CheckIcon({
    color = "#FFFFFF",
    size = 24,
}: Props) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                d="M10 18H8v-2h2v2Zm-2-2H6v-2h2v2Zm4-2v2h-2v-2h2Zm-6 0H4v-2h2v2Zm8 0h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2V8h2v2Zm2-2h-2V6h2v2Z"
                fill={color}
            />
        </Svg>
    );
}
