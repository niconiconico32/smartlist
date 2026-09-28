import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { slideStyles } from "../../styles/shared";
import CheckIcon from "../CheckIcon";
import PixelCTAButton from "../PixelCTAButton";
import { pixelButtonPath } from "../pixelGeometry";

// ============================================
// COMMITMENT SLIDE
// ============================================
const COMMITMENTS = [
  "onboarding.commitment.items.1",
  "onboarding.commitment.items.2",
  "onboarding.commitment.items.3",
];

const SHADOW = 3;
const MIN_HEIGHT = 60;
const PADDING_H = 18;
const PADDING_V = 16;
const CHECK_SIZE = 26;

interface Props {
  onNext: () => void;
}

const CommitmentSlide: React.FC<Props> = ({ onNext }) => {
  const { t } = useTranslation();
  const [checked, setChecked] = useState<boolean[]>(
    COMMITMENTS.map(() => false),
  );
  const allChecked = checked.every(Boolean);

  const toggleCheck = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  return (
    <View style={s.container}>
      <View style={s.contentArea}>
        {/* Logo */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={s.logoContainer}
        >
          <Image
            source={require("@/assets/images/brainysign.png")}
            style={s.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[slideStyles.slideTitle, slideStyles.questionTitle, s.titleOverride]}>
            {t("onboarding.commitment.title_line_1")}
            {"\n"}
            <Text style={{ color: colors.primary }}>
              {t("onboarding.commitment.title_line_2")}
            </Text>
          </Text>
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          style={[slideStyles.slideSubtitle, s.subtitleOverride]}
        >
          {t("onboarding.commitment.subtitle")}
        </Animated.Text>

        {/* Staggered checklist */}
        <View style={s.checklistContainer}>
          {COMMITMENTS.map((text, idx) => {
            const isVisible = idx === 0 || checked[idx - 1];
            if (!isVisible) return null;

            return (
              <Animated.View
                key={idx}
                entering={FadeInUp.delay(idx === 0 ? 350 : 100).duration(400)}
              >
                <CommitmentRow
                  label={t(text)}
                  checked={checked[idx]}
                  onPress={() => toggleCheck(idx)}
                />
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Button */}
      <View style={s.buttonContainer}>
        <PixelCTAButton
          label={
            allChecked
              ? t("onboarding.commitment.cta_ready")
              : t("onboarding.commitment.cta_disabled")
          }
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onNext();
          }}
          disabled={!allChecked}
        />
      </View>
    </View>
  );
};

export default CommitmentSlide;

// ============================================
// COMMITMENT ROW (caja pixel + check.svg)
// ============================================
function CommitmentRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  const [width, setWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const height = Math.max(MIN_HEIGHT, contentHeight + PADDING_V * 2);
  const textMaxWidth =
    width - PADDING_H * 2 - (checked ? CHECK_SIZE + 14 : 0);

  return (
    <Pressable onPress={onPress} style={s.rowRoot}>
      {({ pressed }) => (
        <View
          style={[s.rowContainer, { height: height + SHADOW }]}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          {width > 0 && (
            <>
              <Svg
                style={s.svg}
                width={width + SHADOW}
                height={height + SHADOW}
                viewBox={`0 0 ${width + SHADOW} ${height + SHADOW}`}
              >
                {/* sombra: misma forma, offset 3,3, sin blur. Se oculta al presionar */}
                {!pressed && (
                  <Path
                    d={pixelButtonPath(width, height)}
                    fill="#0a0a0a"
                    transform={`translate(${SHADOW} ${SHADOW})`}
                  />
                )}
                {/* caja pixel blanca */}
                <Path d={pixelButtonPath(width, height)} fill="#FFFFFF" />
              </Svg>
              {/* contenido: se desplaza 3px al presionar, como si se hundiera */}
              <View
                style={[
                  s.rowContent,
                  { width, height },
                  pressed && s.rowContentPressed,
                ]}
              >
                <View
                  style={s.rowInner}
                  onLayout={(e) =>
                    setContentHeight(e.nativeEvent.layout.height)
                  }
                >
                  {checked && (
                    <View style={s.checkSlot}>
                      <CheckIcon
                        color={colors.primaryContent}
                        size={CHECK_SIZE}
                      />
                    </View>
                  )}
                  <Text
                    style={[
                      s.commitText,
                      { maxWidth: textMaxWidth },
                      checked && s.commitTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  titleOverride: {
    color: "#f2f2f2",
    textAlign: "left",
    alignSelf: "stretch",
    marginBottom: 8,
  },
  subtitleOverride: {
    color: "#f2f2f2",
    textAlign: "left",
    textTransform: "none",
    marginBottom: 36,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 90,
    height: 90,
  },
  checklistContainer: {
    gap: 14,
  },
  rowRoot: {
    width: "100%",
  },
  rowContainer: {
    width: "100%",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  rowContent: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContentPressed: {
    transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: 14,
    paddingHorizontal: PADDING_H,
  },
  checkSlot: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commitText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.primaryContent,
    lineHeight: 22,
  },
  commitTextActive: {
    fontWeight: "600",
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
});
