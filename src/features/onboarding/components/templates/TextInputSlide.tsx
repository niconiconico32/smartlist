import { colors } from "@/constants/theme";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, TextInput } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LIGHT_BACKGROUND, LIGHT_SUBTITLE, LIGHT_TITLE } from "../../constants";
import { layoutStyles, slideStyles } from "../../styles/shared";
import { OnboardingAnswers, TextInputSlideConfig } from "../../types";

interface Props {
  config: TextInputSlideConfig;
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(
    key: K,
    value: OnboardingAnswers[K],
  ) => void;
}

const TextInputSlide: React.FC<Props> = ({ config, answers, onAnswer }) => {
  const { t } = useTranslation();
  const value = (answers[config.answerKey!] as string) ?? "";
  const isLight = config.backgroundColor === LIGHT_BACKGROUND;

  return (
    <ScrollView
      style={layoutStyles.slideScroll}
      contentContainerStyle={layoutStyles.slideScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {config.showLogo && (
        <Animated.Image
          entering={FadeInDown.delay(50).duration(500)}
          source={require("@/assets/images/logomain.png")}
          style={slideStyles.questionLogo}
          resizeMode="contain"
        />
      )}

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
        style={[slideStyles.nameInputContainer, { paddingHorizontal: 0, width: "100%" }]}
      >
        <TextInput
          style={[
            slideStyles.nameInput,
            isLight && {
              backgroundColor: "#FFFFFF",
              color: LIGHT_TITLE,
            },
            {
              textAlign: "left",
              borderRadius: 12,
              borderWidth: 0,
              paddingHorizontal: 16,
              paddingVertical: 16,
              fontSize: 16,
            },
          ]}
          placeholder={t(config.placeholder)}
          placeholderTextColor={isLight ? colors.textTertiary : colors.textSecondary}
          value={value}
          onChangeText={(text) => {
            const key = config.answerKey!;
            onAnswer(key as "userName", text);
          }}
          autoFocus
        />
      </Animated.View>
    </ScrollView>
  );
};

export default TextInputSlide;
