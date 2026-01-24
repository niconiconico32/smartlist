import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Bell,
  Check,
  ChevronDown,
  Crown,
  Lock,
  Shield,
  X,
  XCircle,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ============================================
// GLOWING PADLOCK COMPONENT
// ============================================
const GlowingPadlock = ({ streakDays }: { streakDays: number }) => {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);
  const rotateY = useSharedValue(0);

  useEffect(() => {
    // Gentle pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Subtle 3D rotation
    rotateY.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-5, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulseScale.value },
      { perspective: 1000 },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.padlockContainer}>
      {/* Outer Glow */}
      <Animated.View style={[styles.padlockGlow, glowStyle]}>
        <LinearGradient
          colors={["#CBA6F7", "#FAB387", "#CBA6F7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.padlockGlowGradient}
        />
      </Animated.View>

      {/* Padlock Icon Container */}
      <Animated.View style={[styles.padlockIconContainer, containerStyle]}>
        <LinearGradient
          colors={["#3B3B54", "#2A2A3E", "#1E1E2E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.padlockIconGradient}
        >
          <Lock size={48} color="#CBA6F7" strokeWidth={1.5} />
        </LinearGradient>
      </Animated.View>

      {/* Streak Badge */}
      <View style={styles.streakBadgeContainer}>
        <LinearGradient
          colors={["#FAB387", "#F9E2AF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.streakBadge}
        >
          <Text style={styles.streakBadgeText}>🔥 Racha: {streakDays} Días</Text>
        </LinearGradient>
      </View>
    </View>
  );
};

// ============================================
// SHIMMER BUTTON COMPONENT
// ============================================
const ShimmerButton = ({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) => {
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    // Shimmer every 3 seconds
    const startShimmer = () => {
      shimmerPosition.value = -1;
      shimmerPosition.value = withDelay(
        3000,
        withTiming(2, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      );
    };

    startShimmer();
    const interval = setInterval(startShimmer, 4200);
    return () => clearInterval(interval);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerPosition.value, [-1, 2], [-200, SCREEN_WIDTH + 200]) },
      { skewX: "-20deg" },
    ],
    opacity: interpolate(shimmerPosition.value, [-1, 0, 1, 2], [0, 0.6, 0.6, 0]),
  }));

  return (
    <Pressable onPress={onPress} style={styles.ctaButtonWrapper}>
      <LinearGradient
        colors={["#CBA6F7", "#B491E0", "#A67FD3"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ctaButton}
      >
        {children}
        {/* Shimmer Overlay */}
        <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.4)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      </LinearGradient>
    </Pressable>
  );
};

// ============================================
// LIQUID BORDER CARD COMPONENT
// ============================================
const LiquidBorderCard = ({
  isHighlighted,
  children,
  onPress,
  isSelected,
}: {
  isHighlighted: boolean;
  children: React.ReactNode;
  onPress: () => void;
  isSelected: boolean;
}) => {
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.pricingCard,
          isHighlighted && styles.pricingCardHighlighted,
          isSelected && styles.pricingCardSelected,
        ]}
      >
        {isHighlighted && (
          <View style={styles.bestValueBadge}>
            <LinearGradient
              colors={["#FAB387", "#F9E2AF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bestValueBadgeGradient}
            >
              <Crown size={12} color="#1E1E2E" />
              <Text style={styles.bestValueText}>Tu mejor opción</Text>
            </LinearGradient>
          </View>
        )}
        {children}
        {isSelected && (
          <View style={styles.selectedCheck}>
            <Check size={16} color="#FFFFFF" strokeWidth={3} />
          </View>
        )}
      </View>
    </Pressable>
  );
};

