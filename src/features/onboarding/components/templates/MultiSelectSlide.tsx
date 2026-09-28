import { hapticLight } from "@/utils/haptics";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LIGHT_BACKGROUND, LIGHT_SUBTITLE, LIGHT_TITLE } from "../../constants";
import { layoutStyles, slideStyles } from "../../styles/shared";
import PixelOptionButton from "../PixelOptionButton";
import {
  MultiSelectSlideConfig,
  OnboardingAnswers,
  SelectOption,
} from "../../types";

interface Props {
  config: MultiSelectSlideConfig;
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(
    key: K,
    value: OnboardingAnswers[K],
  ) => void;
  resolvedOptions: SelectOption[];
}

const MultiSelectSlide: React.FC<Props> = ({
  config,
  answers,
  onAnswer,
  resolvedOptions,
}) => {
  const { t } = useTranslation();
  const selected = (answers[config.answerKey!] as string[]) ?? [];
  const isLight = config.backgroundColor === LIGHT_BACKGROUND;

  const toggleItem = (id: string) => {
    hapticLight();
    const key = config.answerKey! as "adhdSymptoms" | "goals";
    if (selected.includes(id)) {
      onAnswer(
        key,
        selected.filter((s) => s !== id),
      );
    } else {
      onAnswer(key, [...selected, id]);
    }
  };

  return (
    <ScrollView
      style={layoutStyles.slideScroll}
      contentContainerStyle={layoutStyles.slideScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.Image
        entering={FadeInDown.delay(50).duration(500)}
        source={require("@/assets/images/logomain.png")}
        style={slideStyles.questionLogo}
        resizeMode="contain"
      />

      {config.subtitle && (
        <Animated.Text
          entering={FadeInDown.delay(100).duration(500)}
          style={[slideStyles.slideSubtitle, isLight && { color: LIGHT_SUBTITLE }]}
        >
          {t(config.subtitle)}
        </Animated.Text>
      )}

      <Animated.Text
        entering={FadeInDown.delay(200).duration(500)}
        style={[
          slideStyles.slideTitle,
          slideStyles.questionTitle,
          isLight && { color: LIGHT_TITLE },
        ]}
      >
        {t(config.title)}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(300).duration(500)}
        style={[
          slideStyles.pillGrid,
          {
            flexDirection: "column",
            width: "100%",
            paddingHorizontal: 0,
            gap: 16,
          },
        ]}
      >
        {resolvedOptions.map((option, index) => {
          const isSelected = selected.includes(option.id);
          return (
            <Animated.View
              key={option.id}
              entering={FadeInDown.delay(400 + index * 50).duration(400)}
              style={{ width: "100%" }}
            >
              <PixelOptionButton
                label={t(option.label)}
                selected={isSelected}
                onPress={() => toggleItem(option.id)}
              />
            </Animated.View>
          );
        })}
      </Animated.View>
    </ScrollView>
  );
};

export default MultiSelectSlide;
