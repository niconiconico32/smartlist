import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import * as Haptics from "expo-haptics";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { slideStyles } from "../../styles/shared";
import type { OnboardingAnswers } from "../../types";

interface Props {
  answers: OnboardingAnswers;
  onNext: () => void;
}

const ResultsSlide: React.FC<Props> = ({ answers, onNext }) => {
  const { t } = useTranslation();
  const userName =
    answers.userName || t("onboarding.results.default_user_name");

  // 1. Map Main Goal to an empathetic phrase
  const mainGoalId = answers.mainGoal?.[0];
  let goalText = t("onboarding.results.goals.default");
  if (mainGoalId === "finish_projects")
    goalText = t("onboarding.results.goals.finish_projects");
  else if (mainGoalId === "less_stress")
    goalText = t("onboarding.results.goals.less_stress");
  else if (mainGoalId === "lasting_routines")
    goalText = t("onboarding.results.goals.lasting_routines");
  else if (mainGoalId === "feel_proud")
    goalText = t("onboarding.results.goals.feel_proud");

  // 2. Map Life Area to current state
  const lifeAreaId = answers.lifeArea;
  let areaText = t("onboarding.results.life_areas.default");
  if (lifeAreaId === "home") areaText = t("onboarding.results.life_areas.home");
  else if (lifeAreaId === "work")
    areaText = t("onboarding.results.life_areas.work");
  else if (lifeAreaId === "health")
    areaText = t("onboarding.results.life_areas.health");

  // 3. Map Symptoms to the obstacles
  const symptoms = answers.adhdSymptoms || [];
  const defaultObstacles = [
    t("onboarding.results.obstacles.default_1"),
    t("onboarding.results.obstacles.default_2"),
    t("onboarding.results.obstacles.default_3"),
  ];

  const symptomMap: Record<string, string> = {
    paralysis: t("onboarding.results.symptom_map.paralysis"),
    time: t("onboarding.results.symptom_map.time"),
    overwhelm: t("onboarding.results.symptom_map.overwhelm"),
    forget: t("onboarding.results.symptom_map.forget"),
    racing_mind: t("onboarding.results.symptom_map.racing_mind"),
  };

  const selectedTexts = symptoms
    .slice(0, 3)
    .map((id) => symptomMap[id])
    .filter(Boolean);

  // Fill array up to exactly 3 items using defaults if needed
  const symptomsText = [...selectedTexts];
  let defaultIdx = 0;
  while (symptomsText.length < 3 && defaultIdx < defaultObstacles.length) {
    if (!symptomsText.includes(defaultObstacles[defaultIdx])) {
      symptomsText.push(defaultObstacles[defaultIdx]);
    }
    defaultIdx++;
  }

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
            { color: colors.background, marginBottom: 8 },
          ]}
        >
          {t("onboarding.results.thanks_prefix")}{" "}
          <Text style={{ color: colors.surface }}>{userName}</Text>.
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          style={[
            slideStyles.slideSubtitle,
            { color: colors.surface, marginBottom: 40, textTransform: "none" },
          ]}
        >
          {t("onboarding.results.subtitle")}
        </Animated.Text>

        <View style={s.cardsContainer}>
          {/* CARD 1 */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(500)}
            style={s.card}
          >
            <View style={s.pill}>
              <Text style={s.pillText}>
                {t("onboarding.results.pills.where_you_want_to_go")}
              </Text>
            </View>
            <Text style={s.cardTextMain}>{goalText}</Text>
          </Animated.View>

          {/* CARD 2 */}
          <Animated.View
            entering={FadeInDown.delay(450).duration(500)}
            style={s.card}
          >
            <View style={s.pill}>
              <Text style={s.pillText}>
                {t("onboarding.results.pills.where_you_are_now")}
              </Text>
            </View>
            <Text style={s.cardTextMain}>{areaText}</Text>
          </Animated.View>

          {/* CARD 3 */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(500)}
            style={s.card}
          >
            <View style={s.pill}>
              <Text style={s.pillText}>
                {t("onboarding.results.pills.what_holds_you_back")}
              </Text>
            </View>
            <View style={s.listContainer}>
              {symptomsText.map((txt, i) => (
                <View
                  key={i}
                  style={[
                    s.listItem,
                    i === symptomsText.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={s.bullet} />
                  <Text style={s.cardTextList}>{txt}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Button to continue */}
      <Animated.View
        entering={FadeInDown.delay(800).duration(500)}
        style={s.footer}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }}
          style={s.button}
        >
          <Text style={s.buttonText}>{t("onboarding.continue")}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default ResultsSlide;

const s = StyleSheet.create({
  container: {
    flex: 1,
    // Background color is handled by the parent slide wrapper
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.background,
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 40,
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  pill: {
    backgroundColor: `${colors.surface}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  pillText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "lowercase",
  },
  cardTextMain: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.background,
    lineHeight: 24,
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.background}10`,
    paddingBottom: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
  cardTextList: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.background,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
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
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});
