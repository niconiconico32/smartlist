import { colors as themeColors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import TypewriterText from "@/src/features/onboarding/components/TypewriterText";
import { useVoiceTask } from "@/src/hooks/useVoiceTask";
import { supabase } from "@/src/lib/supabase";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowUp,
  BookOpen,
  Droplets,
  Mic,
  Shirt,
  Sparkles,
  Target,
  Wind,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInUp,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { SafeAreaView } from "react-native-safe-area-context";
import { useAchievementsStore } from "../store/achievementsStore";
import { C, copilotStyles as styles } from "./CopilotStyles";
import { OUTFIT_IMAGES } from "./FocusHeroCard";
import { Subtask as AppSubtask, SubtaskListScreen } from "./SubtaskListScreen";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const ORB_SIZE = Math.min(SCREEN_W, SCREEN_H) * 2.5;

// --- Animated Radial Gradient Orb for expanded phase ---
function ExpandedGradientOrb({ visible }: { visible: boolean }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 18, stiffness: 80 });
      opacity.value = withTiming(1, { duration: 600 });
    } else {
      scale.value = withTiming(0.2, { duration: 350 });
      opacity.value = withTiming(0, { duration: 350 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: ORB_SIZE,
          height: ORB_SIZE,
          borderRadius: ORB_SIZE / 2,
          alignSelf: "center",
          top: "50%",
          marginTop: -(ORB_SIZE / 2),
          overflow: "hidden",
        },
        animStyle,
      ]}
    >
      {/* Radial-ish gradient: concentric LinearGradient from center outward */}
      <LinearGradient
        colors={[
          "rgba(139, 92, 246, 0.55)",
          "rgba(99, 102, 241, 0.35)",
          "rgba(168, 85, 247, 0.12)",
          "transparent",
        ]}
        style={{ flex: 1 }}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.35, 0.65, 1]}
      />
      {/* Gaussian blur overlay */}
      <BlurView
        intensity={60}
        tint="light"
        style={{
          ...StyleSheet.absoluteFillObject,
          borderRadius: ORB_SIZE / 2,
        }}
      />
    </Animated.View>
  );
}

// --- Bento Quick Actions ---
const BENTO_PILLS = [
  {
    id: "laundry",
    labelKey: "copilot.pills.laundry_label",
    textKey: "copilot.pills.laundry",
    icon: Shirt,
  },
  {
    id: "room",
    labelKey: "copilot.pills.room_label",
    textKey: "copilot.pills.room",
    icon: Sparkles,
  },
  {
    id: "study",
    labelKey: "copilot.pills.study_label",
    textKey: "copilot.pills.study",
    icon: BookOpen,
  },
  {
    id: "breathe",
    labelKey: "copilot.pills.breathe_label",
    textKey: "copilot.pills.breathe",
    icon: Wind,
  },
  {
    id: "focus",
    labelKey: "copilot.pills.focus_label",
    textKey: "copilot.pills.focus",
    icon: Target,
  },
  {
    id: "water",
    labelKey: "copilot.pills.water_label",
    textKey: "copilot.pills.water",
    icon: Droplets,
  },
];

// --- Interfaces ---
interface Subtask {
  title: string;
  duration: number;
}
interface TaskDivisionResult {
  title: string;
  emoji: string;
  tasks: Subtask[];
}

type CopilotPhase =
  | "idle"
  | "processing_expansion"
  | "expanded"
  | "processing_division"
  | "result";

// --- Pulsing Wave Ring (recording active) ---
function PulseWave({ size, isActive }: { size: number; isActive: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 1500, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 0 }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
          withTiming(0.5, { duration: 0 }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.micWaveRing, animStyle]} />;
}

