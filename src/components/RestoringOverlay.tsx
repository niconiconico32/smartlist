import { colors, shadows } from "@/constants/theme";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppText as Text } from "./AppText";

export interface RestoreReadySummary {
  taskCount: number;
  routineCount: number;
  eggCount: number;
}

/**
 * Full-screen overlay used by the NEW post-login restore path. Not a
 * navigation route — it overlays the current screen (the ORIGINAL login
 * screen) so there is no visible /claim → /plan-ready navigation on the
 * happy path.
 *
 * Two states:
 *  - busy: "Preparando tu Brainy…" spinner while restore/redeem runs.
 *  - ready: real plan counts + a "Empezar" CTA that routes straight to HOME.
 *    The user is never sent to onboarding or another paywall.
 *
 * Renders nothing when `active` is false.
 */
export function RestoringOverlay({
  active,
  summary,
  onStart,
  retryable = false,
  onRetry,
}: {
  active: boolean;
  summary?: RestoreReadySummary | null;
  onStart?: () => void;
  retryable?: boolean;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();

  if (!active) return null;

  const isReady = !!summary && !!onStart;

  if (isReady) {
    const cards: Array<{ value: number; label: string; emoji: string }> = [
      {
        value: summary.taskCount,
        label: t("funnel.restore.task_label"),
        emoji: "✅",
      },
      {
        value: summary.routineCount,
        label: t("funnel.restore.routine_label"),
        emoji: "🔁",
      },
      {
        value: summary.eggCount,
        label: t("funnel.restore.companion_label"),
        emoji: "🥚",
      },
    ];

    return (
      <View style={styles.backdrop}>
        <View style={styles.readyCard}>
          <Text testID="restoreReadyTitle" style={styles.title}>
            {t("funnel.restore.ready_title")}
          </Text>
          <Text style={styles.subtitle}>
            {t("funnel.restore.ready_subtitle")}
          </Text>

          <View style={styles.counts}>
            {cards.map((card) => (
              <View key={card.label} style={styles.countItem}>
                <Text style={styles.countEmoji}>{card.emoji}</Text>
                <Text testID={`restoreReadyCount_${card.label}`} style={styles.countValue}>
                  {card.value}
                </Text>
                <Text style={styles.countLabel}>{card.label}</Text>
              </View>
            ))}
          </View>

          <Pressable
            testID="restoreReadyCta"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={onStart}
          >
            <Text style={styles.ctaText}>{t("funnel.restore.ready_cta")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (retryable && onRetry) {
    return (
      <View style={styles.backdrop}>
        <View style={styles.readyCard}>
          <Text style={styles.title}>Tu Brainy sigue listo 🎉</Text>
          <Text style={styles.subtitle}>
            La compra todavía se está verificando. Puedes reintentar ahora.
          </Text>
          <Pressable
            testID="restoreRetryCta"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={onRetry}
          >
            <Text style={styles.ctaText}>Reintentar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.title}>{t("funnel.handoff.preparing_title")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    paddingHorizontal: 28,
  },
  card: {
    alignItems: "center",
    gap: 18,
  },
  readyCard: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 22,
    gap: 10,
    ...shadows.large,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  counts: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
    marginVertical: 12,
  },
  countItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.glass,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 2,
  },
  countEmoji: {
    fontSize: 20,
  },
  countValue: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.primary,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  cta: {
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 4,
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
});
