import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { hapticSuccess } from "@/utils/haptics";
import { playSuccessChime } from "@/utils/sounds";
import LottieView from "lottie-react-native";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { slideStyles } from "../../styles/shared";
import PixelCTAButton from "../PixelCTAButton";

interface Props {
  onNext: () => void;
}

export default function AllDoneSlide({ onNext }: Props) {
  const { t } = useTranslation();
  const lottieRef = useRef<LottieView>(null);

  // Chime de éxito sincronizado con el reveal de la animación/logo
  useEffect(() => {
    const timer = setTimeout(() => {
      playSuccessChime();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={s.container}>
      {/* Animation + Logo stacked */}
      <Animated.View
        entering={FadeInUp.delay(100).duration(700)}
        style={s.animationWrapper}
      >
        {/* Lottie behind */}
        <LottieView
          ref={lottieRef}
          source={{
            uri: "https://lottie.host/00209cc7-fa23-41cf-8f33-1b012b69abf6/JblMturQEG.lottie",
          }}
          autoPlay
          loop
          style={s.lottie}
        />

        {/* Logo on top */}
        <Image
          source={require("@/assets/images/logomain.png")}
          style={s.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Text */}
      <Animated.View
        entering={FadeInDown.delay(500).duration(600)}
        style={s.textContainer}
      >
        <Text
          style={[
            slideStyles.slideTitle,
            slideStyles.questionTitle,
            s.centeredTitle,
            { color: colors.background },
          ]}
        >
          {t("onboarding.all_done.title")}
        </Text>
        <Text style={[slideStyles.slideSubtitle, s.centeredSubtitle]}>
          {t("onboarding.all_done.subtitle")}
        </Text>
      </Animated.View>

      {/* Button */}
      <Animated.View
        entering={FadeInDown.delay(800).duration(500)}
        style={s.footer}
      >
        <PixelCTAButton
          label={t("index_tab.onboarding.paywall_slide.go_to_app")}
          onPress={() => {
            hapticSuccess();
            onNext();
          }}
        />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  animationWrapper: {
    width: 360,
    height: 360,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  lottie: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  logo: {
    width: 200,
    height: 200,
    zIndex: 1,
  },
  textContainer: {
    alignItems: "center",
    marginTop: 16,
    width: "100%",
  },
  centeredTitle: {
    textAlign: "center",
    alignSelf: "center",
  },
  centeredSubtitle: {
    textAlign: "center",
    alignSelf: "center",
    lineHeight: 22,
  },
  footer: {
    width: "100%",
    marginTop: 40,
  },
});
