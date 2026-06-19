import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { EGG_METADATA } from "@/src/store/eggStore";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface Props {
  onNext: () => void;
}

function getRandomPets() {
  const pool = EGG_METADATA.map((egg) => ({
    id: egg.id,
    name: egg.name,
    petImage: egg.petImage,
  }));

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, 9);
}

export default function PetsPreviewSlide({ onNext }: Props) {
  const { t } = useTranslation();
  const pets = useMemo(() => getRandomPets(), []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(80).duration(450)}
          style={s.logoWrap}
        >
          <Image
            source={require("@/assets/images/logomain.png")}
            style={s.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(170).duration(450)}
          style={s.title}
        >
          {t("index_tab.onboarding.pets_preview.title")}
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(250).duration(450)}
          style={s.subtitle}
        >
          {t("index_tab.onboarding.pets_preview.subtitle")}
        </Animated.Text>

        <Animated.View
          entering={FadeInDown.delay(340).duration(520)}
          style={s.grid}
        >
          {pets.map((pet) => (
            <View key={pet.id} style={s.petCard}>
              <Image
                source={pet.petImage}
                style={s.petImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          style={s.subtitle}
        >
          {t("index_tab.onboarding.pets_preview.subtitle2")}
        </Animated.Text>
      </ScrollView>

      <View style={s.buttonContainer}>
        <Pressable onPress={handleContinue} style={primaryButtonStyles}>
          <LinearGradient
            colors={PRIMARY_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={primaryButtonGradient}
          >
            <Text style={primaryButtonText}>{t("onboarding.continue")}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

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
    alignItems: "center",
  },
  logoWrap: {
    marginBottom: 18,
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 32,
    lineHeight: 34,
    color: colors.background,
    textAlign: "center",
    fontFamily: "Jersey10",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textTertiary,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  petCard: {
    width: "33%",
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  petImage: {
    width: "78%",
    height: "78%",
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
});
