import { colors, shadows } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { PaywallModal } from "@/src/components/PaywallModal";
import { posthog } from "@/src/config/posthog";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  getClaimSummary,
  ClaimSummary,
} from "@/src/lib/funnelClaim";
import { useOnboardingStore } from "@/src/store/onboardingStore";
import { useProStore } from "@/src/store/proStore";
import { EGG_METADATA } from "@/src/store/eggStore";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const EGG_EMOJIS = ["🥚", "🐣", "🐥", "🦜"];

export default function PlanReadyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const isPro = useProStore((s) => s.isPro);
  const [summary, setSummary] = useState<ClaimSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const handledRef = useRef(false);

  // Track purchase completion inside the paywall outcome.
  const onPaywallClose = useCallback(async () => {
    setShowPaywall(false);

    const nowPro = useProStore.getState().isPro;
    if (nowPro) {
      posthog.capture("funnel_purchase_success", { source: "plan_ready" });
      await useOnboardingStore.getState().completeOnboarding();
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      router.replace("/(tabs)");
    }
  }, [router]);

  useEffect(() => {
    let isActive = true;

    const bootstrap = async () => {
      const stored = await getClaimSummary();

      if (isActive) {
        posthog.capture("funnel_plan_ready_view", {
          taskCount: stored?.taskCount ?? 0,
          routineCount: stored?.routineCount ?? 0,
          eggCount: stored?.eggCount ?? 0,
        });

        setSummary(stored);
        setLoaded(true);

        // Without a claim summary this screen isn't reachable in a valid flow.
        if (!stored) {
          handledRef.current = true;
          router.replace(session?.user?.id ? "/(tabs)" : "/login");
        }
      }
    };

    bootstrap().catch(() => {
      if (isActive) {
        setLoaded(true);
        router.replace(session?.user?.id ? "/(tabs)" : "/login");
      }
    });

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCta = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isPro) {
      await useOnboardingStore.getState().completeOnboarding();
      router.replace("/(tabs)");
      return;
    }

    posthog.capture("funnel_paywall_view", { source: "plan_ready" });
    setShowPaywall(true);
  }, [isPro, router]);

  if (!loaded) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </View>
    );
  }

  const countCards: Array<{ value: number; label: string; emoji: string }> = [
    {
      value: summary?.taskCount ?? 0,
      label: t("funnel.plan_ready.task_count_label"),
      emoji: "✅",
    },
    {
      value: summary?.routineCount ?? 0,
      label: t("funnel.plan_ready.routine_count_label"),
      emoji: "🔁",
    },
    {
      value: summary?.eggCount ?? 0,
      label: t("funnel.plan_ready.egg_count_label"),
      emoji: "🥚",
    },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          entering={FadeInUp.duration(600).delay(100)}
          style={styles.scroll}
        >
          <View style={styles.hero}>
            <Image
              source={require("../assets/images/logomain.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text testID="planReadyTitle" style={styles.title}>{t("funnel.plan_ready.title")}</Text>
            <Text style={styles.subtitle}>
              {t("funnel.plan_ready.subtitle")}
            </Text>
          </View>

          <Animated.View
            entering={FadeInDown.duration(600).delay(300)}
            style={styles.cards}
          >
            {countCards.map((card) => (
              <View key={card.label} style={styles.card}>
                <Text style={styles.cardEmoji}>{card.emoji}</Text>
                <Text style={styles.cardValue}>{card.value}</Text>
                <Text style={styles.cardLabel}>{card.label}</Text>
              </View>
            ))}
          </Animated.View>

          {!!summary && summary.eggCount > 0 &&
            (!summary.routines.some((r) => r.eggCatalogId != null) ? (
              <Animated.View
                entering={FadeInDown.duration(600).delay(400)}
                style={styles.companionsBox}
              >
                <Text style={styles.companionsTitle}>
                  {t("funnel.plan_ready.companions_title")}
                </Text>
                <Text style={styles.companionsText}>
                  {EGG_EMOJIS.slice(0, Math.min(summary.eggCount, 4)).join(" ")}
                </Text>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeInDown.duration(600).delay(400)}
                style={styles.companionsBox}
              >
                <Text style={styles.companionsTitle}>
                  {t("funnel.plan_ready.pairs_title")}
                </Text>
                {summary.routines
                  .filter((r) => r.eggCatalogId != null)
                  .map((routine) => {
                    const egg = EGG_METADATA.find(
                      (e) => e.id === routine.eggCatalogId,
                    );
                    return (
                      <View key={routine.id} style={styles.pairRow}>
                        <Image
                          source={egg?.image ?? EGG_METADATA[0].image}
                          style={styles.pairEgg}
                          resizeMode="contain"
                        />
                        <Text style={styles.pairText}>
                          {routine.icon}  {routine.name}
                        </Text>
                      </View>
                    );
                  })}
              </Animated.View>
            ))}

          <Animated.View
            entering={FadeInDown.duration(600).delay(500)}
            style={styles.ctaArea}
          >
            <Pressable
              testID="planReadyCta"
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.ctaPressed,
              ]}
              onPress={handleCta}
            >
              <Text style={styles.ctaText}>
                {t("funnel.plan_ready.cta")}
              </Text>
            </Pressable>
            <Text style={styles.hint}>
              {isPro
                ? t("funnel.plan_ready.pro_hint")
                : t("funnel.plan_ready.paywall_hint")}
            </Text>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>

      <PaywallModal
        visible={showPaywall}
        onClose={onPaywallClose}
        source="funnel_plan_ready"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 28,
  },
  hero: {
    alignItems: "center",
    paddingTop: 24,
    gap: 8,
  },
  logo: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -1,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  cards: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 28,
  },
  card: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: 18,
    paddingHorizontal: 8,
    ...shadows.medium,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardValue: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.primary,
    marginTop: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  companionsBox: {
    alignItems: "center",
    backgroundColor: "rgba(203, 166, 247, 0.1)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    marginBottom: 8,
    gap: 6,
  },
  companionsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  companionsText: {
    fontSize: 26,
    letterSpacing: 6,
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
    paddingHorizontal: 16,
  },
  pairEgg: {
    width: 36,
    height: 36,
  },
  pairText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    flexShrink: 1,
  },
  ctaArea: {
    gap: 12,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 20,
    alignItems: "center",
    ...shadows.glow,
  },
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primaryContent,
  },
  hint: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.textTertiary,
    textAlign: "center",
  },
});