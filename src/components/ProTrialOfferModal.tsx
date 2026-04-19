import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { posthog } from "@/src/config/posthog";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import { Crown, Sparkles } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useAchievementsStore } from "../store/achievementsStore";
import { useProStore } from "../store/proStore";
import { CoinsCounter } from "./CoinsCounter";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GIFT_SIZE = SCREEN_WIDTH * 0.72;
const CARD_WIDTH = SCREEN_WIDTH * 0.6;
const CARD_GAP = 12;

const BENEFIT_CARDS = [
  {
    id: "0",
    title: "Widget en tu pantalla",
    subtitle:
      "Accede a tus rutinas y tareas directamente desde tu pantalla de inicio.",
    image: require("@/assets/images/widget.jpeg"),
  },
  {
    id: "1",
    title: "Multiplicador de Coronas",
    subtitle:
      "Las coronas que ganas aumentarán un 15% por cada día de tu Racha Diaria.",
    image: require("@/assets/images/probird.png"),
  },
  {
    id: "2",
    title: "Escudo de Racha",
    subtitle:
      "2 protecciones semanales para que no pierdas tu bonus de Racha Diaria.",
    image: require("@/assets/images/escudo.png"),
  },
  {
    id: "3",
    title: "Tienda Exclusiva",
    subtitle:
      "Fondos animados, skins y accesorios premium disponibles en la Tienda.",
    image: require("@/assets/images/ropero.png"),
  },
];

