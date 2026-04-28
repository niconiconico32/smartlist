import { colors } from '@/constants/theme';
import { AppText as Text } from '@/src/components/AppText';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { slideStyles } from '../../styles/shared';
import type { OnboardingAnswers } from '../../types';

interface Props {
  answers: OnboardingAnswers;
  onNext: () => void;
}

const ResultsSlide: React.FC<Props> = ({ answers, onNext }) => {
  const userName = answers.userName || 'amigo/a';

  // 1. Map Main Goal to an empathetic phrase
  const mainGoalId = answers.mainGoal?.[0];
  let goalText = '🚀 Lograr consistencia sin pelear contra tu propio cerebro';
  if (mainGoalId === 'finish_projects') goalText = '🚀 Terminar lo que empiezas, sin agobiarte a la mitad';
  else if (mainGoalId === 'less_stress') goalText = '🧘 Recuperar la tranquilidad y el control de tu tiempo';
  else if (mainGoalId === 'lasting_routines') goalText = '📅 Crear hábitos reales que duren más de un par de días';
  else if (mainGoalId === 'feel_proud') goalText = '✨ Ir a la cama sintiendo que hoy sí lograste avanzar';

  // 2. Map Life Area to current state
  const lifeAreaId = answers.lifeArea;
  let areaText = '🎢 Sientes que tu energía y motivación son impredecibles';
  if (lifeAreaId === 'home') areaText = '🏠 El caos en casa suele consumir tu energía rápidamente';
  else if (lifeAreaId === 'work') areaText = '💼 El trabajo o estudios se sienten como una montaña rusa';
  else if (lifeAreaId === 'health') areaText = '🧘 Te cuesta priorizar tu propio bienestar de forma constante';

  // 3. Map Symptoms to the obstacles
  const symptoms = answers.adhdSymptoms || [];
  const defaultObstacles = [
    'Distracciones constantes y "scroll" infinito',
    'Falta de dopamina para tareas aburridas',
    'Dificultad para ordenar las prioridades'
  ];

  const symptomMap: Record<string, string> = {
    paralysis: 'La temida "parálisis por análisis" al empezar',
    time: 'Ceguera del tiempo (las horas desaparecen)',
    overwhelm: 'Sobrecarga mental cuando hay demasiados pasos',
    forget: 'Olvidar cosas importantes al instante',
    racing_mind: 'Una mente que corre a 1000 km/h sin parar'
  };

  const selectedTexts = symptoms.slice(0, 3).map(id => symptomMap[id]).filter(Boolean);

  // Fill array up to exactly 3 items using defaults if needed
  const symptomsText = [...selectedTexts];
  let defaultIdx = 0;
  while (symptomsText.length < 3 && defaultIdx < defaultObstacles.length) {
    if (!symptomsText.includes(defaultObstacles[defaultIdx])) {
      symptomsText.push(defaultObstacles[defaultIdx]);
    }
    defaultIdx++;
  }

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={[slideStyles.slideTitle, { color: colors.background, marginBottom: 8 }]}>
          gracias, <Text style={{ color: colors.surface }}>{userName}</Text>.
        </Animated.Text>

        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={[slideStyles.slideSubtitle, { color: colors.surface, marginBottom: 40, textTransform: 'none' }]}>
          basado en lo que compartiste, veamos juntos tu camino hacia adelante.
        </Animated.Text>

        <View style={s.cardsContainer}>
          {/* CARD 1 */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={s.card}>
            <View style={s.pill}>
              <Text style={s.pillText}>a dónde quieres llegar</Text>
            </View>
            <Text style={s.cardTextMain}>{goalText}</Text>
          </Animated.View>

          {/* CARD 2 */}
          <Animated.View entering={FadeInDown.delay(450).duration(500)} style={s.card}>
            <View style={s.pill}>
              <Text style={s.pillText}>dónde estás ahora</Text>
            </View>
            <Text style={s.cardTextMain}>{areaText}</Text>
          </Animated.View>

          {/* CARD 3 */}
          <Animated.View entering={FadeInDown.delay(600).duration(500)} style={s.card}>
            <View style={s.pill}>
              <Text style={s.pillText}>lo que te detiene</Text>
            </View>
            <View style={s.listContainer}>
              {symptomsText.map((txt, i) => (
                <View key={i} style={[s.listItem, i === symptomsText.length - 1 && { borderBottomWidth: 0 }]} >
                  <View style={s.bullet} />
                  <Text style={s.cardTextList}>{txt}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Button to continue */}
      <Animated.View entering={FadeInDown.delay(800).duration(500)} style={s.footer}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }}
          style={s.button}
        >
          <Text style={s.buttonText}>Continuar</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default ResultsSlide;

const s = StyleSheet.create({
  container: {
    flex: 1,
    // Background color is handled by the parent slide wrapper
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.background,
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 40,
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  pill: {
    backgroundColor: `${colors.surface}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  pillText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  cardTextMain: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background,
    lineHeight: 24,
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.background}10`,
    paddingBottom: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
  cardTextList: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
