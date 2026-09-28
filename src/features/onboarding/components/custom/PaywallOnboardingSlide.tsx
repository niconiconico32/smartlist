import { colors } from "@/constants/theme";
import { PaywallModal } from "@/src/components/PaywallModal";
import { posthog } from "@/src/config/posthog";
import { getCustomerInfo, isPremiumActive } from "@/src/utils/purchases";
import React, { useCallback } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { slideStyles } from "../../styles/shared";

interface Props {
  onNext: () => void;
}

const PaywallOnboardingSlide: React.FC<Props> = ({ onNext }) => {
  const handleClose = useCallback(async () => {
    try {
      const info = await getCustomerInfo();
      if (isPremiumActive(info)) {
        posthog.capture("onboarding_trial_started", {
          flow_version: "v3",
          source: "paywall-onboarding",
        });
      }
    } catch {
      // Silently ignore — user continues either way
    }
    onNext();
  }, [onNext]);

  return (
    <View style={s.container}>
      <PaywallModal
        visible
        onClose={handleClose}
        source="onboarding_paywall"
        offeringId="paywallonboarding"
      />
      <View style={s.content}>
        <Animated.Text
          entering={FadeInDown.delay(120).duration(400)}
          style={[slideStyles.slideTitle, slideStyles.questionTitle, s.title]}
        >
          Loading your offer
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(220).duration(400)}
          style={s.subtitle}
        >
          One moment while we open the checkout.
        </Animated.Text>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </View>
  );
};

export default PaywallOnboardingSlide;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  title: {
    color: colors.textPrimary,
    textAlign: "center",
    alignSelf: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
});
