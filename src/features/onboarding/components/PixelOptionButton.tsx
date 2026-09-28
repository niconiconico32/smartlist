import { colors } from "@/constants/theme";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { pixelButtonPath } from "./pixelGeometry";

// Botón de opción pixel para las preguntas del onboarding: mismas propiedades
// que el CTA (esquinas escalonadas, sombra dura, hundido al presionar) pero
// fondo blanco; al seleccionar pasa a colors.primary.
const SHADOW = 3; // desplazamiento de la sombra
const MIN_HEIGHT = 56; // alto mínimo
const PADDING_H = 20; // padding horizontal interno del texto
const PADDING_V = 12; // padding vertical interno del texto
const ICON_SIZE = 24; // tamaño del icono opcional
const ICON_GAP = 12; // separación icono → texto
const BG_DEFAULT = "#FFFFFF";
const SHADOW_COLOR = "#0D0D0D" + "80";

type Props = {
    label?: string;
    selected: boolean;
    onPress: () => void;
    icon?: React.ReactNode;
    square?: boolean;
    // Con true, el fondo/borde quedan transparentes cuando NO está seleccionado.
    transparent?: boolean;
};

export default function PixelOptionButton({
    label,
    selected,
    onPress,
    icon,
    square = false,
    transparent = false,
}: Props) {
    const [width, setWidth] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);
    const height = square
        ? width
        : Math.max(MIN_HEIGHT, contentHeight + PADDING_V * 2);
    const fill = selected
        ? `${colors.surface}40`
        : transparent
          ? "transparent"
          : BG_DEFAULT;
    const textMaxWidth = label
        ? width - PADDING_H * 2 - (icon ? ICON_SIZE + ICON_GAP : 0)
        : 0;

    return (
        <Pressable onPress={onPress} style={styles.root}>
            {({ pressed }) => (
                <View
                    style={[styles.container, { height: height + SHADOW }]}
                    onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
                >
                    {width > 0 && (
                        <>
                            <Svg
                                style={styles.svg}
                                width={width + SHADOW}
                                height={height + SHADOW}
                                viewBox={`0 0 ${width + SHADOW} ${height + SHADOW}`}
                            >
                                {/* sombra: misma forma, offset 3,3, sin blur. Se oculta al presionar, al seleccionar o al ser transparente */}
                                {!pressed && !selected && !transparent && (
                                    <Path
                                        d={pixelButtonPath(width, height)}
                                        fill={SHADOW_COLOR}
                                        transform={`translate(${SHADOW} ${SHADOW})`}
                                    />
                                )}
                                {/* botón: se desplaza 3px al presionar, como si se hundiera */}
                                <Path
                                    d={pixelButtonPath(width, height)}
                                    fill={fill}
                                    transform={
                                        pressed ? `translate(${SHADOW} ${SHADOW})` : undefined
                                    }
                                />
                            </Svg>
                            {/* Texto centrado con flexbox: idéntico en iOS y Android */}
                            <View
                                style={[
                                    styles.contentWrap,
                                    { width, height },
                                    pressed && styles.contentWrapPressed,
                                ]}
                            >
                                <View
                                    style={[
                                        styles.row,
                                        !label && styles.rowIconOnly,
                                        label && {
                                            maxWidth: width - PADDING_H * 2,
                                        },
                                    ]}
                                    onLayout={(e) =>
                                        setContentHeight(e.nativeEvent.layout.height)
                                    }
                                >
                                    {icon && (
                                        <View
                                            style={[
                                                styles.iconWrap,
                                                !label && styles.iconWrapCentered,
                                            ]}
                                        >
                                            {icon}
                                        </View>
                                    )}
                                    {label && (
                                        <Text
                                            style={[
                                                styles.text,
                                                { maxWidth: textMaxWidth },
                                            ]}
                                        >
                                            {label}
                                        </Text>
                                    )}
                                </View>
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
    container: {
        width: "100%",
    },
    svg: {
        position: "absolute",
        top: 0,
        left: 0,
    },
    contentWrap: {
        position: "absolute",
        top: 0,
        left: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: PADDING_H,
        zIndex: 1,
    },
    contentWrapPressed: {
        transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "stretch",
    },
    rowIconOnly: {
        justifyContent: "center",
    },
    iconWrap: {
        marginRight: ICON_GAP,
        alignItems: "center",
        justifyContent: "center",
    },
    iconWrapCentered: {
        marginRight: 0,
    },
    text: {
        fontFamily: "Inter",
        fontSize: 16,
        color: colors.primaryContent,
        textAlign: "left",
        lineHeight: 24,
        letterSpacing: 0.2,
    },
});
