import { colors } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TESTIMONIALS = [
  {
    text: "This app literally is a thumb green almost overnight. My once-drowsy positives now unfurls a new leaf every week!",
    stars: 5,
  },
  {
    text: "Transformó completamente mi forma de trabajar. Ahora puedo dividir tareas grandes sin estrés.",
    stars: 5,
  },
  {
    text: "Mi TDAH ya no es un obstáculo. Esta app es mi copiloto perfecto para cada día.",
    stars: 5,
  },
];

const SUBSCRIPTION_OPTIONS = [
  {
    id: "yearly",
    name: "Yearly",
    price: "$69.99",
    perMonth: "$5.83/mo",
    savings: true,
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$9.99/mo",
    perMonth: null,
    savings: false,
  },
];

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const handleContinue = () => {
    // Aquí implementarías la lógica de compra
    router.replace("/(tabs)");
  };

  const handleRestore = () => {
    // Implementar lógica de restauración de compras
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Close Button */}
      <Pressable onPress={() => router.back()} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>✕</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo/Mascot */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.logoContainer}
        >
          <Image
            source={require("@/assets/images/logomain.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          style={styles.title}
        >
          A little warmth when{"\n"}you need it most
        </Animated.Text>

        {/* Stars */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={styles.starsContainer}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <Text key={star} style={styles.star}>
              ⭐
            </Text>
          ))}
        </Animated.View>

        {/* Testimonial */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(500)}
          style={styles.testimonialContainer}
        >
          <Text style={styles.testimonialText}>
            "{TESTIMONIALS[currentTestimonial].text}"
          </Text>
        </Animated.View>

        {/* Dots Indicator */}
        <View style={styles.dotsContainer}>
          {TESTIMONIALS.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => setCurrentTestimonial(index)}
              style={[
                styles.dot,
                currentTestimonial === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Subscription Options */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(500)}
          style={styles.plansContainer}
        >
          {SUBSCRIPTION_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setSelectedPlan(option.id)}
              style={[
                styles.planCard,
                selectedPlan === option.id && styles.planCardSelected,
              ]}
            >
              {/* Radio Button */}
              <View style={styles.radioContainer}>
                <View
                  style={[
                    styles.radioOuter,
                    selectedPlan === option.id && styles.radioOuterSelected,
                  ]}
                >
                  {selectedPlan === option.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>

              {/* Plan Details */}
              <View style={styles.planDetails}>
                <Text
                  style={[
                    styles.planName,
                    selectedPlan === option.id && styles.planNameSelected,
                  ]}
                >
                  {option.name}
                </Text>
                {option.perMonth && (
                  <Text style={styles.planSubtext}>{option.perMonth}</Text>
                )}
              </View>

              {/* Price */}
              <Text
                style={[
                  styles.planPrice,
                  selectedPlan === option.id && styles.planPriceSelected,
                ]}
              >
                {option.price}
              </Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* Continue Button */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(500)}
          style={styles.buttonContainer}
        >
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueButtonWrapper,
              pressed && styles.continueButtonPressed,
            ]}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButton}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <Pressable onPress={handleRestore}>
            <Text style={styles.footerLink}>Restore Purchases</Text>
          </Pressable>
          <Text style={styles.footerSeparator}>•</Text>
          <Pressable>
            <Text style={styles.footerLink}>Terms</Text>
          </Pressable>
          <Text style={styles.footerSeparator}>•</Text>
          <Pressable>
            <Text style={styles.footerLink}>Privacy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 32,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 16,
  },
  star: {
    fontSize: 16,
  },
  testimonialContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  testimonialText: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  plansContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  radioContainer: {
    marginRight: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  planDetails: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 2,
  },
  planNameSelected: {
    color: colors.textPrimary,
  },
  planSubtext: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.textSecondary,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  planPriceSelected: {
    color: colors.textPrimary,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 20,
  },
  continueButtonWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButton: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.background,
    letterSpacing: 0.3,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerLink: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  footerSeparator: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