interface ProTrialOfferModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProTrialOfferModal: React.FC<ProTrialOfferModalProps> = ({
  visible,
  onClose,
}) => {
  const { activateTrial, dismissTrialOffer } = useProStore();
  const [phase, setPhase] = useState<"gift" | "revealed">("gift");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const viewedAtRef = useRef<number>(0);

  // Track view when modal opens
  React.useEffect(() => {
    if (visible) {
      viewedAtRef.current = Date.now();
      posthog.capture("trial_offer_viewed", { phase: "gift" });
    }
  }, [visible]);

  // Si se cierra por un tap fuera o botón físico, NO rechazamos permanentemente la oferta
  const handleSoftClose = () => {
    onClose();
    // Reseteamos el estado visual por si se vuelve a abrir después
    setTimeout(() => setPhase("gift"), 500);
  };

  const handleOpenChest = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase("revealed");
    posthog.capture("trial_offer_chest_opened", {
      time_to_open_seconds: Math.round(
        (Date.now() - viewedAtRef.current) / 1000,
      ),
    });
    // NOTE: Trial is NOT activated yet — only reveals the benefits.
    // activateTrial() is called in Phase 2 when the user taps "Convertirme en Pro".
  };

  const handleDismiss = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    posthog.capture("trial_offer_dismissed", { phase });
    await dismissTrialOffer(); // Hard reject: No se volverá a mostrar
    onClose();
    setTimeout(() => setPhase("gift"), 500);
  };

  /** Phase 2 CTA: activate trial then close */
  const handleActivateTrial = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    posthog.capture("trial_offer_accepted", {
      time_to_accept_seconds: Math.round(
        (Date.now() - viewedAtRef.current) / 1000,
      ),
    });
    await activateTrial();
    onClose();
    setTimeout(() => setPhase("gift"), 500);
  };

  const renderBenefitCard = ({ item }: { item: (typeof BENEFIT_CARDS)[0] }) => {
    const totalCoins = useAchievementsStore.getState().totalCoins;

    return (
      <View style={styles.benefitCard}>
        {item.id === "1" ? (
          /* Crowns Pill — Centered inside a container matching the image dimensions */
          <View
            style={[
              styles.benefitCardImage,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <View style={styles.crownsPillPreview}>
              <Crown size={28} color="#1A1C20" strokeWidth={2.5} />
              <CoinsCounter coins={totalCoins} size="large" color="#1A1C20" />
              <View style={styles.multiplierBadge}>
                <Text style={styles.multiplierText}>x1.5</Text>
              </View>
            </View>
          </View>
        ) : (
          <Image
            source={item.image}
            style={styles.benefitCardImage}
            resizeMode="contain"
          />
        )}
        <Text style={styles.benefitCardTitle}>{item.title}</Text>
        <Text style={styles.benefitCardSubtitle}>{item.subtitle}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleSoftClose}
    >
      {phase === "gift" ? (
        /* ═══════════════════════════════════════════
         *  FASE 1 — REGALO (Full-screen purple)
         * ═══════════════════════════════════════════ */
        <View style={styles.fullScreenCentered}>
          <LinearGradient
            colors={["#9333EA", "#7C3AED", "#A855F7"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Floating sparkle decorations — scattered */}
          <Animated.View
            entering={FadeIn.delay(400).duration(600)}
            style={styles.sparkle1}
          >
            <Sparkles size={20} color="rgba(255,255,255,0.5)" />
          </Animated.View>
          <Animated.View
            entering={FadeIn.delay(550).duration(600)}
            style={styles.sparkle2}
          >
            <Sparkles size={14} color="rgba(255,255,255,0.35)" />
          </Animated.View>
          <Animated.View
            entering={FadeIn.delay(700).duration(600)}
            style={styles.sparkle3}
          >
            <Sparkles size={18} color="rgba(255,255,255,0.4)" />
          </Animated.View>
          <Animated.View
            entering={FadeIn.delay(850).duration(600)}
            style={styles.sparkle4}
          >
            <Sparkles size={12} color="rgba(255,255,255,0.3)" />
          </Animated.View>
          <Animated.View
            entering={FadeIn.delay(500).duration(600)}
            style={styles.sparkle5}
          >
            <Sparkles size={22} color="rgba(255,255,255,0.25)" />
          </Animated.View>
          <Animated.View
            entering={FadeIn.delay(950).duration(600)}
            style={styles.sparkle6}
          >
            <Sparkles size={10} color="rgba(255,255,255,0.45)" />
          </Animated.View>
          <Animated.View
            entering={FadeIn.delay(650).duration(600)}
            style={styles.sparkle7}
          >
            <Sparkles size={16} color="rgba(255,255,255,0.3)" />
          </Animated.View>

          {/* Gift animation */}
          <Animated.View
            entering={ZoomIn.springify().damping(12).delay(200)}
            style={styles.giftContainer}
          >
            <LottieView
              source={{
                uri: "https://lottie.host/7590d704-6c56-499a-8e98-b7de7bc28d75/bNRRuunGD4.lottie",
              }}
              autoPlay
              loop
              style={styles.giftImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Text content */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(500)}
            style={styles.textContainer}
          >
            <Text style={styles.titleGift}>¡Tienes un Regalo!</Text>
            <Text style={styles.subtitleGift}>
              El primer paso es el más difícil.{"\n"} Te mereces un impulso
              extra.
            </Text>
          </Animated.View>

          {/* Buttons at bottom */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(500)}
            style={styles.bottomButtons}
          >
            <Pressable
              style={({ pressed }) => [
                styles.primaryButtonGift,
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleOpenChest}
            >
              <Text style={styles.primaryButtonGiftText}>Aceptar Regalo</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButtonGift}
              onPress={handleDismiss}
            >
              <Text style={styles.secondaryButtonGiftText}>No lo quiero</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : (
        /* ═══════════════════════════════════════════
         *  FASE 2 — REVELACIÓN (Golden)
         * ═══════════════════════════════════════════ */
        <View style={styles.fullScreenTop}>
          <LinearGradient
            colors={[colors.surface, colors.surface]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Floating sparkles — scattered */}
          <Animated.View
            entering={FadeIn.delay(300).duration(600)}
            style={styles.sparkle1}
          >
            <Sparkles size={20} color="rgba(255,255,255,0.6)" />
          </Animated.View>
          <Animated.View
            entering={FadeIn.delay(450).duration(600)}
            style={styles.sparkle2}
          >
            <Sparkles size={14} color="rgba(255,255,255,0.4)" />
          </Animated.View>
          <Animated.View
            entering={FadeIn.delay(600).duration(600)}
            style={styles.sparkle3}
          >
            <Sparkles size={18} color="rgba(255,255,255,0.45)" />
          </Animated.View>
          <Animated.View
            entering={FadeIn.delay(750).duration(600)}
            style={styles.sparkle5}
          >
            <Sparkles size={22} color="rgba(255,255,255,0.3)" />
          </Animated.View>
          <Animated.View
            entering={FadeIn.delay(500).duration(600)}
            style={styles.sparkle6}
          >
            <Sparkles size={10} color="rgba(255,255,255,0.5)" />
          </Animated.View>
          <Animated.View
            entering={FadeIn.delay(850).duration(600)}
            style={styles.sparkle7}
          >
            <Sparkles size={16} color="rgba(255,255,255,0.35)" />
          </Animated.View>

          {/* Pro bird + lottie side by side */}
          <Animated.View
            entering={ZoomIn.springify().damping(12).delay(200)}
            style={styles.revealedImageContainer}
          >
            <LottieView
              source={{
                uri: "https://lottie.host/8cc772d1-64da-4429-a40b-b7232701dc9b/KOpQe9uhId.lottie",
              }}
              autoPlay
              loop
              style={styles.revealedLottie}
              resizeMode="contain"
            />
            <Image
              source={require("@/assets/images/probird.png")}
              style={styles.revealedImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Text — compact */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(500)}
            style={styles.textContainerRevealed}
          >
            <Text style={styles.titleGolden}>
              ¡Has recibido 7 días {"\n"} de BrainyPro!
            </Text>
            <Text style={styles.subtitleGolden}>
              Úsalo para potenciar tu enfoque al máximo.
            </Text>
          </Animated.View>

          {/* ── Benefit Cards Carousel ── */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(500)}
            style={styles.carouselContainer}
          >
            <FlatList
              ref={flatListRef}
              data={BENEFIT_CARDS}
              renderItem={renderBenefitCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContent}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP),
                );
                setActiveCardIndex(index);
              }}
            />
            {/* Pagination dots */}
            <View style={styles.dotsContainer}>
              {BENEFIT_CARDS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    activeCardIndex === i && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </Animated.View>

          {/* Button */}
          <Animated.View
            entering={FadeInDown.delay(800).duration(500)}
            style={styles.bottomButtons}
          >
            <Pressable
              style={({ pressed }) => [
                styles.primaryButtonGolden,
                pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleActivateTrial}
            >
              <Text style={styles.primaryButtonGoldenText}>
                {" "}
                ¡Activar Prueba Gratis!
              </Text>
            </Pressable>
            <Text style={styles.disclaimerText}>
              No necesitas ingresar datos de tu tarjeta.{"\n"}No se te cobrará
              nada al final de este periodo.
            </Text>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: SCREEN_HEIGHT * 0.22,
  },
  fullScreenTop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: SCREEN_HEIGHT * 0.08,
  },

  // ── Sparkle decorations (7 positions) ──
  sparkle1: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.07,
    left: SCREEN_WIDTH * 0.08,
  },
  sparkle2: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.11,
    right: SCREEN_WIDTH * 0.1,
  },
  sparkle3: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.28,
    left: SCREEN_WIDTH * 0.05,
  },
  sparkle4: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.35,
    right: SCREEN_WIDTH * 0.06,
  },
  sparkle5: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.5,
    left: SCREEN_WIDTH * 0.12,
  },
  sparkle6: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.15,
    left: SCREEN_WIDTH * 0.45,
  },
  sparkle7: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.44,
    right: SCREEN_WIDTH * 0.1,
  },

  // ── Gift image (Fase 1) ──
  giftContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: SCREEN_HEIGHT * 0.01,
  },
  giftImage: {
    width: GIFT_SIZE,
    height: GIFT_SIZE,
  },

  // ── Revealed image (Fase 2 — smaller, pushed up) ──
  revealedImageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SCREEN_HEIGHT * 0.01,
  },
  revealedLottie: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.35,
  },
  revealedImage: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.35,
  },

  // ── Text ──
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 8,
    gap: 12,
  },
  textContainerRevealed: {
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 12,
    gap: 8,
  },
  titleGift: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 36,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleGift: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 24,
  },
  titleGolden: {
    fontSize: 40,
    fontFamily: "Jersey10",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 32,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitleGolden: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Benefit Cards Carousel ──
  carouselContainer: {
    marginTop: 60,
    width: "100%",
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    gap: CARD_GAP,
  },
  benefitCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  benefitCardImage: {
    width: 156,
    height: 156,
    marginBottom: 10,
  },
  crownsPillPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF0FC",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 42,
    gap: 6,
    position: "relative",
  },
  multiplierBadge: {
    position: "absolute",
    top: -14,
    right: -16,
    backgroundColor: "#C9FD5A",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  multiplierText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#280D8C",
  },
  benefitCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A2E",
    textAlign: "center",
  },
  benefitCardSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    width: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },

  // ── Buttons ──
  bottomButtons: {
    position: "absolute",
    bottom: 50,
    left: 24,
    right: 24,
    gap: 8,
    alignItems: "center",
  },
  primaryButtonGift: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonGiftText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#7C3AED",
    letterSpacing: 0.3,
  },
  secondaryButtonGift: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonGiftText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  primaryButtonGolden: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  primaryButtonGoldenText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#B45309",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
