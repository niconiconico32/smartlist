import { colors } from "@/constants/theme";
import { EGG_METADATA, EggId } from "@/src/store/eggStore";
import { hapticLight, hapticSuccess } from "@/utils/haptics";
import { playSuccessChime } from "@/utils/sounds";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { slideStyles } from "../../styles/shared";
import ChevronLeftIcon from "../ChevronLeftIcon";
import PixelCTAButton from "../PixelCTAButton";

// ============================================
// DISPLAY NAMES (solo visuales — no tocan EGG_METADATA/database)
// ============================================
const DISPLAY_NAMES: Record<number, string> = {
  1: "Mochi",
  2: "Pip",
  3: "Bao",
  4: "Miso",
  5: "Nimo",
  6: "Dot",
  7: "Kobo",
  8: "Yumi",
};

// ============================================
// COMPONENT
// ============================================
interface Props {
  onNext: (eggId: EggId) => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function EggPickerSlide({ onNext }: Props) {
  const { t } = useTranslation();
  const [index, setIndex] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  const availableEggs = useMemo(
    () => EGG_METADATA.filter((egg) => egg.rarity === "common"),
    [],
  );

  const current = availableEggs[index];
  if (!current) return null;
  const currentName = DISPLAY_NAMES[current.id] ?? current.name;

  const goPrev = () => {
    hapticLight();
    setIndex((prev) => Math.max(0, prev - 1));
  };
  const goNext = () => {
    hapticLight();
    setIndex((next) => Math.min(availableEggs.length - 1, next + 1));
  };

  const handleContinue = () => {
    if (!current) return;
    setSaving(true);
    hapticSuccess();
    playSuccessChime();
    setTimeout(() => {
      setSaving(false);
      onNext(current.id);
    }, 400);
  };

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text
          entering={FadeInDown.delay(100).duration(500)}
          style={[
            slideStyles.slideTitle,
            slideStyles.questionTitle,
            { marginBottom: 8, color: colors.background },
          ]}
        >
          {t("index_tab.onboarding.egg_picker.title", {
            defaultValue: "Pick an egg for your routine",
          })}
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          style={[
            slideStyles.slideSubtitle,
            { marginBottom: 36, textTransform: "none" },
          ]}
        >
          {t("index_tab.onboarding.egg_picker.subtitle", {
            defaultValue: "You can change it later from your inventory.",
          })}
        </Animated.Text>

        {/* Swipeable egg picker */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={s.pickerArea}
        >
          {/* Left arrow */}
          <Pressable
            onPress={goPrev}
            disabled={index === 0}
            style={({ pressed }) => [
              s.arrowBtn,
              (pressed || index === 0) && s.arrowBtnDisabled,
            ]}
          >
            <ChevronLeftIcon color={colors.primaryContent} size={32} />
          </Pressable>

          {/* Egg display */}
          <View style={s.eggPage}>
            <View style={s.eggContainer}>
              <Image
                source={current.image}
                style={s.eggImage}
                resizeMode="contain"
              />
            </View>
            <Text style={s.eggName}>{currentName}</Text>
          </View>

          {/* Right arrow */}
          <Pressable
            onPress={goNext}
            disabled={index === availableEggs.length - 1}
            style={({ pressed }) => [
              s.arrowBtn,
              (pressed || index === availableEggs.length - 1) &&
                s.arrowBtnDisabled,
            ]}
          >
            <View style={s.flip}>
              <ChevronLeftIcon color={colors.primaryContent} size={32} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Counter */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(500)}
          style={s.counter}
        >
          {index + 1} / {availableEggs.length}
        </Animated.Text>
      </ScrollView>

      {/* Footer */}
      <Animated.View
        entering={FadeInDown.delay(600).duration(500)}
        style={s.footer}
      >
        <PixelCTAButton
          label={t("index_tab.onboarding.egg_picker.add_egg", {
            defaultValue: "Add egg",
          })}
          onPress={handleContinue}
          disabled={saving}
          loading={saving}
        />
      </Animated.View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  pickerArea: {
    flexDirection: "row",
    alignItems: "center",
  },
  arrowBtn: {
    width: 44,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  eggsScrollContent: {
    alignItems: "center",
  },
  eggPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eggContainer: {
    width: "100%",
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  eggImage: {
    width: 140,
    height: 160,
    resizeMode: "contain",
  },
  eggName: {
    marginTop: 16,
    fontFamily: "Jersey10",
    fontSize: 28,
    color: colors.background,
    textAlign: "center",
  },
  flip: {
    transform: [{ scaleX: -1 }],
  },
  counter: {
    marginTop: 24,
    textAlign: "center",
    fontFamily: "Jersey10",
    fontSize: 22,
    color: colors.textTertiary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    gap: 12,
  },
});
