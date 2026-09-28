import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { hapticLight } from "@/utils/haptics";
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AGREEMENT_OPTIONS, LIGHT_BACKGROUND, LIGHT_TITLE } from "../../constants";
import { layoutStyles, slideStyles } from "../../styles/shared";
import PixelOptionButton from "../PixelOptionButton";
import {
  AgreementSlideConfig,
  OnboardingAnswers,
  StatementData,
} from "../../types";

interface Props {
  config: AgreementSlideConfig;
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(
    key: K,
    value: OnboardingAnswers[K],
  ) => void;
  onNext: () => void;
  statement: StatementData;
}

const AgreementSlide: React.FC<Props> = ({
  config,
  answers,
  onAnswer,
  onNext,
  statement,
}) => {
  const { t } = useTranslation();
  const selected = answers[config.answerKey!] as string | null;
  const isLight = config.backgroundColor === LIGHT_BACKGROUND;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelect = (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    hapticLight();
    onAnswer(
      config.answerKey! as "statement1",
      value ?? null,
    );
    if (config.autoAdvance !== false) {
      timerRef.current = setTimeout(() => onNext(), 800);
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

      <Animated.Text
        entering={FadeInDown.delay(100).duration(500)}
        style={slideStyles.slideSubtitle}
      >
        {t("onboarding.agreement_subtitle")}
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.delay(200).duration(500)}
        style={[
          slideStyles.slideTitle,
          slideStyles.questionTitle,
          isLight && { color: LIGHT_TITLE },
        ]}
      >
        {t(statement.textMain)}
        <Text style={{ color: colors.surface }}>
          {t(statement.textHighlight)}
        </Text>
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(300).duration(500)}
        style={slideStyles.agreementOptions}
      >
        {AGREEMENT_OPTIONS.map((option, index) => {
          const isSelected = selected === option.value;
          return (
            <Animated.View
              key={option.id}
              entering={FadeInDown.delay(400 + index * 50).duration(400)}
              style={{ width: "100%", marginBottom: 12 }}
            >
              <PixelOptionButton
                label={t(option.label)}
                selected={isSelected}
                onPress={() => handleSelect(option.value ?? "")}
              />
            </Animated.View>
          );
        })}
      </Animated.View>
    </ScrollView>
  );
};

export default AgreementSlide;
