import { colors } from "@/constants/theme";
import { PaywallModal } from "@/src/components/PaywallModal";
import React, { useCallback } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface Props {
  onNext: () => void;
}

const PaywallOnboardingSlide: React.FC<Props> = ({ onNext }) => {
  const handleClose = useCallback(() => {
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
          style={s.title}
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
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
});
