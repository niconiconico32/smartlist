import { PRIMARY_GRADIENT_COLORS } from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Sparkles,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Tipos
interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  isListening: boolean;
  isProcessing?: boolean;
  transcribedText?: string;
}

// Sugerencias de tareas para el carrusel
const SUGGESTION_PILLS = [
  { emoji: "🧹", title: "Limpieza profunda a mi habitación" },
  { emoji: "🧳", title: "Desempacar la maleta después de un viaje" },
  { emoji: "🌱", title: "Empezar un huerto en el balcón" },
  { emoji: "💰", title: "Armar el presupuesto de este mes y pagar cuentas" },
  { emoji: "📄", title: "Actualizar mi currículum y portafolio" },
  { emoji: "📚", title: "Estudiar para un examen importante" },
  { emoji: "🍖", title: "Organizar un asado o cena para amigos" },
  { emoji: "💸", title: "Vender algo que ya no uso por internet" },
];

export function TaskModalNew({
  visible,
  onClose,
  onSubmit,
  onVoiceStart,
  onVoiceStop,
  isListening,
  isProcessing = false,
  transcribedText = "",
}: TaskModalProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [pillIndex, setPillIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Animaciones
  const micScale = useSharedValue(1);
  const micPulse = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);
  const iconRotation = useSharedValue(0);
  const waveHeights = useRef([
    useSharedValue(8),
    useSharedValue(12),
    useSharedValue(16),
    useSharedValue(12),
    useSharedValue(8),
  ]).current;

  // Sincronizar texto transcrito con el estado local
  useEffect(() => {
    if (transcribedText && transcribedText.trim()) {
      setText(transcribedText);
    }
  }, [transcribedText]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      setText("");
      setIsRecording(false);
      setPillIndex(0);
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    }
  }, [visible]);

  // Efecto "Respiración" para el micrófono cuando está grabando
  useEffect(() => {
    if (isListening || isRecording) {
      micScale.value = withRepeat(
        withSequence(
          withTiming(1.15, {
            duration: 600,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.5, { duration: 600 }),
        ),
        -1,
        false,
      );

      waveHeights.forEach((height, index) => {
        const randomHeight = 8 + Math.random() * 24;
        height.value = withRepeat(
          withSequence(
            withTiming(randomHeight, { duration: 300 + index * 50 }),
            withTiming(8 + Math.random() * 16, { duration: 300 + index * 50 }),
          ),
          -1,
          true,
        );
      });
    } else {
      micScale.value = withTiming(1, { duration: 200 });
      glowOpacity.value = withTiming(0.5, { duration: 200 });
      waveHeights.forEach((height) => {
        height.value = withTiming(8, { duration: 200 });
      });
    }
  }, [isListening, isRecording]);

  useEffect(() => {
    micPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  useEffect(() => {
    if (isProcessing) {
      iconRotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      iconRotation.value = withTiming(0, { duration: 300 });
    }
  }, [isProcessing, iconRotation]);

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRecording || isListening) {
      onVoiceStop();
      setIsRecording(false);
    }
    onClose();
  }, [isRecording, isListening, onVoiceStop, onClose]);

  const handleSubmit = useCallback(() => {
    if (!text.trim() && !isProcessing) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    );
    onSubmit(text.trim());
  }, [text, isProcessing, onSubmit, buttonScale]);

  const handleMicPressIn = useCallback(() => {
    if (isProcessing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(true);
    onVoiceStart();
    recordingTimeoutRef.current = setTimeout(() => {
      handleMicPressOut();
    }, 30000);
  }, [isProcessing, onVoiceStart]);

  const handleMicPressOut = useCallback(() => {
    if (!isRecording && !isListening) return;
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRecording(false);
    onVoiceStop();
  }, [isRecording, isListening, onVoiceStop]);

  const handleMicToggle = useCallback(() => {
    if (isRecording || isListening) {
      handleMicPressOut();
    } else {
      handleMicPressIn();
    }
  }, [isRecording, isListening, handleMicPressIn, handleMicPressOut]);

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: isListening || isRecording ? micScale.value : micPulse.value },
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const waveBarStyles = waveHeights.map((height) =>
    useAnimatedStyle(() => ({
      height: height.value,
    })),
  );

  const isActive = isListening || isRecording;
  const canSubmit = text.trim().length > 0 || isProcessing;
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoidingContainer}
        keyboardVerticalOffset={0}
      >
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              entering={SlideInDown.springify()
                .damping(20)
                .mass(0.5)
                .stiffness(100)}
              exiting={SlideOutDown.duration(200)}
              style={styles.animatedContainer}
            >
              <View
                style={[
                  styles.innerContainer,
                  {
                    paddingBottom: Math.max(
                      insets.bottom,
                      Platform.OS === "ios" ? 40 : 24,
                    ),
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <Sparkles size={32} color={colors.primary} />
                    <Text style={styles.headerTitle}>Rompe la Parálisis</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  {isActive ? (
                    <View style={styles.listeningContainer}>
                      <Animated.Text
                        style={[styles.listeningText, glowStyle]}
                        entering={FadeIn.duration(200)}
                      >
                        {isProcessing ? "Analizando..." : "Escuchando..."}
                      </Animated.Text>
                      <View style={styles.waveContainer}>
                        {waveBarStyles.map((style, i) => (
                          <Animated.View
                            key={i}
                            style={[styles.waveBar, style]}
                          />
                        ))}
                      </View>
                      {isProcessing && (
                        <Text style={styles.processingHint}>
                          La IA está desglosando tu tarea...
                        </Text>
                      )}
                    </View>
                  ) : (
                    <TextInput
                      ref={inputRef}
                      multiline
                      placeholder="¿Qué tarea te está abrumando hoy? Funciona mejor si incluyes más detalles..."
                      placeholderTextColor={colors.textTertiary}
                      value={text}
                      onChangeText={setText}
                      style={styles.textInput}
                      selectionColor={colors.primary}
                      maxLength={500}
                      textAlignVertical="top"
                      returnKeyType="default"
                      blurOnSubmit={false}
                    />
                  )}
                </View>

                {!isActive && (
                  <View style={styles.pillCarouselContainer}>
                    <Text style={styles.hintText}>
                      Tal vez esto te puede ayudar a empezar:
                    </Text>
                    <View style={styles.pillRow}>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          setPillIndex(
                            (prev) =>
                              (prev - 1 + SUGGESTION_PILLS.length) %
                              SUGGESTION_PILLS.length,
                          );
                        }}
                        style={styles.pillArrow}
                      >
                        <ChevronLeft size={20} color={colors.textSecondary} />
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          const pill = SUGGESTION_PILLS[pillIndex];
                          setText(pill.title);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium,
                          );
                          inputRef.current?.focus();
                        }}
                        style={styles.pillCard}
                      >
                        <Text style={styles.pillEmoji}>
                          {SUGGESTION_PILLS[pillIndex].emoji}
                        </Text>
                        <Text style={styles.pillTitle} numberOfLines={2}>
                          {SUGGESTION_PILLS[pillIndex].title}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          setPillIndex(
                            (prev) => (prev + 1) % SUGGESTION_PILLS.length,
                          );
                        }}
                        style={styles.pillArrow}
                      >
                        <ChevronRight size={20} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                )}

                <View style={styles.controlDeck}>
                  <Animated.View style={micAnimatedStyle}>
                    <Pressable
                      onPress={handleMicToggle}
                      onLongPress={handleMicPressIn}
                      delayLongPress={200}
                      disabled={isProcessing}
                      style={({ pressed }) => [
                        styles.micButton,
                        isActive && styles.micButtonActive,
                        pressed && !isActive && styles.micButtonPressed,
                        isProcessing && styles.micButtonDisabled,
                      ]}
                    >
                      {isActive ? (
                        <MicOff size={24} color="white" />
                      ) : (
                        <Mic size={24} color="white" />
                      )}
                    </Pressable>
                  </Animated.View>

                  <Animated.View style={[buttonAnimatedStyle, { flex: 1 }]}>
                    <Pressable
                      onPress={handleSubmit}
                      disabled={!canSubmit || isActive}
                      style={[
                        styles.submitButton,
                        !canSubmit || isActive
                          ? styles.submitButtonDisabled
                          : {},
                      ]}
                    >
                      {canSubmit && !isActive ? (
                        <LinearGradient
                          colors={PRIMARY_GRADIENT_COLORS as any}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.submitButtonGradient}
                        >
                          <Animated.View style={iconAnimatedStyle}>
                            <Sparkles
                              size={20}
                              color={colors.background}
                              style={{ marginRight: 8 }}
                            />
                          </Animated.View>
                          <Text style={styles.submitButtonTextActive}>
                            {isProcessing
                              ? "Generando..."
                              : "Crear Tarea Focus"}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <>
                          <Animated.View style={iconAnimatedStyle}>
                            <Sparkles
                              size={20}
                              color={colors.textTertiary}
                              style={{ marginRight: 8 }}
                            />
                          </Animated.View>
                          <Text style={styles.submitButtonTextDisabled}>
                            {isProcessing
                              ? "Generando..."
                              : "Crear Tarea Focus"}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </Animated.View>
                </View>

                <Text style={styles.hintText}>
                  {isActive
                    ? "Toca para detener"
                    : "Usa el micrófono para dictar tus pensamientos"}
                </Text>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  animatedContainer: {
    width: "100%",
    flex: 1,
    borderRadius: 0,
    overflow: "hidden",
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Jersey10",
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 3,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 20,
    marginTop: 10,
    justifyContent: "flex-start",
  },
  listeningContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 20,
  },
  listeningText: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.primary,
    textAlign: "center",
  },
  processingHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    opacity: 0.7,
  },
  waveContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
  },
  waveBar: {
    width: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
    minHeight: 8,
  },
  textInput: {
    fontSize: 18,
    fontWeight: "400",
    color: colors.textPrimary,
    lineHeight: 28,
    flex: 1,
    paddingTop: 0,
  },
  pillCarouselContainer: {
    marginBottom: 20,
  },
  pillCarouselLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 10,
    opacity: 0.7,
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pillArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pillCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.textPrimary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255)",
    borderRadius: 32,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  pillEmoji: {
    fontSize: 22,
  },
  pillTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Jersey10",
    color: colors.surface,
    lineHeight: 18,
  },
  controlDeck: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: "auto",
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(254, 86, 76, 0.3)",
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  micButtonActive: {
    backgroundColor: "#DC2626",
    borderColor: "#FCA5A5",
    shadowOpacity: 0.4,
  },
  micButtonPressed: {
    backgroundColor: "#DC2626",
    opacity: 0.9,
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  submitButtonGradient: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.5,
  },
  submitButtonTextActive: {
    color: colors.background,
    fontFamily: "Jersey10",
    fontSize: 22,
  },
  submitButtonTextDisabled: {
    color: colors.textTertiary,
    fontFamily: "Jersey10",
    fontSize: 22,
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
    opacity: 0.5,
  },
});