// --- Breathing Mic Button (Haptics + Aura + LongPress + Processing) ---
function BreathingMicButton({
  isRecording,
  isDisabled,
  onPressIn,
  onPressOut,
  compact = false,
}: {
  isRecording: boolean;
  isDisabled: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  compact?: boolean;
}) {
  const isProcessing = isDisabled && !isRecording;

  // Aura breathing
  const auraScale = useSharedValue(1);
  const auraOpacity = useSharedValue(0.12);
  // Mic scale
  const micScale = useSharedValue(1);
  // Icon blink
  const iconOpacity = useSharedValue(1);

  // Track if long press was actually recognized
  const isActuallyRecording = useRef(false);

  useEffect(() => {
    if (isProcessing) {
      // Processing state: pulsing aura to indicate thought process
      auraScale.value = withRepeat(
        withSequence(
          withTiming(1.15, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1.05, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
      auraOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      micScale.value = withSpring(0.95); // Slightly smaller when processing
      iconOpacity.value = withTiming(0, { duration: 200 });
    } else if (!isRecording) {
      // Idle: gentle breathing on the aura
      auraScale.value = withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      auraOpacity.value = withRepeat(
        withSequence(
          withTiming(0.18, {
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0.06, {
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      );
      micScale.value = withSpring(1);
      iconOpacity.value = withTiming(1, { duration: 200 });
    } else {
      // Recording: aura expands, icon blinks
      auraScale.value = withRepeat(
        withSequence(
          withTiming(1.35, {
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1.15, {
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      );
      auraOpacity.value = withTiming(0.25, { duration: 300 });
      micScale.value = withSpring(1.08);
      iconOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    }
  }, [isRecording, isProcessing]);

  // Must be defined before any conditional return to follow Rules of Hooks
  const compactMicStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(isRecording ? 1.5 : 1, {
          damping: 12,
          stiffness: 100,
        }),
      },
    ],
  }));

  const { t } = useTranslation();

  const handlePressIn = () => {
    isActuallyRecording.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onPressIn();
  };

  const handlePressOut = () => {
    if (isActuallyRecording.current) {
      isActuallyRecording.current = false;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPressOut();
    }
  };

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: auraScale.value }],
    opacity: auraOpacity.value,
  }));

  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
  }));

  // Compact mode: simple inline mic button for inside the text input bar
  if (compact) {
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
      >
        <Animated.View
          style={[
            styles.sendButton,
            isRecording && { backgroundColor: C.danger },
            compactMicStyle,
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color={C.white} size="small" />
          ) : (
            <Animated.View style={[iconAnimStyle]}>
              <Mic size={20} color={C.white} strokeWidth={1.5} />
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View style={styles.micContainer}>
      {/* Recording ripple waves */}
      <PulseWave size={220} isActive={isRecording} />
      <PulseWave size={260} isActive={isRecording} />

      {/* Mic button with native Pressable hold */}
      <View style={styles.micWrapper}>
        {/* Breathing aura */}
        <Animated.View
          style={[
            styles.micAura,
            auraStyle,
            isProcessing && { backgroundColor: C.success },
          ]}
        />

        {/* Core button */}
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDisabled}
        >
          <Animated.View
            style={[
              styles.micButton,
              micStyle,
              isProcessing && { backgroundColor: C.success },
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator color={C.white} size="large" />
            ) : (
              <Animated.View style={iconAnimStyle}>
                <Mic size={48} color={C.white} strokeWidth={1.5} />
              </Animated.View>
            )}
          </Animated.View>
        </Pressable>
      </View>

      {/* Hint label */}
      <Text
        style={[
          styles.micHint,
          isRecording && styles.micHintActive,
          isProcessing && { color: C.success, fontWeight: "600" },
        ]}
      >
        {isRecording
          ? t("copilot.mic_hint_recording")
          : isProcessing
            ? t("copilot.mic_hint_processing")
            : t("copilot.mic_hint_idle")}
      </Text>
    </View>
  );
}

// ============================
// MAIN COMPONENT
// ============================
interface CopilotProps {
  onClose: () => void;
  onAddTask?: (
    title: string,
    emoji: string,
    subtasks: AppSubtask[],
    difficulty: "easy" | "moderate" | "hard",
    startImmediately: boolean,
  ) => void;
}

