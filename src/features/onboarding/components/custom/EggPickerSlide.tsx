import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { EGG_METADATA, EggId, useEggStore } from "@/src/store/eggStore";
import { Check } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { slideStyles } from "../../styles/shared";

// ============================================
// PRESET COMMON EGGS (IDs y assets de ejemplo)
// ============================================
interface EggOption {
  id: EggId;
  name: string;
  image: any;
}

// ============================================
// COMPONENT
// ============================================
interface Props {
  onNext: (eggId: EggId) => void;
}

export default function EggPickerSlide({ onNext }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<EggId | null>(null);
  const [saving, setSaving] = useState(false);
  const storeEggs = useEggStore((s) => s.eggs);
  const availableEggs: EggOption[] = useMemo(() => {
    const availableIds = new Set(
      storeEggs
        .filter((egg) => egg.unlocked && egg.routineId === null)
        .map((egg) => egg.id),
    );

    return EGG_METADATA.filter(
      (egg) => egg.rarity === "common" && availableIds.has(egg.id),
    ).map((egg) => ({ id: egg.id, name: egg.name, image: egg.image }));
  }, [storeEggs]);

  const handleContinue = () => {
    if (selected == null) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onNext(selected);
    }, 400); // Simula acción async
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
            { marginBottom: 8, color: colors.background },
          ]}
        >
          {t("onboarding.egg_picker.title", {
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
          {t("onboarding.egg_picker.subtitle", {
            defaultValue: "You can change it later from your inventory.",
          })}
        </Animated.Text>

        {/* Pills grid */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={s.pillsContainer}
        >
          {availableEggs.map((egg) => {
            const isSelected = selected === egg.id;
            return (
              <Pressable
                key={egg.id}
                onPress={() => setSelected(egg.id)}
                style={[s.pill, isSelected && s.pillSelected]}
              >
                {isSelected && (
                  <View style={s.checkCircle}>
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </View>
                )}
                <Image source={egg.image} style={s.eggImage} />
                <Text style={[s.pillLabel, isSelected && s.pillLabelSelected]}>
                  {egg.name}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <Animated.View
        entering={FadeInDown.delay(600).duration(500)}
        style={s.footer}
      >
        <Pressable
          onPress={handleContinue}
          style={[s.button, (!selected || saving) && s.buttonDisabled]}
          disabled={!selected || saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={s.buttonText}>
              {selected
                ? t("onboarding.egg_picker.add_egg", {
                    defaultValue: "Add egg",
                  })
                : t("onboarding.continue", { defaultValue: "Continue" })}
            </Text>
          )}
        </Pressable>
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  pillSelected: {
    borderColor: colors.surface,
    backgroundColor: `${colors.surface}10`,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  eggImage: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  pillLabelSelected: {
    color: colors.surface,
    fontWeight: "700",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    backgroundColor: colors.surface,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: colors.surface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