// ============================================
// FAQ ACCORDION COMPONENT
// ============================================
const FAQItem = ({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Pressable onPress={() => setIsExpanded(!isExpanded)} style={styles.faqItem}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <View style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}>
          <ChevronDown size={20} color="rgba(255,255,255,0.5)" />
        </View>
      </View>
      {isExpanded && (
        <View style={[styles.faqContent, { marginTop: 12 }]}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </Pressable>
  );
};

// ============================================
// MAIN PAYWALL COMPONENT
// ============================================
export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");
  const [isAnnualToggle, setIsAnnualToggle] = useState(true);
  const slideUp = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    // Entrance animation
    backdropOpacity.value = withTiming(1, { duration: 500 });
    slideUp.value = withSpring(0, { damping: 20, stiffness: 90 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideUp.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleClose = () => {
    backdropOpacity.value = withTiming(0, { duration: 300 });
    slideUp.value = withTiming(SCREEN_HEIGHT, { duration: 400 });
    setTimeout(() => router.back(), 400);
  };

  const handleSubscribe = () => {
    // TODO: Implement subscription logic
    console.log("Subscribing to:", selectedPlan);
    router.back();
  };

  const annualPrice = 3.99;
  const monthlyPrice = 5.99;

  return (
    <View style={styles.container}>
      {/* Blurred Background - Simulating Dashboard */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        {/* Mock Dashboard Background */}
        <View style={styles.mockDashboard}>
          <View style={styles.mockHeader} />
          <View style={styles.mockCard} />
          <View style={styles.mockCard} />
          <View style={styles.mockCardSmall} />
        </View>
        
        {/* Blur + Dark Overlay */}
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.darkOverlay} />
      </Animated.View>

      {/* Glass Modal */}
      <Animated.View style={[styles.glassModal, containerStyle]}>
        <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
          {/* Close Button */}
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="rgba(255,255,255,0.6)" />
          </Pressable>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)}>
              <GlowingPadlock streakDays={3} />
            </Animated.View>

            {/* Title */}
            <Animated.View
              entering={FadeInDown.delay(400).duration(600)}
              style={styles.titleSection}
            >
              <Text style={styles.mainTitle}>No pierdas tu racha.</Text>
              <Text style={styles.subtitle}>Esperamos hayas disfrutado tu prueba gratis. Elije un plan para seguir tu progreso.</Text>


            </Animated.View>

            {/* Plan Toggle */}
            <Animated.View
              entering={FadeInDown.delay(500).duration(600)}
              style={styles.toggleContainer}
            >
              <Pressable
                style={[
                  styles.toggleOption,
                  !isAnnualToggle && styles.toggleOptionActive,
                ]}
                onPress={() => {
                  setIsAnnualToggle(false);
                  setSelectedPlan("monthly");
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    !isAnnualToggle && styles.toggleTextActive,
                  ]}
                >
                  Mensual
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleOption,
                  isAnnualToggle && styles.toggleOptionActive,
                ]}
                onPress={() => {
                  setIsAnnualToggle(true);
                  setSelectedPlan("annual");
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    isAnnualToggle && styles.toggleTextActive,
                  ]}
                >
                  Anual
                </Text>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>-33%</Text>
                </View>
              </Pressable>
            </Animated.View>

            {/* Pricing Cards */}
            <Animated.View
              entering={FadeInDown.delay(600).duration(600)}
              style={styles.pricingSection}
            >
              {/* Annual Card */}
              {isAnnualToggle && (
                <LiquidBorderCard
                  isHighlighted={true}
                  isSelected={selectedPlan === "annual"}
                  onPress={() => setSelectedPlan("annual")}
                >
                  <Text style={styles.planName}>Maestría Anual</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceAmount}>${annualPrice}</Text>
                    <Text style={styles.pricePeriod}>/ mes</Text>
                  </View>
                  <Text style={styles.billingNote}>
                    Facturado anualmente (${(annualPrice * 12).toFixed(2)}/año)
                  </Text>
                  <View style={styles.featuresListCompact}>
                    <View style={styles.featureItemCompact}>
                      <Check size={14} color="#A6E3A1" />
                      <Text style={styles.featureTextCompact}>Acceso completo</Text>
                    </View>
                    <View style={styles.featureItemCompact}>
                      <Check size={14} color="#A6E3A1" />
                      <Text style={styles.featureTextCompact}>Cancela cuando quieras</Text>
                    </View>
                    <View style={styles.featureItemCompact}>
                      <Check size={14} color="#A6E3A1" />
                      <Text style={styles.featureTextCompact}>Precio reducido</Text>
                    </View>
                  </View>
                </LiquidBorderCard>
              )}

              {/* Monthly Card */}
              {!isAnnualToggle && (
                <LiquidBorderCard
                  isHighlighted={false}
                  isSelected={selectedPlan === "monthly"}
                  onPress={() => setSelectedPlan("monthly")}
                >
                  <Text style={styles.planName}>Plan Mensual</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceAmount}>${monthlyPrice}</Text>
                    <Text style={styles.pricePeriod}>/ mes</Text>
                  </View>
                  <Text style={styles.billingNote}>Facturado mensualmente</Text>
                  <View style={styles.featuresListCompact}>
                    <View style={styles.featureItemCompact}>
                      <Check size={14} color="#A6E3A1" />
                      <Text style={styles.featureTextCompact}>Acceso completo</Text>
                    </View>
                    <View style={styles.featureItemCompact}>
                      <Check size={14} color="#A6E3A1" />
                      <Text style={styles.featureTextCompact}>Cancela cuando quieras</Text>
                    </View>
                  </View>
                </LiquidBorderCard>
              )}
            </Animated.View>

            {/* CTA Button */}
            <Animated.View
              entering={FadeInDown.delay(700).duration(600)}
              style={styles.ctaSection}
            >
              <ShimmerButton onPress={handleSubscribe}>
                <Lock size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.ctaText}>Desbloquear mi Racha y Continuar</Text>
              </ShimmerButton>
              <Text style={styles.microcopy}>Sin sorpresas. Solo claridad.</Text>
            </Animated.View>

            {/* Trust Guarantees */}
            <Animated.View
              entering={FadeInDown.delay(800).duration(600)}
              style={styles.trustSection}
            >
              <View style={styles.trustItem}>
                <View style={styles.trustIconContainer}>
                  <Bell size={18} color="#CBA6F7" />
                </View>
                <Text style={styles.trustText}>
                  Te avisamos 2 días antes de renovar.
                </Text>
              </View>
              <View style={styles.trustItem}>
                <View style={styles.trustIconContainer}>
                  <XCircle size={18} color="#CBA6F7" />
                </View>
                <Text style={styles.trustText}>
                  Cancela desde la app en segundos.
                </Text>
              </View>
              <View style={styles.trustItem}>
                <View style={styles.trustIconContainer}>
                  <Shield size={18} color="#CBA6F7" />
                </View>
                <Text style={styles.trustText}>
                  Tus datos siempre protegidos.
                </Text>
              </View>
            </Animated.View>

            {/* FAQ Section */}
            <Animated.View
              entering={FadeInDown.delay(900).duration(600)}
              style={styles.faqSection}
            >
              <Text style={styles.faqTitle}>Preguntas Frecuentes</Text>
              <FAQItem
                question="¿Qué pasa con mis datos si cancelo?"
                answer="Tus datos permanecen seguros. Si decides volver, todo estará exactamente como lo dejaste durante 30 días."
              />
              <FAQItem
                question="¿Puedo cambiar de plan después?"
                answer="¡Claro! Puedes cambiar entre el plan mensual y anual en cualquier momento desde la configuración."
              />

            </Animated.View>

           
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A14",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  mockDashboard: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    gap: 16,
  },
  mockHeader: {
    height: 60,
    backgroundColor: "rgba(203, 166, 247, 0.3)",
    borderRadius: 16,
  },
  mockCard: {
    height: 120,
    backgroundColor: "rgba(166, 227, 161, 0.2)",
    borderRadius: 20,
  },
  mockCardSmall: {
    height: 80,
    backgroundColor: "rgba(250, 179, 135, 0.2)",
    borderRadius: 16,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 20, 0.85)",
  },
  glassModal: {
    flex: 1,
    backgroundColor: "rgba(30, 30, 46, 0.95)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: 60,
    overflow: "hidden",
  },
  safeArea: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 100,
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
  },

  // Padlock
  padlockContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  padlockGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    bottom: 10,
    borderRadius: 80,
  },
  padlockGlowGradient: {
    flex: 1,
    borderRadius: 80,
  },
  padlockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  padlockIconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(203, 166, 247, 0.3)",
  },
  streakBadgeContainer: {
    marginTop: -16,
    zIndex: 10,
  },
  streakBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1E2E",
  },

  // Title Section
  titleSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 24,
  },

  // Toggle
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  toggleOptionActive: {
    backgroundColor: "rgba(203, 166, 247, 0.2)",
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
  },
  toggleTextActive: {
    color: "#CBA6F7",
  },
  savingsBadge: {
    backgroundColor: "#A6E3A1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E1E2E",
  },

  // Pricing Cards
  pricingSection: {
    gap: 12,
    marginBottom: 24,
  },
  pricingCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  pricingCardHighlighted: {
    borderColor: "#FAB387",
    backgroundColor: "rgba(250, 179, 135, 0.3)",
  },
  pricingCardSelected: {
    borderColor: "#CBA6F7",
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    right: 16,
  },
  bestValueBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E1E2E",
  },
  selectedCheck: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#CBA6F7",
    alignItems: "center",
    justifyContent: "center",
  },
  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pricePeriod: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    marginLeft: 4,
  },
  billingNote: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 16,
  },
  featuresListCompact: {
    gap: 8,
  },
  featureItemCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureTextCompact: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },

  // CTA Button
  ctaSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  ctaButtonWrapper: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 20,
    overflow: "hidden",
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 100,
  },
  shimmerGradient: {
    flex: 1,
  },
  microcopy: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 12,
  },

  // Trust Section
  trustSection: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 28,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trustIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(203, 166, 247, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  trustText: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },

  // FAQ Section
  faqSection: {
    marginBottom: 20,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    paddingRight: 8,
  },
  faqContent: {
    overflow: "hidden",
  },
  faqAnswer: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 20,
  },

  // Restore Link
  restoreLink: {
    alignItems: "center",
    padding: 12,
  },
  restoreLinkText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.4)",
    textDecorationLine: "underline",
  },
});
