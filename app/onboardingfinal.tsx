import { PRIMARY_GRADIENT_COLORS } from '@/constants/buttons';
import { colors } from '@/constants/theme';
import { useOnboardingStore } from '@/src/store/onboardingStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';
let Notifications: any = {};
if (!isExpoGo) {
  Notifications = require('expo-notifications');
} else {
  Notifications = {
    requestPermissionsAsync: async () => ({ status: 'undetermined' }),
  };
}
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOTAL_SLIDES = 24;

// ─── Typewriter Hook ────────────────────────────────────────────
function useTypewriter(text: string, speed: number = 35, startDelay: number = 300) {
  const [displayed, setDisplayed] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setIsDone(false);
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setIsDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  return { displayed, isDone };
}

// ─── Welcome Screen (Slide 1) ──────────────────────────────────
function WelcomeScreen({ onNext }: { onNext: () => void }) {
  const PHRASES = [
    '¡Hola! Soy Brainy 👋 Tu nuevo compañero de ruta.',
    'Solo unas preguntitas para calibrar tus circuitos 🚀',
  ];
  const [phraseIndex, setPhraseIndex] = useState(0);
  const { displayed, isDone } = useTypewriter(PHRASES[phraseIndex], 35, 500);
  const bubbleScale = useRef(new Animated.Value(0)).current;
  const mascotFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(bubbleScale, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotFloat, { toValue: -8, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(mascotFloat, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (phraseIndex < PHRASES.length - 1) {
      Animated.sequence([
        Animated.timing(bubbleScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
        Animated.spring(bubbleScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]).start();
      setPhraseIndex(phraseIndex + 1);
    } else {
      onNext();
    }
  };

  return (
    <View style={styles.slideContainer}>
      <View style={styles.welcomeDialogueArea}>
        <Animated.View style={[styles.bubbleContainer, { transform: [{ scale: bubbleScale }] }]}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{displayed}</Text>
          </View>
          <View style={styles.bubbleTail} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: mascotFloat }] }}>
          <Image source={require('@/assets/images/streak.png')} style={styles.mascotImage} resizeMode="contain" />
        </Animated.View>
      </View>
      <View style={styles.bottomButtonArea}>
        <Pressable onPress={handleContinue} style={{ width: '100%' }}>
          <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Empezar el viaje</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Name Screen (Slide 2) ─────────────────────────────────────
function NameScreen({ name, setName, onNext }: { name: string; setName: (n: string) => void; onNext: () => void }) {
  const handleContinue = () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };
  return (
    <KeyboardAvoidingView style={styles.slideContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.contentArea}>
        <Text style={styles.slideTitle}>¿Cómo te llamas?</Text>
        <Text style={styles.slideSubtitle}>Tu nombre será el centro de nuestro panel de control.</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="Tu nombre"
          placeholderTextColor={`${colors.textPrimary}55`}
          autoFocus
          maxLength={30}
        />
      </View>
      <View style={styles.bottomButtonArea}>
        <Pressable onPress={handleContinue} style={{ width: '100%', opacity: name.trim() ? 1 : 0.4 }}>
          <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Single Select Screen ───────────────────────────────────────
function SingleSelectScreen({
  title, subtitle, options, selected, setSelected, onNext, buttonText,
}: {
  title: string; subtitle: string; options: string[]; selected: string;
  setSelected: (s: string) => void; onNext: () => void; buttonText?: string;
}) {
  const handleSelect = (opt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(opt);
  };
  const handleContinue = () => {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };
  return (
    <View style={styles.slideContainer}>
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner} showsVerticalScrollIndicator={false}>
        <Text style={styles.slideTitle}>{title}</Text>
        <Text style={styles.slideSubtitle}>{subtitle}</Text>
        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <Pressable key={opt} onPress={() => handleSelect(opt)} style={[styles.optionPill, selected === opt && styles.optionPillActive]}>
              <Text style={[styles.optionPillText, selected === opt && styles.optionPillTextActive]}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottomButtonArea}>
        <Pressable onPress={handleContinue} style={{ width: '100%', opacity: selected ? 1 : 0.4 }}>
          <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{buttonText || 'Continuar'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Multi Select Screen ────────────────────────────────────────
function MultiSelectScreen({
  title, subtitle, options, selected, setSelected, onNext,
}: {
  title: string; subtitle: string; options: string[]; selected: string[];
  setSelected: (s: string[]) => void; onNext: () => void;
}) {
  const toggleOption = (opt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  };
  const handleContinue = () => {
    if (selected.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };
  return (
    <View style={styles.slideContainer}>
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentInner} showsVerticalScrollIndicator={false}>
        <Text style={styles.slideTitle}>{title}</Text>
        <Text style={styles.slideSubtitle}>{subtitle}</Text>
        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <Pressable key={opt} onPress={() => toggleOption(opt)} style={[styles.optionPill, selected.includes(opt) && styles.optionPillActive]}>
              <Text style={[styles.optionPillText, selected.includes(opt) && styles.optionPillTextActive]}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottomButtonArea}>
        <Pressable onPress={handleContinue} style={{ width: '100%', opacity: selected.length > 0 ? 1 : 0.4 }}>
          <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Agreement Scale Screen ─────────────────────────────────────
function AgreementScreen({
  statement, selected, setSelected, onNext,
}: {
  statement: string; selected: number; setSelected: (n: number) => void; onNext: () => void;
}) {
  const labels = ['Nunca', 'Raramente', 'A veces', 'A menudo', 'Siempre'];
  const handleSelect = (val: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(val);
  };
  const handleContinue = () => {
    if (selected === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };
  return (
    <View style={styles.slideContainer}>
      <View style={styles.contentArea}>
        <View style={styles.statementCard}>
          <Text style={styles.statementText}>"{statement}"</Text>
        </View>
        <View style={styles.scaleContainer}>
          {labels.map((label, idx) => {
            const val = idx + 1;
            const isActive = selected === val;
            return (
              <Pressable key={val} onPress={() => handleSelect(val)} style={styles.scaleItem}>
                <View style={[styles.scaleCircle, isActive && styles.scaleCircleActive]}>
                  <Text style={[styles.scaleNumber, isActive && styles.scaleNumberActive]}>{val}</Text>
                </View>
                <Text style={[styles.scaleLabel, isActive && styles.scaleLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.bottomButtonArea}>
        <Pressable onPress={handleContinue} style={{ width: '100%', opacity: selected > 0 ? 1 : 0.4 }}>
          <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Info Screen (Neurociencia, Hábitos, etc.) ──────────────────
function InfoScreen({
  title, content, buttonText, onNext, showMascot,
}: {
  title: string; content: string; buttonText: string; onNext: () => void; showMascot?: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);
  return (
    <View style={styles.slideContainer}>
      <Animated.View style={[styles.contentArea, { opacity: fadeAnim }]}>
        {showMascot && (
          <Image source={require('@/assets/images/streak.png')} style={styles.infoMascot} resizeMode="contain" />
        )}
        <Text style={styles.slideTitle}>{title}</Text>
        <Text style={styles.infoContent}>{content}</Text>
      </Animated.View>
      <View style={styles.bottomButtonArea}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNext(); }} style={{ width: '100%' }}>
          <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{buttonText}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Processing Screen (Slide 18) ──────────────────────────────
function ProcessingScreen({ name, onDone }: { name: string; onDone: () => void }) {
  const steps = [
    'Calculando perfil cognitivo...',
    'Diseñando ruta de dopamina...',
    'Ajustando recordatorios inteligentes...',
  ];
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const mascotFloat = useRef(new Animated.Value(0)).current;
  const progressAnims = useRef(steps.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotFloat, { toValue: -6, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(mascotFloat, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const runStep = (idx: number) => {
      if (idx >= steps.length) {
        setTimeout(onDone, 500);
        return;
      }
      setCurrentStep(idx);
      Animated.timing(progressAnims[idx], {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCompletedSteps((prev) => [...prev, idx]);
        setTimeout(() => runStep(idx + 1), 300);
      });
    };
    const timeout = setTimeout(() => runStep(0), 600);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={[styles.slideContainer, { justifyContent: 'center' }]}>
      <Animated.View style={{ transform: [{ translateY: mascotFloat }], alignItems: 'center', marginBottom: 40 }}>
        <Image source={require('@/assets/images/streak.png')} style={{ width: 120, height: 120 }} resizeMode="contain" />
      </Animated.View>
      <Text style={[styles.slideTitle, { marginBottom: 8 }]}>Analizando tus respuestas...</Text>
      <Text style={[styles.slideSubtitle, { marginBottom: 32 }]}>Preparando todo para ti, {name || 'amigo/a'}</Text>
      <View style={{ width: '80%', gap: 16 }}>
        {steps.map((step, idx) => {
          const barWidth = progressAnims[idx].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
          const isCompleted = completedSteps.includes(idx);
          const isCurrent = currentStep === idx && !isCompleted;
          return (
            <View key={idx} style={{ opacity: idx <= currentStep ? 1 : 0.3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                {isCompleted ? (
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                ) : (
                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: isCurrent ? colors.primary : `${colors.textPrimary}33` }} />
                )}
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: isCurrent ? '600' : '400' }}>{step}</Text>
              </View>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: `${colors.textPrimary}15`, overflow: 'hidden' }}>
                <Animated.View style={{ height: '100%', borderRadius: 2, backgroundColor: colors.primary, width: barWidth }} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Results Screen (Slide 19) ──────────────────────────────────
function ResultsScreen({
  name, painPoints, scales, onNext,
}: {
  name: string; painPoints: string[]; scales: { procrastination: number; memory: number; focus: number; impulsivity: number }; onNext: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const barAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  const categories = [
    { label: 'Enfoque', value: scales.focus, color: '#FF6B6B' },
    { label: 'Memoria', value: scales.memory, color: '#4ECDC4' },
    { label: 'Organización', value: scales.procrastination, color: '#FFE66D' },
    { label: 'Control', value: scales.impulsivity, color: '#A78BFA' },
  ];

  const maxArea = categories.reduce((max, c) => c.value > max.value ? c : max, categories[0]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    categories.forEach((_, idx) => {
      Animated.timing(barAnims[idx], {
        toValue: 1,
        duration: 800,
        delay: 300 + idx * 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
  }, []);

  return (
    <View style={styles.slideContainer}>
      <Animated.ScrollView style={[styles.scrollContent, { opacity: fadeAnim }]} contentContainerStyle={styles.scrollContentInner} showsVerticalScrollIndicator={false}>
        <Text style={styles.slideTitle}>¡Plan de {name || 'tu perfil'} listo!</Text>
        <Text style={[styles.slideSubtitle, { marginBottom: 24 }]}>Tus áreas de oportunidad</Text>
        <View style={styles.chartContainer}>
          {categories.map((cat, idx) => {
            const barHeight = barAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [0, (cat.value / 5) * 120] });
            return (
              <View key={cat.label} style={styles.chartBar}>
                <Text style={styles.chartValue}>{cat.value}/5</Text>
                <View style={styles.chartBarTrack}>
                  <Animated.View style={[styles.chartBarFill, { height: barHeight, backgroundColor: cat.color }]} />
                </View>
                <Text style={styles.chartLabel}>{cat.label}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.resultCard}>
          <Text style={styles.resultCardText}>
            Hemos detectado que tu mayor reto es <Text style={{ color: colors.primary, fontWeight: '800' }}>{maxArea.label}</Text>. Tenemos las herramientas exactas para eso.
          </Text>
        </View>
      </Animated.ScrollView>
      <View style={styles.bottomButtonArea}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNext(); }} style={{ width: '100%' }}>
          <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Ver mi solución</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Commitment Screen (Slide 20) ───────────────────────────────
function CommitmentScreen({ onNext }: { onNext: () => void }) {
  const commitments = [
    'Prometo ser amable conmigo mismo/a si fallo un día.',
    'Dedicaré al menos 2 minutos al día a revisar mi plan.',
    'Confío en que mi cerebro puede aprender nuevas rutas.',
  ];
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);
  const allChecked = checked.every((c) => c);

  const toggleCheck = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  return (
    <View style={styles.slideContainer}>
      <View style={styles.contentArea}>
        <Text style={styles.slideTitle}>Un pequeño trato entre tú y yo</Text>
        <Text style={[styles.slideSubtitle, { marginBottom: 24 }]}>Estos compromisos harán toda la diferencia.</Text>
        {commitments.map((text, idx) => (
          <Pressable key={idx} onPress={() => toggleCheck(idx)} style={styles.commitRow}>
            <View style={[styles.checkbox, checked[idx] && styles.checkboxActive]}>
              {checked[idx] && <Ionicons name="checkmark" size={18} color={colors.background} />}
            </View>
            <Text style={styles.commitText}>{text}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.bottomButtonArea}>
        <Pressable onPress={() => { if (!allChecked) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onNext(); }} style={{ width: '100%', opacity: allChecked ? 1 : 0.4 }}>
          <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Firmar compromiso ✍️</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Testimonial Screen (Slide 21) ──────────────────────────────
function TestimonialScreen({ onNext }: { onNext: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);
  return (
    <View style={styles.slideContainer}>
      <Animated.View style={[styles.contentArea, { opacity: fadeAnim }]}>
        <Text style={styles.slideTitle}>Ya no estás solo/a en esto</Text>
        <View style={styles.testimonialCard}>
          <Text style={styles.testimonialQuote}>
            "Pensé que era flojo, pero Brainy me enseñó que solo necesitaba un sistema que hablara mi idioma."
          </Text>
          <Text style={styles.testimonialAuthor}>— Alex, 29 años</Text>
        </View>
        <View style={[styles.testimonialCard, { marginTop: 16 }]}>
          <Text style={styles.testimonialQuote}>
            "Por primera vez completé una rutina por más de 2 semanas. Eso no me pasaba desde el colegio."
          </Text>
          <Text style={styles.testimonialAuthor}>— Camila, 34 años</Text>
        </View>
      </Animated.View>
      <View style={styles.bottomButtonArea}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNext(); }} style={{ width: '100%' }}>
          <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Notifications Permission Screen (Slide 22) ────────────────
function NotificationsScreen({ onNext }: { onNext: () => void }) {
  const [granted, setGranted] = useState(false);

  const requestPermission = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      setGranted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(onNext, 600);
    }
  };

  return (
    <View style={styles.slideContainer}>
      <View style={styles.contentArea}>
        <Image source={require('@/assets/images/streak.png')} style={styles.infoMascot} resizeMode="contain" />
        <Text style={styles.slideTitle}>Déjame ser tu memoria externa</Text>
        <Text style={styles.slideSubtitle}>
          Necesito permiso para avisarte cuando sea momento de brillar. Prometo no ser pesado.
        </Text>
        {granted && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>¡Notificaciones activadas!</Text>
          </View>
        )}
      </View>
      <View style={styles.bottomButtonArea}>
        {!granted ? (
          <Pressable onPress={requestPermission} style={{ width: '100%' }}>
            <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Activar notificaciones 🔔</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNext(); }} style={{ width: '100%' }}>
            <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Continuar</Text>
            </LinearGradient>
          </Pressable>
        )}
        {!granted && (
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onNext(); }} style={{ marginTop: 12 }}>
            <Text style={styles.skipText}>Quizás más tarde</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Premium Benefits Screen (Slide 23) ─────────────────────────
function PremiumBenefitsScreen({ onNext }: { onNext: () => void }) {
  const benefits = [
    { icon: '🧠', text: 'Algoritmo de IA para TDAH' },
    { icon: '📊', text: 'Reportes semanales de dopamina' },
    { icon: '🎨', text: 'Personalización total de Brainy' },
    { icon: '🚫', text: 'Cero distracciones (Sin anuncios)' },
    { icon: '♾️', text: 'Rutinas y tareas ilimitadas' },
    { icon: '🔔', text: 'Recordatorios inteligentes' },
  ];
  const itemAnims = useRef(benefits.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    benefits.forEach((_, idx) => {
      Animated.timing(itemAnims[idx], {
        toValue: 1,
        duration: 400,
        delay: 200 + idx * 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <View style={styles.slideContainer}>
      <View style={styles.contentArea}>
        <Text style={styles.slideTitle}>Desbloquea tu máximo potencial</Text>
        <Text style={[styles.slideSubtitle, { marginBottom: 24 }]}>Todo lo que necesitas para hackear tu dopamina.</Text>
        {benefits.map((b, idx) => (
          <Animated.View key={idx} style={[styles.benefitRow, { opacity: itemAnims[idx], transform: [{ translateY: itemAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <Text style={{ fontSize: 28 }}>{b.icon}</Text>
            <Text style={styles.benefitText}>{b.text}</Text>
          </Animated.View>
        ))}
      </View>
      <View style={styles.bottomButtonArea}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNext(); }} style={{ width: '100%' }}>
          <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Paywall Screen (Slide 24) ──────────────────────────────────
function PaywallScreen({ onAccept, onSkip }: { onAccept: () => void; onSkip: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleStartTrial = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    // TODO: Integrate RevenueCat purchasePackage
    setTimeout(() => {
      setLoading(false);
      onAccept();
    }, 1000);
  };

  return (
    <View style={styles.slideContainer}>
      <ScrollView style={styles.scrollContent} contentContainerStyle={[styles.scrollContentInner, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
        <Image source={require('@/assets/images/streak.png')} style={{ width: 100, height: 100, marginBottom: 16 }} resizeMode="contain" />
        <Text style={styles.slideTitle}>Empieza tu transformación hoy</Text>
        <Text style={[styles.slideSubtitle, { marginBottom: 24 }]}>
          Prueba Brainy Premium gratis por 7 días.{'\n'}Te avisaremos 2 días antes de que termine.
        </Text>
        <View style={styles.timelineContainer}>
          <View style={styles.timelineLine} />
          <View style={styles.timelineNode}>
            <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.timelineLabel}>Hoy{'\n'}Acceso total</Text>
          </View>
          <View style={styles.timelineNode}>
            <View style={[styles.timelineDot, { backgroundColor: '#FFE66D' }]} />
            <Text style={styles.timelineLabel}>Día 5{'\n'}Recordatorio</Text>
          </View>
          <View style={styles.timelineNode}>
            <View style={[styles.timelineDot, { backgroundColor: '#FF6B6B' }]} />
            <Text style={styles.timelineLabel}>Día 7{'\n'}Cobro</Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottomButtonArea}>
        <Pressable onPress={handleStartTrial} style={{ width: '100%' }} disabled={loading}>
          <LinearGradient colors={PRIMARY_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.primaryButton, loading && { opacity: 0.6 }]}>
            <Text style={styles.primaryButtonText}>{loading ? 'Procesando...' : 'Iniciar mis 7 días gratis'}</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSkip(); }} style={{ marginTop: 12 }}>
          <Text style={styles.skipText}>Quizás más tarde (Versión limitada)</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN ONBOARDING COMPONENT
// ═══════════════════════════════════════════════════════════
export default function OnboardingFinal() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // User data
  const [name, setName] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [currentState, setCurrentState] = useState('');
  const [mainGoal, setMainGoal] = useState('');
  const [productivityTime, setProductivityTime] = useState('');
  const [scaleProcrastination, setScaleProcrastination] = useState(0);
  const [scaleMemory, setScaleMemory] = useState(0);
  const [scaleFocus, setScaleFocus] = useState(0);
  const [scaleImpulsivity, setScaleImpulsivity] = useState(0);
  const [pastBarriers, setPastBarriers] = useState('');
  const [visualization, setVisualization] = useState('');

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentSlide + 1) / TOTAL_SLIDES,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [currentSlide]);

  const animateToNext = useCallback(() => {
    slideAnim.setValue(SCREEN_WIDTH);
    setCurrentSlide((prev) => prev + 1);
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 12,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleBack = () => {
    if (currentSlide === 0) {
      router.back();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    slideAnim.setValue(-SCREEN_WIDTH);
    setCurrentSlide((prev) => prev - 1);
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 12,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const finishOnboarding = () => {
    const store = useOnboardingStore.getState();
    store.setName(name);
    store.setDiagnosis(diagnosis);
    store.setSymptoms(painPoints);
    store.setGoal(mainGoal);
    store.setProductivityTime(productivityTime);
    store.completeOnboarding();
    router.replace('/(tabs)');
  };

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return <WelcomeScreen onNext={animateToNext} />;
      case 1:
        return <NameScreen name={name} setName={setName} onNext={animateToNext} />;
      case 2:
        return (
          <SingleSelectScreen
            title={`¿Qué edad tienes, ${name || 'amigo/a'}?`}
            subtitle="El TDAH se manifiesta de formas únicas en cada etapa de la vida."
            options={['Menos de 18', '18 - 25', '26 - 40', 'Más de 40']}
            selected={ageRange}
            setSelected={setAgeRange}
            onNext={animateToNext}
          />
        );
      case 3:
        return (
          <SingleSelectScreen
            title="¿Tienes un diagnóstico oficial?"
            subtitle="Esto nos ayuda a ajustar el tono de nuestras herramientas."
            options={['Sí, tengo diagnóstico', 'Sospecho que lo tengo', 'No, pero me cuesta concentrarme', 'Solo quiero optimizar mi cerebro']}
            selected={diagnosis}
            setSelected={setDiagnosis}
            onNext={animateToNext}
          />
        );
      case 4:
        return (
          <MultiSelectScreen
            title="¿Qué es lo que más te agota hoy?"
            subtitle='Selecciona todas las que sientas como una carga.'
            options={[
              'La "Parálisis por Análisis"',
              'Perder la noción del tiempo',
              'Empezar cosas y no terminarlas',
              'El ruido mental constante',
              'Olvidar citas o tareas clave',
              'La frustración de no ser "productivo"',
            ]}
            selected={painPoints}
            setSelected={setPainPoints}
            onNext={animateToNext}
          />
        );
      case 5:
        return (
          <SingleSelectScreen
            title="¿Cómo te sientes respecto a tu organización?"
            subtitle="Sé honesto, Brainy no juzga."
            options={[
              '🤯 Abrumado/a constantemente',
              '🐌 Siento que voy más lento que el resto',
              '⚡️ Tengo ráfagas, pero no constancia',
              '🤔 Sé que puedo dar más, pero no sé cómo',
            ]}
            selected={currentState}
            setSelected={setCurrentState}
            onNext={animateToNext}
          />
        );
      case 6:
        return (
          <SingleSelectScreen
            title="Si pudieras dominar una sola cosa, ¿cuál sería?"
            subtitle="Este será nuestro norte."
            options={[
              'Terminar mis proyectos a tiempo',
              'Vivir con menos estrés y ansiedad',
              'Crear rutinas que duren más de 3 días',
              'Sentirme orgulloso/a al final del día',
            ]}
            selected={mainGoal}
            setSelected={setMainGoal}
            onNext={animateToNext}
          />
        );
      case 7:
        return (
          <SingleSelectScreen
            title="¿Cuándo se enciende tu chispa?"
            subtitle="Programaremos tus tareas más difíciles en este horario."
            options={['🌅 Mañanero/a total', '☀️ A media mañana', '🌇 Al caer la tarde', '🌙 Criatura de la noche']}
            selected={productivityTime}
            setSelected={setProductivityTime}
            onNext={animateToNext}
          />
        );
      case 8:
        return (
          <AgreementScreen
            statement="A menudo postergo tareas importantes hasta que la presión es insoportable."
            selected={scaleProcrastination}
            setSelected={setScaleProcrastination}
            onNext={animateToNext}
          />
        );
      case 9:
        return (
          <AgreementScreen
            statement="Siento que mi memoria es como un colador para los detalles pequeños."
            selected={scaleMemory}
            setSelected={setScaleMemory}
            onNext={animateToNext}
          />
        );
      case 10:
        return (
          <AgreementScreen
            statement="Me distraigo incluso con mis propios pensamientos."
            selected={scaleFocus}
            setSelected={setScaleFocus}
            onNext={animateToNext}
          />
        );
      case 11:
        return (
          <AgreementScreen
            statement="A veces actúo o compro cosas sin pensar en las consecuencias."
            selected={scaleImpulsivity}
            setSelected={setScaleImpulsivity}
            onNext={animateToNext}
          />
        );
      case 12:
        return (
          <SingleSelectScreen
            title="¿Por qué crees que fallaron otros métodos?"
            subtitle="Entender el pasado nos ayuda a diseñar tu futuro."
            options={[
              'Eran demasiado rígidos/aburridos',
              'Me olvidé de usarlos',
              'Eran demasiado complejos',
              'No sentí una conexión real',
            ]}
            selected={pastBarriers}
            setSelected={setPastBarriers}
            onNext={animateToNext}
          />
        );
      case 13:
        return (
          <InfoScreen
            title={`No es falta de voluntad, ${name || 'amigo/a'}.`}
            content="El cerebro con TDAH procesa la dopamina y el tiempo de forma distinta. No eres tú, es tu cableado. Y eso no es un defecto: es una particularidad que podemos usar a tu favor."
            buttonText="Entiendo, cuéntame más"
            onNext={animateToNext}
            showMascot
          />
        );
      case 14:
        return (
          <InfoScreen
            title="Hackeando la dopamina"
            content='Brainy usa "micro-recompensas" y recordatorios visuales para que organizar tu vida sea tan estimulante como un videojuego. Cada tarea completada libera una dosis de satisfacción diseñada para tu cerebro.'
            buttonText="Me gusta cómo suena"
            onNext={animateToNext}
            showMascot
          />
        );
      case 15:
        return (
          <SingleSelectScreen
            title="Cierra los ojos un segundo..."
            subtitle="¿Cómo se vería tu vida en 3 meses si lograras ser un 20% más organizado?"
            options={[
              'Tendría más tiempo para mis hobbies',
              'Dormiría sin ansiedad por lo pendiente',
              'Mi jefe/familia estarían impresionados',
              'Me sentiría en paz conmigo mismo/a',
            ]}
            selected={visualization}
            setSelected={setVisualization}
            onNext={animateToNext}
          />
        );
      case 16:
        return (
          <InfoScreen
            title="La magia de los 21 días"
            content="No buscamos la perfección, buscamos la repetición. Brainy te ayudará a no romper la cadena. Cada día que mantengas tu racha, tu cerebro creará conexiones más fuertes."
            buttonText="Estoy listo/a para el cambio"
            onNext={animateToNext}
            showMascot
          />
        );
      case 17:
        return <ProcessingScreen name={name} onDone={animateToNext} />;
      case 18:
        return (
          <ResultsScreen
            name={name}
            painPoints={painPoints}
            scales={{
              procrastination: scaleProcrastination,
              memory: scaleMemory,
              focus: scaleFocus,
              impulsivity: scaleImpulsivity,
            }}
            onNext={animateToNext}
          />
        );
      case 19:
        return <CommitmentScreen onNext={animateToNext} />;
      case 20:
        return <TestimonialScreen onNext={animateToNext} />;
      case 21:
        return <NotificationsScreen onNext={animateToNext} />;
      case 22:
        return <PremiumBenefitsScreen onNext={animateToNext} />;
      case 23:
        return (
          <PaywallScreen
            onAccept={finishOnboarding}
            onSkip={finishOnboarding}
          />
        );
      default:
        return null;
    }
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        {currentSlide > 0 && currentSlide !== 17 ? (
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={16}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Slide Content */}
      <Animated.View style={[styles.slideWrapper, { transform: [{ translateX: slideAnim }] }]}>
        {renderSlide()}
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: `${colors.textPrimary}10`,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: `${colors.textPrimary}15`,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  slideWrapper: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentInner: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  bottomButtonArea: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 32,
    paddingTop: 16,
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}0D`,
  },
  optionsContainer: {
    gap: 10,
    marginTop: 8,
  },
  optionPill: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: `${colors.textPrimary}0D`,
  },
  optionPillActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  optionPillText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  optionPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 0.3,
  },
  // Welcome / Mascot
  welcomeDialogueArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotImage: {
    width: 160,
    height: 160,
  },
  bubbleContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 18,
    maxWidth: SCREEN_WIDTH * 0.78,
    minHeight: 80,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.textPrimary}15`,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.surface,
    marginTop: -1,
  },
  bubbleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
  },
  // Agreement Scale
  statementCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}10`,
  },
  statementText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  scaleItem: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scaleCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${colors.textPrimary}15`,
  },
  scaleCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  scaleNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scaleNumberActive: {
    color: colors.background,
  },
  scaleLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  scaleLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  // Info Screens
  infoMascot: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 20,
  },
  infoContent: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  // Results
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  chartBar: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  chartValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chartBarTrack: {
    width: 36,
    height: 120,
    borderRadius: 18,
    backgroundColor: `${colors.textPrimary}10`,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 18,
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}10`,
  },
  resultCardText: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  // Commitment
  commitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}0D`,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: `${colors.textPrimary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  commitText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  // Testimonial
  testimonialCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}10`,
  },
  testimonialQuote: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  testimonialAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  // Benefits
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}0D`,
  },
  benefitText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  // Paywall
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 16,
    position: 'relative',
    marginTop: 8,
  },
  timelineLine: {
    position: 'absolute',
    top: 10,
    left: 40,
    right: 40,
    height: 3,
    backgroundColor: `${colors.textPrimary}20`,
    borderRadius: 2,
  },
  timelineNode: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: colors.background,
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});