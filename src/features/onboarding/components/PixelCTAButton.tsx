import { colors } from "@/constants/theme";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
    type GestureResponderEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { pixelButtonPath } from "./pixelGeometry";

// Medidas tomadas directo del SVG exportado de Figma (btnCTAOnboarding.svg)
const HEIGHT = 48; // alto real del botón
const SHADOW = 3; // desplazamiento de la sombra
const COLOR = colors.surface; // fill del botón
const COLOR_PRIMARY = colors.primary;
const SHADOW_COLOR = "#0a0a0a";

type Props = {
    label: string;
    onPress?: (e: GestureResponderEvent) => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: "default" | "primary";
};

export default function PixelCTAButton({
    label,
    onPress,
    disabled = false,
    loading = false,
    variant = "default",
}: Props) {
    const [width, setWidth] = useState(0);

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            style={[styles.root, (disabled || loading) && styles.disabled]}
        >
            {({ pressed }) => (
                <View
                    style={styles.container}
                    onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
                >
                    {width > 0 && (
                        <>
                            <Svg
                                style={styles.svg}
                                width={width + SHADOW}
                                height={HEIGHT + SHADOW}
                                viewBox={`0 0 ${width + SHADOW} ${HEIGHT + SHADOW}`}
                            >
                                {/* sombra: misma forma, offset 3,3, sin blur. Se oculta al presionar */}
                                {!pressed && (
                                    <Path
                                        d={pixelButtonPath(width, HEIGHT)}
                                        fill={SHADOW_COLOR}
                                        transform={`translate(${SHADOW} ${SHADOW})`}
                                    />
                                )}
                                {/* botón: se desplaza 3px al presionar, como si se hundiera */}
                                <Path
                                    d={pixelButtonPath(width, HEIGHT)}
                                    fill={variant === "primary" ? COLOR_PRIMARY : COLOR}
                                    transform={
                                        pressed ? `translate(${SHADOW} ${SHADOW})` : undefined
                                    }
                                />
                            </Svg>
                            {/* Texto centrado con flexbox: idéntico en iOS y Android (sin lineHeight/textAlignVertical) */}
                            <View
                                style={[
                                    styles.labelWrap,
                                    { width, height: HEIGHT },
                                    pressed && styles.labelWrapPressed,
                                ]}
                            >
                                {loading ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={variant === "primary" ? colors.background : colors.textSecondary}
                                    />
                                ) : (
                                    <Text
                                        style={[
                                            styles.text,
                                            variant === "primary" && { color: colors.background },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {label}
                                    </Text>
                                )}
                            </View>
                        </>
                    )}
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    root: {
        width: "100%",
    },
    disabled: {
        opacity: 0.5,
    },
    container: {
        width: "100%",
        height: HEIGHT + SHADOW,
    },
    svg: {
        position: "absolute",
        top: 0,
        left: 0,
    },
    labelWrap: {
        position: "absolute",
        top: 0,
        left: 0,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
    labelWrapPressed: {
        transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
    },
    text: {
        fontFamily: "Jersey10",
        fontSize: 22,
        color: colors.textSecondary,
        textAlign: "center",
        letterSpacing: 0.4,
    },
});
