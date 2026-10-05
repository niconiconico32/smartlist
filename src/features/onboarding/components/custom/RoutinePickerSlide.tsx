import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { useAuth } from "@/src/contexts/AuthContext";
import { createRoutine } from "@/src/lib/routineService";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { slideStyles } from "../../styles/shared";
import PixelCTAButton from "../PixelCTAButton";
import PixelOptionButton from "../PixelOptionButton";

// ============================================
// PRESET ROUTINES
// ============================================
interface PresetRoutine {
  id: string;
  emoji: string;
  label: string;
  icon: string;
  image: number;
  tasks: string[];
}

const PRESET_ROUTINES: PresetRoutine[] = [
  {
    id: "walk-dog",
    emoji: "🐕",
    label: "onboarding.routine_picker.presets.walk_dog.label",
    icon: "Heart",
    image: require("@/assets/routineIcons/dogRoutine.png"),
    tasks: [
      "onboarding.routine_picker.presets.walk_dog.tasks.1",
      "onboarding.routine_picker.presets.walk_dog.tasks.2",
      "onboarding.routine_picker.presets.walk_dog.tasks.3",
    ],
  },
  {
    id: "drink-water",
    emoji: "💧",
    label: "onboarding.routine_picker.presets.drink_water.label",
    icon: "Activity",
    image: require("@/assets/routineIcons/waterRoutine.png"),
    tasks: [
      "onboarding.routine_picker.presets.drink_water.tasks.1",
      "onboarding.routine_picker.presets.drink_water.tasks.2",
      "onboarding.routine_picker.presets.drink_water.tasks.3",
      "onboarding.routine_picker.presets.drink_water.tasks.4",
    ],
  },
  {
    id: "feed-cat",
    emoji: "🐱",
    label: "onboarding.routine_picker.presets.feed_cat.label",
    icon: "Home",
    image: require("@/assets/routineIcons/catRoutine.png"),
    tasks: [
      "onboarding.routine_picker.presets.feed_cat.tasks.1",
      "onboarding.routine_picker.presets.feed_cat.tasks.2",
      "onboarding.routine_picker.presets.feed_cat.tasks.3",
    ],
  },
  {
    id: "morning-routine",
    emoji: "☀️",
    label: "onboarding.routine_picker.presets.morning_routine.label",
    icon: "Sun",
    image: require("@/assets/routineIcons/morningRoutine.png"),
    tasks: [
      "onboarding.routine_picker.presets.morning_routine.tasks.1",
      "onboarding.routine_picker.presets.morning_routine.tasks.2",
      "onboarding.routine_picker.presets.morning_routine.tasks.3",
    ],
  },
  {
    id: "wind-down",
    emoji: "🌙",
    label: "onboarding.routine_picker.presets.wind_down.label",
    icon: "Moon",
    image: require("@/assets/routineIcons/nightroutine.png"),
    tasks: [
      "onboarding.routine_picker.presets.wind_down.tasks.1",
      "onboarding.routine_picker.presets.wind_down.tasks.2",
      "onboarding.routine_picker.presets.wind_down.tasks.3",
    ],
  },
];

export const ALL_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ============================================
// COMPONENT
// ============================================
interface Props {
  onNext: (preset?: PresetRoutine) => void;
  requireSelection?: boolean;
  skipCreateRoutine?: boolean;
}

export default function RoutinePickerSlide({
  onNext,
  requireSelection = false,
  skipCreateRoutine = false,
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const toggleRoutine = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => (prev === id ? null : id));
  };

  const handleContinue = async () => {
    if (saving) return;

    const preset = PRESET_ROUTINES.find((r) => r.id === selected);
    if (!preset) {
      if (requireSelection) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      onNext();
      return;
    }

    if (skipCreateRoutine) {
      onNext(preset);
      return;
    }

    const userId = user?.id;
    if (!userId) {
      // Without a session the routine cannot be persisted. This used to be a
      // silent no-op, which hard-stuck the whole onboarding.
      console.warn(
        "RoutinePicker: no session available, advancing without creating the routine",
      );
      onNext(preset);
      return;
    }

    setSaving(true);
    try {
      await createRoutine(userId, {
        name: `${preset.emoji} ${t(preset.label)}`,
        days: ALL_DAYS,
        tasks: preset.tasks.map((title, index) => ({
          title: t(title),
          position: index,
        })),
        icon: preset.icon,
        reminderEnabled: false,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Error creating routine:", e);
    } finally {
      setSaving(false);
      onNext(preset);
    }
  };

  const handleSkip = () => {
    setSkipped(true);
    onNext();
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
          {t("onboarding.routine_picker.title")}
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          style={[
            slideStyles.slideSubtitle,
            { marginBottom: 36, textTransform: "none" },
          ]}
        >
          {t("onboarding.routine_picker.subtitle")}
        </Animated.Text>

        {/* Pills grid */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={s.pillsContainer}
        >
          {PRESET_ROUTINES.map((routine) => {
            const isSelected = selected === routine.id;
            return (
              <PixelOptionButton
                key={routine.id}
                label={t(routine.label)}
                selected={isSelected}
                icon={
                  <Image
                    source={routine.image}
                    style={s.routineIcon}
                    resizeMode="contain"
                  />
                }
                onPress={() => toggleRoutine(routine.id)}
              />
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <Animated.View
        entering={FadeInDown.delay(600).duration(500)}
        style={s.footer}
      >
        <PixelCTAButton
          label={
            selected
              ? t("onboarding.routine_picker.add_1_routine")
              : t("onboarding.continue")
          }
          onPress={handleContinue}
          disabled={requireSelection && !selected}
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
  pillsContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  routineIcon: {
    width: 28,
    height: 28,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    gap: 12,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "500",
  },
});
