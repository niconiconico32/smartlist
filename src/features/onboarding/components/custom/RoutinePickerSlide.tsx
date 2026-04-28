import { colors } from '@/constants/theme';
import { AppText as Text } from '@/src/components/AppText';
import { useAuth } from '@/src/contexts/AuthContext';
import { createRoutine } from '@/src/lib/routineService';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { slideStyles } from '../../styles/shared';

// ============================================
// PRESET ROUTINES
// ============================================
interface PresetRoutine {
  id: string;
  emoji: string;
  label: string;
  icon: string;
  tasks: string[];
}

const PRESET_ROUTINES: PresetRoutine[] = [
  {
    id: 'walk-dog',
    emoji: '🐕',
    label: 'Pasear a mi perro',
    icon: 'Heart',
    tasks: ['Ponerle la correa', 'Salir a caminar 20 min', 'Darle agua al volver'],
  },
  {
    id: 'drink-water',
    emoji: '💧',
    label: 'Beber agua',
    icon: 'Activity',
    tasks: ['Vaso al despertar', 'Vaso a media mañana', 'Vaso en el almuerzo', 'Vaso en la tarde'],
  },
  {
    id: 'feed-cat',
    emoji: '🐱',
    label: 'Rellenar el plato de mi gato',
    icon: 'Home',
    tasks: ['Revisar comida seca', 'Rellenar agua', 'Limpiar el plato si está sucio'],
  },
  {
    id: 'morning-routine',
    emoji: '☀️',
    label: 'Rutina de la mañana',
    icon: 'Sun',
    tasks: ['Hacer la cama', 'Ducharme', 'Desayunar algo'],
  },
  {
    id: 'wind-down',
    emoji: '🌙',
    label: 'Desconexión nocturna',
    icon: 'Moon',
    tasks: ['Dejar el celular en otra habitación', 'Leer 10 minutos', 'Revisar plan del día siguiente'],
  },
];

const ALL_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ============================================
// COMPONENT
// ============================================
interface Props {
  onNext: () => void;
}

export default function RoutinePickerSlide({ onNext }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const toggleRoutine = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    const userId = user?.id;
    if (!userId || saving) return;

    const selectedPresets = PRESET_ROUTINES.filter(r => selected.has(r.id));
    if (selectedPresets.length === 0) {
      onNext();
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        selectedPresets.map(preset =>
          createRoutine(userId, {
            name: `${preset.emoji} ${preset.label}`,
            days: ALL_DAYS,
            tasks: preset.tasks.map((title, index) => ({ title, position: index })),
            icon: preset.icon,
            reminderEnabled: false,
          })
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('Error creating routines:', e);
    } finally {
      setSaving(false);
      onNext();
    }
  };

  const handleSkip = () => {
    setSkipped(true);
    onNext();
  };

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text
          entering={FadeInDown.delay(100).duration(500)}
          style={[slideStyles.slideTitle, { marginBottom: 8, color: colors.background }]}
        >
          elige tus primeras rutinas diarias
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          style={[slideStyles.slideSubtitle, { marginBottom: 36, textTransform: 'none' }]}
        >
          acá tenemos unas que pensamos que te servirán, pero puedes crear las tuyas cuando quieras.
        </Animated.Text>

        {/* Pills grid */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={s.pillsContainer}>
          {PRESET_ROUTINES.map(routine => {
            const isSelected = selected.has(routine.id);
            return (
              <Pressable
                key={routine.id}
                onPress={() => toggleRoutine(routine.id)}
                style={[s.pill, isSelected && s.pillSelected]}
              >
                {isSelected && (
                  <View style={s.checkCircle}>
                    <Check size={11} color="#fff" strokeWidth={3} />
                  </View>
                )}
                <Text style={[s.pillEmoji]}>{routine.emoji}</Text>
                <Text style={[s.pillLabel, isSelected && s.pillLabelSelected]}>
                  {routine.label}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <Animated.View entering={FadeInDown.delay(600).duration(500)} style={s.footer}>
        <Pressable
          onPress={handleContinue}
          style={[s.button, saving && s.buttonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={s.buttonText}>
              {selected.size > 0 ? `Añadir ${selected.size} rutina${selected.size > 1 ? 's' : ''}` : 'Continuar'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={handleSkip} style={s.skipButton}>
          <Text style={s.skipText}>luego agregaré la mía...</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  pillSelected: {
    borderColor: colors.surface,
    backgroundColor: `${colors.surface}10`,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillEmoji: {
    fontSize: 18,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  pillLabelSelected: {
    color: colors.surface,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    backgroundColor: colors.surface,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: colors.surface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '500',
  },
});
