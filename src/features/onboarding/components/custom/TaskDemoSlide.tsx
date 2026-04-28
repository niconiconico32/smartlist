import { PRIMARY_GRADIENT_COLORS, primaryButtonGradient, primaryButtonStyles, primaryButtonText } from '@/constants/buttons';
import { colors } from '@/constants/theme';
import { OnboardingSubtaskList } from './OnboardingSubtaskList';
import type { Subtask } from './OnboardingSubtaskList';
import { supabase } from '@/src/lib/supabase';
import { getLocalDateKey } from '@/src/utils/dateHelpers';
import { fetchActivitiesFromCloud, syncActivitiesToCloud } from '@/src/lib/syncService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TASK_SUGGESTIONS } from '../../constants';
import { layoutStyles, slideStyles } from '../../styles/shared';
import type { OnboardingAnswers } from '../../types';

const ACTIVITIES_STORAGE_KEY = '@smartlist_activities';

// Fallback random icon color (same palette as index.tsx)
function getRandomIconColor() {
  const palette = [
    '#CBA6F7', '#FAB387', '#F38BA8', '#F9E2AF',
    '#A6E3A1', '#89B4FA', '#F5C2E7',
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}

interface Props {
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  onNext: () => void;
}

const TaskDemoSlide: React.FC<Props> = ({ answers, onAnswer, onNext }) => {
  const taskText = answers.taskText;

  // Generation & subtask state
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSubtaskList, setShowSubtaskList] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedEmoji, setGeneratedEmoji] = useState('✨');

  const handleGenerate = async () => {
    const text = taskText?.trim();
    if (!text) {
      Alert.alert('Error', 'Escribe una tarea primero');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('divide-task', {
        body: { task: text },
      });

      if (error) {
        console.error('Error calling divide-task:', error);
        throw new Error(error.message);
      }

      if (!data || data.error) {
        throw new Error(data?.error || 'Error desconocido');
      }

      if (!data.tasks || !Array.isArray(data.tasks) || data.tasks.length === 0) {
        throw new Error('No se pudieron generar subtareas');
      }

      // Title
      let finalTitle = data.title || text;
      if (finalTitle.length > 50) {
        finalTitle = finalTitle.substring(0, 47) + '...';
      }

      setGeneratedTitle(finalTitle);
      setGeneratedEmoji(data.emoji || '✨');

      // Transform subtasks
      const transformedSubtasks: Subtask[] = data.tasks.map(
        (task: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          title: task.title,
          duration: task.duration,
          isCompleted: false,
        })
      );

      setSubtasks(transformedSubtasks);
      setShowSubtaskList(true);
    } catch (error) {
      console.error('Error generando subtareas:', error);
      Alert.alert('Error', 'No se pudieron generar las subtareas. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToHome = async (
    finalSubtasks: Subtask[],
    difficulty: 'easy' | 'moderate' | 'hard'
  ) => {
    // Create the Activity object (same shape as index.tsx)
    const newActivity = {
      id: Date.now().toString(),
      title: generatedTitle,
      emoji: generatedEmoji,
      metric: `${finalSubtasks.reduce((sum, t) => sum + t.duration, 0)} min`,
      color: '#A6E3A1',
      iconColor: getRandomIconColor(),
      action: 'play' as const,
      completed: false,
      subtasks: finalSubtasks,
      difficulty: difficulty,
      recurrence: { type: 'once' as const },
      completedDates: [] as string[],
      scheduledDate: getLocalDateKey(new Date()),
    };

    try {
      // Read existing activities from Cloud (or local fallback)
      const existing = await fetchActivitiesFromCloud();

      // Prepend the new activity
      const updated = [newActivity, ...existing];
      await syncActivitiesToCloud(updated);

      // Close modal and continue onboarding
      setShowSubtaskList(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onNext();
    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', 'No se pudo guardar la tarea. Intenta de nuevo.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={layoutStyles.slideScroll}
        contentContainerStyle={layoutStyles.slideScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={[slideStyles.slideSubtitle, { color: colors.surface }]}>
          hagamos una prueba
        </Animated.Text>

        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={[slideStyles.slideTitle, { color: colors.background }]}>
          ¿con qué tarea necesitas ayuda?
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.inputContainer}>
          <TextInput
            style={[
              { 
                textAlign: 'left', 
                borderRadius: 16, 
                backgroundColor: '#FFFFFF', // Clean white on the light gray background
                borderWidth: 0,
                paddingHorizontal: 20,
                paddingVertical: 20,
                fontSize: 18, // Larger font
                color: colors.background, // Dark text
                minHeight: 200, // Enlarge the input box
                textAlignVertical: 'top'
              }, 
              isGenerating && { opacity: 0.5 }
            ]}
            placeholder="Escribe tu tarea aquí..."
            placeholderTextColor={`${colors.surface}80`}
            value={taskText}
            onChangeText={(text) => onAnswer('taskText', text)}
            multiline
            numberOfLines={6}
            editable={!isGenerating}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.orDivider}>
          <View style={[styles.dividerLine, { backgroundColor: `${colors.background}1A` }]} />
          <Text style={[styles.dividerText, { color: colors.surface }]}>o elige una opción rápida</Text>
          <View style={[styles.dividerLine, { backgroundColor: `${colors.background}1A` }]} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={[styles.suggestionsGrid, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 0 }]}>
          {TASK_SUGGESTIONS.map((task, index) => {
            const isSelected = taskText === task.text;
            return (
              <Animated.View key={task.id} entering={FadeInDown.delay(600 + index * 50).duration(400)}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onAnswer('taskText', task.text);
                  }}
                  disabled={isGenerating}
                  style={({ pressed }) => [
                    slideStyles.pill,
                    {
                      minHeight: 44, // Smaller height
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isSelected ? colors.surface : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: isSelected ? colors.surface : `${colors.background}1A`,
                      borderRadius: 22,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      flexDirection: 'row',
                    },
                    pressed && { opacity: 0.7 },
                    isGenerating && { opacity: 0.5 },
                  ]}
                >
                  <Text style={[slideStyles.pillLabel, { fontSize: 14, fontWeight: '500', color: isSelected ? '#FFFFFF' : colors.background }]}>
                    {task.label}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Bottom "Generar" button */}
      <Animated.View entering={FadeInDown.delay(700).duration(500)} style={styles.bottomButtonContainer}>
        <Pressable
          onPress={handleGenerate}
          disabled={isGenerating || !taskText?.trim()}
          style={[primaryButtonStyles, (!taskText?.trim() && !isGenerating) && { opacity: 0.5 }]}
        >
          <LinearGradient
            colors={PRIMARY_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={primaryButtonGradient}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={colors.background} style={{ marginRight: 8 }} />
            ) : (
              <Sparkles size={18} color={colors.background} strokeWidth={2.5} style={{ marginRight: 8 }} />
            )}
            <Text style={primaryButtonText}>
              {isGenerating ? 'Generando...' : 'Generar'}
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Onboarding SubtaskList Modal */}
      <Modal
        visible={showSubtaskList}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowSubtaskList(false);
          setSubtasks([]);
          setGeneratedTitle('');
          setGeneratedEmoji('✨');
        }}
      >
        <OnboardingSubtaskList
          taskTitle={generatedTitle}
          taskEmoji={generatedEmoji}
          initialSubtasks={subtasks}
          onAddToHome={handleAddToHome}
        />
      </Modal>
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
  },
  input: {
    backgroundColor: `${colors.textRoutineCard}33`,
    borderRadius: 20,
    padding: 18,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 3,
    borderColor: colors.primary,
    minHeight: 180,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  bottomButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
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