export function Copilot({ onClose, onAddTask }: CopilotProps) {
  const { t, i18n } = useTranslation();
  const [inputText, setInputText] = useState("");
  const [phase, setPhase] = useState<CopilotPhase>("idle");
  const [taskResult, setTaskResult] = useState<TaskDivisionResult | null>(null);
  const [expandedParagraph, setExpandedParagraph] = useState("");
  const [userInput, setUserInput] = useState("");
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { activeOutfit, activeOutfitUri } = useAchievementsStore();
  const inputRef = useRef<TextInput>(null);

  // Typewriter state
  const [bubbleReady, setBubbleReady] = useState(false);
  const [typewriterDone, setTypewriterDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBubbleReady(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Track keyboard visibility
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Voice recording
  const {
    recording,
    isProcessing: isVoiceProcessing,
    startRecording,
    stopRecording,
    cleanup,
  } = useVoiceTask((transcribedText: string) => {
    setIsRecordingActive(false);
    if (transcribedText.trim()) {
      expandUserInput(transcribedText.trim());
    } else {
      Alert.alert(
        t("copilot.voice_error_title"),
        t("copilot.voice_error_message"),
      );
    }
  });

  // Floating mascot animation
  const mascotY = useSharedValue(0);
  useEffect(() => {
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const mascotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  // Recording overlay blinking dot
  const blinkingOpacity = useSharedValue(1);
  useEffect(() => {
    if (isRecordingActive || recording) {
      blinkingOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
        true,
      );
    } else {
      blinkingOpacity.value = 1;
    }
  }, [isRecordingActive, recording]);

  const blinkingDotStyle = useAnimatedStyle(() => ({
    opacity: blinkingOpacity.value,
  }));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // --- Send to AI and get expanded task paragraph ---
  const expandUserInput = useCallback(async (text: string) => {
    setUserInput(text);
    setPhase("processing_expansion");

    try {
      const { data, error } = await supabase.functions.invoke("copilot-chat", {
        body: { task: text, locale: i18n?.language ?? "en" },
      });

      if (error) throw new Error(error.message || t("copilot.error_connect"));

      setExpandedParagraph(data?.expanded_task || text);
      setPhase("expanded");
    } catch (err: any) {
      console.error("[Copilot] Error expand:", err);
      setExpandedParagraph(t("copilot.expand_fallback_prefix") + text + ".");
      setPhase("expanded");
    }
  }, []);

  // --- Send expanded text to AI to divide into subtasks ---
  const divideExpandedTask = useCallback(async () => {
    setPhase("processing_division");

    try {
      const { data, error } = await supabase.functions.invoke("divide-task", {
        body: { task: expandedParagraph, locale: i18n?.language ?? "en" },
      });

      if (error) throw new Error(error.message || t("copilot.error_connect"));

      setTaskResult(data as TaskDivisionResult);
      setPhase("result");
    } catch (err: any) {
      console.error("[Copilot] Error divide:", err);
      setTaskResult({
        title: t("copilot.error_divide_title"),
        emoji: "⚠️",
        tasks: [],
      });
      setPhase("result");
    }
  }, [expandedParagraph]);

  // --- Send text input ---
  const handleSendText = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setInputText("");
    expandUserInput(trimmed);
  }, [inputText, expandUserInput]);

  // --- Bento pill tap ---
  const handleBentoPill = useCallback(
    (label: string) => {
      const clean = label.replace(/^[^\w\s]+\s*/u, "").trim();
      expandUserInput(clean);
    },
    [expandUserInput],
  );

  // --- Mic Handlers (Hold-to-Speak) ---
  const handleMicPressIn = async () => {
    try {
      setIsRecordingActive(true);
      await startRecording();
    } catch (e) {
      console.error("Mic press in error:", e);
      setIsRecordingActive(false);
    }
  };

  const handleMicPressOut = async () => {
    try {
      await stopRecording();
    } catch (e) {
      console.error("Mic press out error:", e);
    } finally {
      setIsRecordingActive(false);
    }
  };

  // --- Action handlers ---
  const handleStart = useCallback(() => {
    // TODO: Navigate to focus mode or task execution with the AI plan
    onClose();
  }, [onClose]);

  const handleAdjust = useCallback(() => {
    setPhase("idle");
    setInputText(userInput);
    setTaskResult(null);
    setExpandedParagraph("");
  }, [userInput]);

  const isProcessing = phase.startsWith("processing");

  // ============================
  // RENDER
  // ============================
  if (phase === "result" && taskResult) {
    return (
      <SubtaskListScreen
        taskTitle={taskResult.title}
        taskEmoji={taskResult.emoji}
        initialSubtasks={taskResult.tasks.map((t, idx) => ({
          id: `${Date.now()}-${idx}`,
          title:
            t.title ||
            (t as any).task ||
            (t as any).name ||
            (t as any).description ||
            "Subtarea",
          duration: t.duration || 5,
          isCompleted: false,
        }))}
        onStart={(subtasks, title, emoji) => {
          if (onAddTask) {
            onAddTask(title, emoji, subtasks, "easy", true);
          }
          onClose();
        }}
        onAddToList={(title, emoji, subtasks) => {
          if (onAddTask) {
            onAddTask(title, emoji, subtasks, "easy", false);
          }
          onClose();
        }}
        onClose={handleAdjust} // Go back to the "expanded" view instead of closing Copilot
        makePrimaryAddToList={false}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {phase !== "expanded" && (
        <LinearGradient
          colors={[themeColors.background, "#ffffff"]}
          style={styles.gradient}
          start={{ x: 0, y: -0.1 }}
          end={{ x: 0.6, y: 0.88 }}
        />
      )}

      <SafeAreaView style={styles.safeArea}>
        {/* Floating Close Button */}
        <Pressable onPress={onClose} style={styles.floatingCloseButton}>
          <X size={24} color={C.textSecondary} />
        </Pressable>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {/* === IDLE: Mascot + Mic + Bento + Input === */}
          {phase === "idle" && (
            <View style={styles.idleContainer}>
              {/* Top Mascot */}
              <View style={styles.topMascotContainer}>
                {/* Speech bubble (Typewriter Text) */}
                <Animated.View style={styles.speechBubbleContainer}>
                  <View>
                    {bubbleReady && (
                      <TypewriterText
                        text={t("copilot.idle_prompt")}
                        style={styles.speechBubbleText}
                        delay={300}
                        onComplete={() => setTypewriterDone(true)}
                      />
                    )}
                  </View>
                </Animated.View>

                <Animated.View style={mascotAnimStyle}>
                  {activeOutfit && OUTFIT_IMAGES[activeOutfit] ? (
                    <Image
                      source={OUTFIT_IMAGES[activeOutfit]}
                      style={styles.topMascotImage}
                      resizeMode="contain"
                    />
                  ) : activeOutfit && activeOutfitUri ? (
                    <Image
                      source={{ uri: activeOutfitUri }}
                      style={styles.topMascotImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Image
                      source={require("../../assets/images/logomain.png")}
                      style={styles.topMascotImage}
                      resizeMode="contain"
                    />
                  )}
                </Animated.View>
              </View>
            </View>
          )}

          {/* === PROCESSING === */}
          {phase.startsWith("processing") && (
            <View style={styles.processingContainer}>
              <Animated.View
                entering={FadeIn.duration(400)}
                style={styles.processingContent}
              >
                {/* Mascot */}
                <Animated.View style={mascotAnimStyle}>
                  {activeOutfit && OUTFIT_IMAGES[activeOutfit] ? (
                    <Image
                      source={OUTFIT_IMAGES[activeOutfit]}
                      style={styles.processingMascot}
                      resizeMode="contain"
                    />
                  ) : activeOutfit && activeOutfitUri ? (
                    <Image
                      source={{ uri: activeOutfitUri }}
                      style={styles.processingMascot}
                      resizeMode="contain"
                    />
                  ) : (
                    <Image
                      source={require("../../assets/images/logomain.png")}
                      style={styles.processingMascot}
                      resizeMode="contain"
                    />
                  )}
                </Animated.View>
                <ActivityIndicator
                  size="large"
                  color={C.indigo}
                  style={{ marginTop: 24 }}
                />
                <Text style={styles.processingText}>
                  {phase === "processing_expansion"
                    ? t("copilot.processing_expanding")
                    : t("copilot.processing_dividing")}
                </Text>
                {phase === "processing_expansion" && (
                  <Text style={styles.processingSubtext}>"{userInput}"</Text>
                )}
              </Animated.View>
            </View>
          )}

          {/* === EXPANDED: Review & Edit Paragraph === */}
          {phase === "expanded" && (
            <View style={{ flex: 1, width: "100%" }}>
              {/* Animated radial gradient orb (behind content) */}
              <ExpandedGradientOrb visible={phase === "expanded"} />

              <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Animated.View
                  entering={FadeInUp.delay(100).springify()}
                  style={styles.resultContent}
                >
                  {/* Speech bubble (Typewriter Text) para fase expanded */}
                  <Animated.View style={styles.speechBubbleContainer}>
                    <View>
                      {phase === "expanded" && (
                        <TypewriterText
                          text={t("copilot.expanded_prompt")}
                          style={[
                            styles.speechBubbleText,
                            { color: C.deepNight },
                          ]}
                          delay={1100}
                        />
                      )}
                    </View>
                  </Animated.View>

                  <Animated.View style={mascotAnimStyle}>
                    {activeOutfit && OUTFIT_IMAGES[activeOutfit] ? (
                      <Image
                        source={OUTFIT_IMAGES[activeOutfit]}
                        style={styles.resultMascot}
                        resizeMode="contain"
                      />
                    ) : activeOutfit && activeOutfitUri ? (
                      <Image
                        source={{ uri: activeOutfitUri }}
                        style={styles.resultMascot}
                        resizeMode="contain"
                      />
                    ) : (
                      <Image
                        source={require("../../assets/images/logomain.png")}
                        style={styles.resultMascot}
                        resizeMode="contain"
                      />
                    )}
                  </Animated.View>

                  <Animated.View
                    entering={FadeInDown.delay(300).springify()}
                    style={styles.analysisCard}
                  >
                    <TextInput
                      style={styles.expandedInput}
                      value={expandedParagraph}
                      onChangeText={setExpandedParagraph}
                      multiline
                    />
                  </Animated.View>

                  <Animated.View
                    entering={FadeInDown.delay(500).springify()}
                    style={styles.resultActions}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.startButton,
                        pressed && styles.startButtonPressed,
                      ]}
                      onPress={divideExpandedTask}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Sparkles
                          size={20}
                          color={themeColors.textSecondary}
                          style={{ marginRight: 8, marginTop: 1 }}
                        />
                        <Text style={styles.startButtonText}>
                          {t("copilot.divide_button")}
                        </Text>
                      </View>
                    </Pressable>

                    <View></View>
                    <Text
                      style={{
                        marginTop: 12,
                        color: C.textSecondary,
                        textAlign: "center",
                        fontSize: 11,
                      }}
                    >
                      {t("copilot.divide_hint")}
                    </Text>
                  </Animated.View>
                </Animated.View>
              </ScrollView>
            </View>
          )}

          {/* --- Text Input Bar (only in idle) --- */}
          {phase === "idle" && (
            <Animated.View
              entering={FadeInDown.delay(600).springify()}
              style={styles.altInputWrapper}
            >
              {/* Compact Bento Pills */}
              {!keyboardVisible &&
                inputText.length === 0 &&
                !isRecordingActive &&
                !recording && (
                  <Animated.View
                    entering={FadeInDown.delay(400).springify()}
                    style={{ width: "100%" }}
                  >
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.bentoScrollContent}
                    >
                      {[0, 1, 2].map((rowIndex) => (
                        <View
                          key={`row-${rowIndex}`}
                          style={[
                            styles.bentoRow,
                            { marginLeft: (2 - rowIndex) * 12 }, // Escalonado invertido (mayor a menor)
                          ]}
                        >
                          {BENTO_PILLS.filter((_, i) => i % 3 === rowIndex).map(
                            (pill) => (
                              <Pressable
                                key={pill.id}
                                style={({ pressed }) => [
                                  styles.bentoPill,
                                  pressed && styles.bentoPillPressed,
                                ]}
                                onPress={() => handleBentoPill(t(pill.textKey))}
                              >
                                <pill.icon
                                  size={12}
                                  color={C.textPrimary}
                                  style={styles.bentoPillIcon}
                                />
                                <Text style={styles.bentoPillText}>
                                  {t(pill.labelKey)}
                                </Text>
                              </Pressable>
                            ),
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  </Animated.View>
                )}

              <View style={styles.altInputContainer}>
                {/* Recording Overlay */}
                {(isRecordingActive || recording) && (
                  <Animated.View
                    entering={FadeInLeft.duration(200)}
                    exiting={FadeOutLeft.duration(200)}
                    style={styles.recordingOverlayContainer}
                  >
                    <Animated.View
                      style={[styles.recordingRedDot, blinkingDotStyle]}
                    />
                    <Text style={styles.recordingOverlayText}>
                      {t("copilot.recording_overlay")}
                    </Text>
                  </Animated.View>
                )}

                <TextInput
                  ref={inputRef}
                  style={[
                    styles.altInput,
                    (isRecordingActive || recording) && { opacity: 0 },
                  ]}
                  placeholder={t("copilot.input_placeholder")}
                  placeholderTextColor={C.textDim}
                  value={inputText}
                  onChangeText={setInputText}
                  maxLength={300}
                  multiline={true}
                  blurOnSubmit={false}
                />

                {inputText.trim().length > 0 ? (
                  <Animated.View
                    entering={FadeIn.duration(150)}
                    exiting={FadeIn.duration(150)}
                  >
                    <Pressable
                      style={styles.sendButton}
                      onPress={handleSendText}
                    >
                      <ArrowUp size={20} color={C.white} strokeWidth={2.5} />
                    </Pressable>
                  </Animated.View>
                ) : (
                  <Animated.View
                    entering={FadeIn.duration(150)}
                    exiting={FadeIn.duration(150)}
                  >
                    <BreathingMicButton
                      isRecording={isRecordingActive || recording}
                      isDisabled={isProcessing || isVoiceProcessing}
                      onPressIn={handleMicPressIn}
                      onPressOut={handleMicPressOut}
                      compact={true}
                    />
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
