import { colors } from "@/constants/theme";
import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { pixelButtonPath } from "./pixelGeometry";

// Input pixel para el onboarding: misma forma escalonada y sombra dura que
// PixelOptionButton/PixelCTAButton, con el TextInput transparente encima.
const SHADOW = 3; // desplazamiento de la sombra
const MIN_HEIGHT = 200; // alto mínimo del recuadro
const SHADOW_COLOR = "#0D0D0D" + "80";
const BG = "#FFFFFF";

interface Props {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    placeholderTextColor?: string;
    editable?: boolean;
    isGenerating?: boolean;
}

export default function PixelTextInput({
    value,
    onChangeText,
    placeholder,
    placeholderTextColor,
    editable = true,
    isGenerating = false,
}: Props) {
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);

    return (
        <View style={[styles.root, isGenerating && { opacity: 0.5 }]}>
            <View
                style={styles.box}
                onLayout={(e) => {
                    setWidth(e.nativeEvent.layout.width);
                    setHeight(e.nativeEvent.layout.height);
                }}
            >
                {width > 0 && height > 0 && (
                    <Svg
                        style={styles.svg}
                        width={width + SHADOW}
                        height={height + SHADOW}
                        viewBox={`0 0 ${width + SHADOW} ${height + SHADOW}`}
                    >
                        <Path
                            d={pixelButtonPath(width, height)}
                            fill={SHADOW_COLOR}
                            transform={`translate(${SHADOW} ${SHADOW})`}
                        />
                        <Path d={pixelButtonPath(width, height)} fill={BG} />
                    </Svg>
                )}
                <TextInput
                    style={styles.input}
                    multiline
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={placeholderTextColor}
                    editable={editable}
                    textAlignVertical="top"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        width: "100%",
    },
    box: {
        width: "100%",
        minHeight: MIN_HEIGHT,
    },
    svg: {
        position: "absolute",
        top: 0,
        left: 0,
    },
    input: {
        width: "100%",
        minHeight: MIN_HEIGHT,
        paddingHorizontal: 18,
        paddingVertical: 16,
        fontSize: 18,
        color: colors.background,
        textAlignVertical: "top",
    },
});
