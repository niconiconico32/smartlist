import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft, Sparkles, Target, Zap } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function BenefitsScreen() {
  const { t } = useTranslation();

  const BENEFITS = [
    {
      id: 1,
      icon: Zap,
      iconColor: colors.accent,
      title: t("benefits.items.stress.title"),
      description: t("benefits.items.stress.description"),
    },
    {
      id: 2,
      icon: Sparkles,
      iconColor: colors.primary,
      title: t("benefits.items.positivity.title"),
      description: t("benefits.items.positivity.description"),
    },
    {
      id: 3,
      icon: Target,
      iconColor: colors.success,
      title: t("benefits.items.goals.title"),
      description: t("benefits.items.goals.description"),
    },
  ];
  const handleBack = () => {
    router.back();
  };

  const handleNext = () => {
    // Navegar a la siguiente pantalla o cerrar onboarding
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textSecondary} />
          <Text style={styles.backText}>{t("benefits.back")}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t("benefits.header")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Icon with Glow */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.heroContainer}
        >
          <View style={styles.glowContainer}>
            <View style={styles.glowCircle} />
            <Sparkles size={72} color={colors.primary} strokeWidth={1.5} />
          </View>
        </Animated.View>

        {/* Main Title */}
        <Animated.Text
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.mainTitle}
        >
          {t("benefits.title")}
        </Animated.Text>

        {/* Benefits Cards */}
        <View style={styles.benefitsContainer}>
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Animated.View
                key={benefit.id}
                entering={FadeInDown.delay(300 + index * 100).duration(400)}
                style={styles.benefitCard}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${benefit.iconColor}15` },
                  ]}
                >
                  <Icon size={24} color={benefit.iconColor} strokeWidth={2} />
                </View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>
                    {benefit.description}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Button */}
      <Animated.View
        entering={FadeInDown.delay(600).duration(400)}
        style={styles.footer}
      >
        <Pressable onPress={handleNext} style={styles.nextButtonContainer}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>{t("benefits.next")}</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  heroContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 32,
  },
  glowContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  glowCircle: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${colors.primary}10`,
    opacity: 0.5,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  benefitsContainer: {
    gap: 16,
  },
  benefitCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  benefitDescription: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  nextButtonContainer: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  nextButton: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.background,
    letterSpacing: 0.5,
  },
});
