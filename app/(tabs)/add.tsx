import { colors } from '@/constants/theme';
import { Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface Subtask {
  title: string;
  duration: number;
}

export default function TestingScreen() {
  const [taskInput, setTaskInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [generatedTaskTitle, setGeneratedTaskTitle] = useState('');

  const generateSubtasks = async () => {
    if (!taskInput.trim()) {
      Alert.alert('Error', 'Escribe una tarea primero');
      return;
    }

    setIsGenerating(true);
    setSubtasks([]);
    setGeneratedTaskTitle('');

    try {
      const response = await fetch(
        'https://wdqwgqfisiteswbbdurg.supabase.co/functions/v1/divide-task',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcXdncWZpc2l0ZXN3YmJkdXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NDU5NzAsImV4cCI6MjA0OTUyMTk3MH0.AZtUpg7Jc3Sb1nkQxUZ3fQ4UXXXzLAHN2IY_tZB6zKM',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcXdncWZpc2l0ZXN3YmJkdXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5NDU5NzAsImV4cCI6MjA0OTUyMTk3MH0.AZtUpg7Jc3Sb1nkQxUZ3fQ4UXXXzLAHN2IY_tZB6zKM',
          },
          body: JSON.stringify({ task: taskInput.trim() }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.tasks || !Array.isArray(data.tasks) || data.tasks.length === 0) {
        throw new Error('No se pudieron generar subtareas');
      }

      setGeneratedTaskTitle(data.title || taskInput);
      setSubtasks(data.tasks);
      setTaskInput('');

      Alert.alert(
        '✨ Tarea dividida',
        `${data.tasks.length} subtareas generadas para:\n"${data.title}"`
      );
    } catch (error) {
      console.error('Error generando subtareas:', error);
      Alert.alert('Error', 'No se pudieron generar las subtareas. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearSubtasks = () => {
    setSubtasks([]);
    setGeneratedTaskTitle('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Sparkles size={32} color={colors.primary} />
          <Text style={styles.title}>Testing IA</Text>
          <Text style={styles.subtitle}>
            Escribe una tarea y la IA la dividirá en pasos
          </Text>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.taskInput}
              placeholder="Ej: Limpiar el baño, Preparar presentación..."
              placeholderTextColor={colors.textTertiary}
              value={taskInput}
              onChangeText={setTaskInput}
              multiline
              numberOfLines={2}
              editable={!isGenerating}
            />
          </View>

          <Pressable
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={generateSubtasks}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator size="small" color="#1C2120" />
                <Text style={styles.generateButtonText}>Generando...</Text>
              </>
            ) : (
              <>
                <Sparkles size={20} color="#1C2120" />
                <Text style={styles.generateButtonText}>Generar Subtareas</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Results Section */}
        {subtasks.length > 0 && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>{generatedTaskTitle}</Text>
              <Pressable onPress={clearSubtasks}>
                <Text style={styles.clearButton}>Limpiar</Text>
              </Pressable>
            </View>

            <View style={styles.subtasksList}>
              {subtasks.map((subtask, index) => (
                <View key={index} style={styles.subtaskCard}>
                  <View style={styles.subtaskNumber}>
                    <Text style={styles.subtaskNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.subtaskContent}>
                    <Text style={styles.subtaskTitle}>{subtask.title}</Text>
                    <Text style={styles.subtaskDuration}>{subtask.duration} min</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.totalDuration}>
              <Text style={styles.totalDurationText}>
                Duración total:{' '}
                {subtasks.reduce((sum, task) => sum + task.duration, 0)} minutos
              </Text>
            </View>
          </View>
        )}

        {/* Empty State */}
        {subtasks.length === 0 && !isGenerating && (
          <View style={styles.emptyState}>
            <Sparkles size={48} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyStateText}>
              Escribe una tarea arriba y presiona "Generar Subtareas" para comenzar
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F9F8',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C2120',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(168, 230, 207, 0.3)',
    padding: 16,
    marginBottom: 16,
  },
  taskInput: {
    fontSize: 16,
    color: '#1C2120',
    fontWeight: '500',
    minHeight: 60,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C2120',
  },
  resultsSection: {
    marginBottom: 24,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultsTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#1C2120',
  },
  clearButton: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF8B94',
  },
  subtasksList: {
    gap: 12,
  },
  subtaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 230, 207, 0.2)',
  },
  subtaskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C2120',
  },
  subtaskContent: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C2120',
    marginBottom: 4,
  },
  subtaskDuration: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  totalDuration: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(168, 230, 207, 0.15)',
    borderRadius: 16,
    alignItems: 'center',
  },
  totalDurationText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C2120',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    opacity: 0.4,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
});
