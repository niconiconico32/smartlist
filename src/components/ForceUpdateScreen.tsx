import { PRIMARY_GRADIENT_COLORS } from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { ExternalLink, RefreshCw } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ForceUpdateScreenProps {
  storeUrl: string;
  message: string;
}

export function ForceUpdateScreen({
  storeUrl,
  message,
}: ForceUpdateScreenProps) {
  const insets = useSafeAreaInsets();

  // Floating mascot animation
  const floatAnim = useRef(new Animated.Value(0)).current;
  // Pulse for the CTA button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Fade-in for the whole screen
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in the screen
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Mascot floating loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Button gentle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const handleUpdate = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (storeUrl) {
      await Linking.openURL(storeUrl);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Background gradient blobs */}
      <View style={styles.blobTop} pointerEvents="none" />
      <View style={styles.blobBottom} pointerEvents="none" />

      {/* Mascot */}
      <Animated.View
        style={[
          styles.mascotWrapper,
          { transform: [{ translateY: floatAnim }] },
        ]}
      >
        <Image
          source={require("../../assets/images/logomain.png")}
          style={styles.mascot}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Badge */}
      <View style={styles.badge}>
        <RefreshCw size={14} color={colors.background} strokeWidth={2.5} />
        <Text style={styles.badgeText}>Actualización necesaria</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>
        ¡Tu mascota{"\n"}necesita medicina nueva!
      </Text>

      {/* Body */}
      <Text style={styles.body}>{message}</Text>
      <Text style={styles.hint}>Haz click abajo para ir a la tienda.</Text>

      {/* CTA Button */}
      <Animated.View
        style={[styles.ctaWrapper, { transform: [{ scale: pulseAnim }] }]}
      >
        <Pressable
          onPress={handleUpdate}
          style={({ pressed }) => [
            styles.ctaPressable,
            pressed && { opacity: 0.85 },
          ]}
        >
          <LinearGradient
            colors={PRIMARY_GRADIENT_COLORS as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <ExternalLink
              size={22}
              color={colors.background}
              strokeWidth={2.5}
              style={{ marginRight: 10 }}
            />
            <Text style={styles.ctaLabel}>
              {Platform.OS === "ios" ? "Ir a App Store" : "Ir a Play Store"}
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <Text style={styles.version}>
        Esta actualización trae estabilidad y nuevas funciones para ti 🧠✨
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  blobTop: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(139, 92, 246, 0.18)",
  },
  blobBottom: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(236, 242, 48, 0.08)",
  },
  mascotWrapper: {
    marginBottom: 24,
  },
  mascot: {
    width: 140,
    height: 140,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Jersey10",
    color: colors.background,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 36,
    fontFamily: "Jersey10",
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 40,
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: "center",
    marginBottom: 40,
  },
  ctaWrapper: {
    width: "100%",
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 24,
  },
  ctaPressable: {
    width: "100%",
    borderRadius: 32,
    overflow: "hidden",
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  ctaLabel: {
    fontSize: 24,
    fontFamily: "Jersey10",
    color: colors.background,
  },
  version: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center",
    opacity: 0.6,
    lineHeight: 18,
  },
});
