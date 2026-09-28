import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { slideStyles } from "../../styles/shared";
import ChevronLeftIcon from "../ChevronLeftIcon";
import PixelCTAButton from "../PixelCTAButton";

// ============================================
// TESTIMONIAL SLIDE — Carousel style with swipe
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
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonial = TESTIMONIALS[currentIndex];

  const goPrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentIndex((next) => Math.min(TESTIMONIALS.length - 1, next + 1));
  };

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
          style={[
            slideStyles.slideTitle,
            slideStyles.questionTitle,
            s.title,
          ]}
        >
          {t("onboarding.testimonials.title")}
        </Animated.Text>

        {/* Testimonial card */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          style={s.carouselContainer}
        >
          <View style={s.pickerArea}>
            {/* Left arrow */}
            <Pressable
              onPress={goPrev}
              disabled={currentIndex === 0}
              style={({ pressed }) => [
                s.arrowBtn,
                (pressed || currentIndex === 0) && s.arrowBtnDisabled,
              ]}
            >
              <ChevronLeftIcon color={colors.primaryContent} size={32} />
            </Pressable>

            {/* Current testimonial */}
            <View style={s.testimonialPage}>
              {/* Circular avatar with accent ring */}
              <View style={s.avatarWrapper}>
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
              </View>

              {/* Name */}
              <Text style={s.name}>{testimonial.name}</Text>
              <Text style={s.age}>{t(testimonial.age)}</Text>

              {/* Big quote mark */}
              <Text style={s.quoteDecoration}>"</Text>

              {/* Quote text */}
              <Text style={s.quoteText}>{t(testimonial.quote)}</Text>
            </View>

            {/* Right arrow */}
            <Pressable
              onPress={goNext}
              disabled={currentIndex === TESTIMONIALS.length - 1}
              style={({ pressed }) => [
                s.arrowBtn,
                (pressed || currentIndex === TESTIMONIALS.length - 1) &&
                  s.arrowBtnDisabled,
              ]}
            >
              <View style={s.flip}>
                <ChevronLeftIcon color={colors.primaryContent} size={32} />
              </View>
            </Pressable>
          </View>

          {/* Dots indicator */}
          <View style={s.dots}>
            {TESTIMONIALS.map((_, idx) => (
              <Pressable key={idx} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentIndex(idx);
              }}>
                <View style={[s.dot, idx === currentIndex && s.dotActive]} />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Button */}
      <View style={s.buttonContainer}>
        <PixelCTAButton
          label={t("onboarding.continue")}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }}
        />
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
  title: {
    color: colors.textPrimary,
    textAlign: "left",
    alignSelf: "flex-start",
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  carouselContainer: {
    alignItems: "center",
  },
  pickerArea: {
    flexDirection: "row",
    alignItems: "center",
  },
  arrowBtn: {
    width: 44,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  flip: {
    transform: [{ scaleX: -1 }],
  },
  testimonialPage: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  avatarWrapper: {
    marginBottom: 20,
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
    fontFamily: "Inter",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
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
    fontFamily: "Inter",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
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
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
});
