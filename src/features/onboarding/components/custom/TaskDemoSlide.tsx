import { PRIMARY_GRADIENT_COLORS } from '@/constants/buttons';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TASK_SUGGESTIONS } from '../../constants';
import type { OnboardingAnswers } from '../../types';

interface Props {
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
}

const TaskDemoSlide: React.FC<Props> = ({ answers, onAnswer }) => {
  const taskText = answers.taskText;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.slideScroll}
        contentContainerStyle={styles.slideScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.mascotRow}>
          <Image
            source={require('@/assets/images/logomain.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>¡Deja mostrarte de qué estoy hecho!</Text>
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(250).duration(500)} style={styles.subtitle}>
          ¿Con qué tarea necesitas ayuda?
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe tu tarea aquí..."
            placeholderTextColor={`${colors.textSecondary}CC`}
            value={taskText}
            onChangeText={(text) => onAnswer('taskText', text)}
            multiline
            numberOfLines={4}
          />

          <Animated.View
            entering={FadeInDown.delay(600).duration(500).springify()}
            style={styles.generateButtonContainer}
          >
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
              style={({ pressed }) => [
                styles.generateButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <LinearGradient
                colors={PRIMARY_GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateButtonGradient}
              >
                <Sparkles size={18} color={colors.background} strokeWidth={2.5} />
                <Text style={styles.generateButtonText}>Generar</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(550).duration(500)} style={styles.orDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o elige una opción</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.suggestionsGrid}>
          {TASK_SUGGESTIONS.map((task, index) => (
            <Animated.View key={task.id} entering={FadeInDown.delay(700 + index * 50).duration(400)}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onAnswer('taskText', task.text);
                }}
                style={({ pressed }) => [
                  styles.suggestionPill,
                  taskText === task.text && styles.suggestionPillSelected,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.suggestionLabel}>{task.label}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  slideScroll: {
    flex: 1,
  },
  slideScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 60,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  mascotImage: {
    width: 80,
    height: 80,
    marginTop: 4,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}1A`,
    padding: 16,
    position: 'relative',
  },
  speechText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
    position: 'relative',
  },
  input: {
    backgroundColor: `${colors.textRoutineCard}33`,
    borderRadius: 20,
    padding: 18,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 3,
    borderColor: colors.primary,
    minHeight: 220,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  generateButtonContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 10,
  },
  generateButton: {
    borderRadius: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 6,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.3,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: `${colors.textPrimary}1A`,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: `${colors.textPrimary}0D`,
    gap: 8,
  },
  suggestionPillSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}0D`,
  },
  suggestionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});

export default TaskDemoSlide;
