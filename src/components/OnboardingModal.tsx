import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import {
    ONBOARDING_BUTTONS,
    ONBOARDING_COLORS,
    ONBOARDING_DIMENSIONS,
    ONBOARDING_DOTS,
    ONBOARDING_SHADOWS,
    ONBOARDING_TYPOGRAPHY,
} from "@/src/styles/onboardingStyles";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Animated,
    Image,
    Modal,
    Pressable,
    SafeAreaView,
    StyleSheet,
    View,
} from "react-native";
import { X } from "lucide-react-native";

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OnboardingModal({ visible, onClose }: OnboardingModalProps) {
  const { t } = useTranslation();
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const onboardingSlideAnim = useRef(new Animated.Value(0)).current;

  const goToNextStep = () => {
    setOnboardingStep((prev) => prev + 1);
  };

  const goToPreviousStep = () => {
    setOnboardingStep(1);
  };

  const handleClose = () => {
    setOnboardingStep(1);
    onboardingSlideAnim.setValue(0);
    onClose();
  };

  const getTitle = () => {
    if (onboardingStep === 1) return t("index_tab.onboarding.title_step_1");
    if (onboardingStep === 3) return t("index_tab.onboarding.title_step_3");
    return t("index_tab.onboarding.title_question");
  };

  const showImage = onboardingStep === 1 || onboardingStep === 3;
  const showOptions = onboardingStep === 2 || onboardingStep === 4 || onboardingStep === 5 || onboardingStep === 6;
  const showComenzar = onboardingStep === 1;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.onboardingContainer}>
        <View style={styles.onboardingHeader}>
          <Pressable onPress={handleClose} style={styles.backButton}>
            <X size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.onboardingScrollContainer}>
          {onboardingStep !== 1 && (
            <View style={styles.progressDotsContainer}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <View
                  key={index}
                  style={
                    index === onboardingStep - 1
                      ? styles.activeDot
                      : styles.inactiveDot
                  }
                />
              ))}
            </View>
          )}

          <View style={styles.onboardingContentWrapper}>
            <View style={styles.onboardingTitleSection}>
              <Text style={styles.onboardingTitle}>{getTitle()}</Text>
            </View>

            <View style={styles.onboardingSubtitleSection}>
              {onboardingStep === 1 && (
                <Text style={styles.onboardingSubtitle}>
                  {t("index_tab.onboarding.subtitle_step_1")}
                </Text>
              )}
              {onboardingStep === 3 && (
                <Text style={styles.onboardingSubtitle}>
                  {t("index_tab.onboarding.subtitle_step_3")}
                </Text>
              )}
            </View>

            {showImage && (
              <View style={styles.onboardingImageSection}>
                <Image
                  source={require("@/assets/images/Scrum board-rafiki.png")}
                  style={styles.onboardingImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {showOptions && (
              <View style={styles.onboardingOptionsSection}>
                <View style={styles.optionsContainer}>
                  {[
                    t("index_tab.onboarding.option_0"),
                    t("index_tab.onboarding.option_1"),
                    t("index_tab.onboarding.option_2"),
                  ].map((option, idx) => (
                    <Pressable
                      key={idx}
                      style={[
                        styles.optionButton,
                        selectedOption === idx && styles.optionButtonActive,
                      ]}
                      onPress={() => {
                        setSelectedOption(idx);
                        setTimeout(() => {
                          setSelectedOption(null);
                          goToNextStep();
                        }, 200);
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>

          {showComenzar && (
            <Pressable style={styles.comenzarButton} onPress={goToNextStep}>
              <Text style={styles.comenzarButtonText}>
                {t("index_tab.onboarding.start")}
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  onboardingContainer: {
    flex: 1,
    backgroundColor: colors.background,
  } as any,
  onboardingHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  } as any,
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  } as any,
  onboardingScrollContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingBottom: 20,
  } as any,
  progressDotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: ONBOARDING_DOTS.gap,
    marginBottom: ONBOARDING_DOTS.marginBottom,
  } as any,
  activeDot: {
    width: 16,
    height: 14,
    borderRadius: 25,
    backgroundColor: colors.primary,
  } as any,
  inactiveDot: {
    width: 9,
    height: 9,
    borderRadius: 55,
    backgroundColor: colors.primary,
  } as any,
  onboardingContentWrapper: {
    flex: 1,
    width: "100%",
    paddingHorizontal: ONBOARDING_DIMENSIONS.horizontalPadding,
    justifyContent: "flex-start",
    alignItems: "center",
  } as any,
  onboardingTitleSection: {
    height: ONBOARDING_DIMENSIONS.titleSectionHeight,
    justifyContent: "center",
    alignItems: "center",
    marginTop: ONBOARDING_DIMENSIONS.marginTop,
  } as any,
  onboardingTitle: {
    fontSize: ONBOARDING_TYPOGRAPHY.titleFontSize,
    fontWeight: ONBOARDING_TYPOGRAPHY.titleFontWeight,
    color: ONBOARDING_COLORS.titleColor,
    textAlign: "center",
    marginBottom: ONBOARDING_DIMENSIONS.verticalGap,
  } as any,
  onboardingSubtitleSection: {
    height: ONBOARDING_DIMENSIONS.subtitleSectionHeight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ONBOARDING_DIMENSIONS.verticalGap,
  } as any,
  onboardingSubtitle: {
    fontSize: ONBOARDING_TYPOGRAPHY.subtitleFontSize,
    fontWeight: ONBOARDING_TYPOGRAPHY.subtitleFontWeight,
    color: ONBOARDING_COLORS.subtitleColor,
    textAlign: "center",
    lineHeight: ONBOARDING_TYPOGRAPHY.subtitleLineHeight,
  } as any,
  onboardingImageSection: {
    height: ONBOARDING_DIMENSIONS.imageSectionHeight,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: ONBOARDING_DIMENSIONS.verticalGap,
  } as any,
  onboardingImage: {
    width: ONBOARDING_DIMENSIONS.imageWidth,
    height: ONBOARDING_DIMENSIONS.imageHeight,
    resizeMode: "contain",
  } as any,
  onboardingOptionsSection: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "center",
  } as any,
  optionsContainer: {
    width: "100%",
    paddingHorizontal: ONBOARDING_DIMENSIONS.horizontalPadding,
    gap: ONBOARDING_BUTTONS.optionButtonGap,
    alignItems: "center",
    justifyContent: "center",
  } as any,
  optionButton: {
    backgroundColor: ONBOARDING_COLORS.optionButtonBg,
    paddingVertical: ONBOARDING_BUTTONS.optionButtonPaddingVertical,
    paddingHorizontal: ONBOARDING_BUTTONS.optionButtonPaddingHorizontal,
    borderRadius: ONBOARDING_BUTTONS.optionButtonBorderRadius,
    borderWidth: ONBOARDING_BUTTONS.optionButtonBorderWidth,
    borderColor: ONBOARDING_COLORS.optionButtonBorder,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  } as any,
  optionButtonActive: {
    borderColor: colors.primary,
    borderWidth: 3,
  } as any,
  optionText: {
    fontSize: ONBOARDING_TYPOGRAPHY.optionFontSize,
    fontWeight: ONBOARDING_TYPOGRAPHY.optionFontWeight,
    color: ONBOARDING_COLORS.optionTextColor,
    textAlign: "center",
  } as any,
  comenzarButton: {
    backgroundColor: ONBOARDING_COLORS.primaryButton,
    paddingVertical: ONBOARDING_BUTTONS.primaryButtonPaddingVertical,
    paddingHorizontal: ONBOARDING_BUTTONS.primaryButtonPaddingHorizontal,
    borderRadius: ONBOARDING_BUTTONS.primaryButtonBorderRadius,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ONBOARDING_BUTTONS.primaryButtonMarginBottom,
    minWidth: ONBOARDING_BUTTONS.primaryButtonMinWidth,
    shadowColor: ONBOARDING_COLORS.shadowColor,
    shadowOffset: ONBOARDING_SHADOWS.shadowOffset,
    shadowOpacity: ONBOARDING_SHADOWS.shadowOpacity,
    shadowRadius: ONBOARDING_SHADOWS.shadowRadius,
    elevation: ONBOARDING_SHADOWS.elevation,
  } as any,
  comenzarButtonText: {
    color: ONBOARDING_COLORS.buttonTextColor,
    fontSize: ONBOARDING_TYPOGRAPHY.buttonFontSize,
    fontWeight: ONBOARDING_TYPOGRAPHY.buttonFontWeight,
  } as any,
});
