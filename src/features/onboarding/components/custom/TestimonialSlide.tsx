import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

// ============================================
// TESTIMONIAL SLIDE — Carousel style
const TESTIMONIALS = [
  {
    initials: "A",
    image: require("@/assets/images/user2.png"),
    name: "Alex",
    age: "onboarding.testimonials.items.alex.age",
    quote: "onboarding.testimonials.items.alex.quote",
  },
  {
    initials: "C",
    image: require("@/assets/images/user1.png"),
    name: "Camila",
    age: "onboarding.testimonials.items.camila.age",
    quote: "onboarding.testimonials.items.camila.quote",
  },
  {
    initials: "D",
    image: require("@/assets/images/user3.png"),
    name: "Diego",
    age: "onboarding.testimonials.items.diego.age",
    quote: "onboarding.testimonials.items.diego.quote",
  },
];

interface Props {
  onNext: () => void;
}

const TestimonialSlide: React.FC<Props> = ({ onNext }) => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const testimonial = TESTIMONIALS[current];

  const goTo = useCallback((dir: -1 | 1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrent((prev) => {
      const next = prev + dir;
      if (next < 0) return TESTIMONIALS.length - 1;
      if (next >= TESTIMONIALS.length) return 0;
      return next;
    });
  }, []);

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(100).duration(400)}
          style={s.title}
        >
          {t("onboarding.testimonials.title")}
        </Animated.Text>

        {/* Avatar area */}
        <View style={s.avatarSection}>
          {/* Left arrow */}
          <Pressable
            onPress={() => goTo(-1)}
            style={s.arrowButton}
            hitSlop={12}
          >
            <Text style={s.arrowText}>‹</Text>
          </Pressable>

          {/* Circular avatar with accent ring */}
          <Animated.View
            entering={FadeIn.delay(200).duration(500)}
            style={s.avatarWrapper}
          >
            <View style={s.avatarRingOuter}>
              <View style={s.avatarRing}>
                <View style={s.avatar}>
                  {testimonial.image ? (
                    <Image source={testimonial.image} style={s.avatarImage} />
                  ) : (
                    <Text style={s.avatarInitials}>{testimonial.initials}</Text>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Right arrow */}
          <Pressable onPress={() => goTo(1)} style={s.arrowButton} hitSlop={12}>
            <Text style={s.arrowText}>›</Text>
          </Pressable>
        </View>

        {/* Name */}
        <Animated.Text
          entering={FadeInDown.delay(300).duration(400)}
          key={`name-${current}`}
          style={s.name}
        >
          {testimonial.name}
        </Animated.Text>
        <Text style={s.age}>{t(testimonial.age)}</Text>

        {/* Big quote mark */}
        <Animated.Text
          entering={FadeIn.delay(350).duration(300)}
          style={s.quoteDecoration}
        >
          "
        </Animated.Text>

        {/* Quote text */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(500)}
          key={`quote-${current}`}
          style={s.quoteText}
        >
          {t(testimonial.quote)}
        </Animated.Text>

        {/* Dots indicator */}
        <View style={s.dots}>
          {TESTIMONIALS.map((_, idx) => (
            <View key={idx} style={[s.dot, idx === current && s.dotActive]} />
          ))}
        </View>
      </ScrollView>

      {/* Button */}
      <View style={s.buttonContainer}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }}
          style={primaryButtonStyles}
        >
          <LinearGradient
            colors={PRIMARY_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={primaryButtonGradient}
          >
            <Text style={primaryButtonText}>{t("onboarding.continue")}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
};

export default TestimonialSlide;

// ============================================
// STYLES
// ============================================
const AVATAR_SIZE = 120;
const RING_SIZE = AVATAR_SIZE + 20;
const RING_OUTER_SIZE = RING_SIZE + 24;

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 32,
    alignItems: "center",
    paddingBottom: 20,
  },
  // ── Title ──
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textPrimary,
    textAlign: "left",
    alignSelf: "flex-start",
    paddingHorizontal: 32,
    marginBottom: 32,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  // ── Avatar section ──
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${colors.textPrimary}1A`,
  },
  arrowText: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: -2,
  },
  avatarWrapper: {
    marginHorizontal: 16,
  },
  avatarRingOuter: {
    width: RING_OUTER_SIZE,
    height: RING_OUTER_SIZE,
    borderRadius: RING_OUTER_SIZE / 2,
    backgroundColor: `${colors.surface}40`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: `${colors.surface}80`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.primary,
    overflow: "hidden",
  },
  avatarInitials: {
    fontSize: 44,
    fontWeight: "900",
    color: colors.textPrimary,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  // ── Name ──
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 2,
  },
  age: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  // ── Quote ──
  quoteDecoration: {
    fontSize: 56,
    fontWeight: "900",
    color: colors.surface,
    lineHeight: 56,
    marginBottom: -4,
  },
  quoteText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  // ── Dots ──
  dots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: `${colors.textPrimary}26`,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  // ── Button ──
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
});
