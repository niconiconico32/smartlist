import { colors } from '@/constants/theme';
import { AppText as Text } from '@/src/components/AppText';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { slideStyles } from '../../styles/shared';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64; // padding 32 * 2
const CHART_HEIGHT = 240;

const formatDate = (date: Date) => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

export default function SuccessChartSlide({ onNext }: any) {
  const progress = useSharedValue(0);

  const now = new Date();
  const day10 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const day21 = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

  const labels = ['Hoy', formatDate(day10), formatDate(day21)];

  const p1 = { x: 20, y: CHART_HEIGHT - 60 };
  const p2 = { x: CHART_WIDTH * 0.7, y: CHART_HEIGHT * 0.65 };
  const p3 = { x: CHART_WIDTH - 20, y: 40 };

  const pathData = `M ${p1.x} ${p1.y} C ${p1.x + 40} ${p1.y}, ${p2.x - 40} ${p2.y}, ${p2.x} ${p2.y} S ${p3.x - 40} ${p3.y}, ${p3.x} ${p3.y}`;
  const pathLength = 400; // approximate length

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 2500,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength - pathLength * progress.value,
  }));

  const opacity1 = useAnimatedProps(() => ({ opacity: progress.value > 0.05 ? withTiming(1) : 0 }));
  const opacity2 = useAnimatedProps(() => ({ opacity: progress.value > 0.45 ? withTiming(1) : 0 }));
  const opacity3 = useAnimatedProps(() => ({ opacity: progress.value > 0.95 ? withTiming(1) : 0 }));

  return (
    <View style={s.container}>
      <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={[slideStyles.slideTitle, { color: '#FFFFFF', marginBottom: 8 }]}>
        paz mental en 21 días
      </Animated.Text>

      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={[slideStyles.slideSubtitle, { color: 'rgba(255,255,255,0.85)', marginBottom: 40, textTransform: 'none' }]}>
        mira lo que podemos lograr juntos en solo 21 días.
      </Animated.Text>

      <Animated.View entering={FadeIn.delay(300).duration(500)} style={s.chartCard}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#ec3030ff" stopOpacity="1" />
              <Stop offset="0.5" stopColor="#F9E2AF" stopOpacity="1" />
              <Stop offset="1" stopColor={colors.primary} stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>

          {/* Vertical dashed lines for milestones */}
          <Line x1={p2.x} y1={p2.y} x2={p2.x} y2={CHART_HEIGHT - 30} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="4 4" />
          <Line x1={p3.x} y1={p3.y} x2={p3.x} y2={CHART_HEIGHT - 30} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Base Axis */}
          <Line x1={10} y1={CHART_HEIGHT - 30} x2={CHART_WIDTH} y2={CHART_HEIGHT - 30} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

          {/* Curve */}
          <AnimatedPath
            d={pathData}
            fill="none"
            stroke="url(#grad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={pathLength}
            animatedProps={animatedProps}
          />

          {/* Nodes */}
          <AnimatedCircle cx={p1.x} cy={p1.y} r="8" fill={colors.surface} stroke="#FAB387" strokeWidth="4" animatedProps={opacity1} />
          <AnimatedCircle cx={p2.x} cy={p2.y} r="8" fill={colors.surface} stroke="#F9E2AF" strokeWidth="4" animatedProps={opacity2} />
          <AnimatedCircle cx={p3.x} cy={p3.y} r="8" fill={colors.surface} stroke={colors.primary} strokeWidth="4" animatedProps={opacity3} />
        </Svg>

        <View style={s.labelsContainer}>
          <Text style={[s.label, { position: 'absolute', left: p1.x - 15, width: 50, textAlign: 'center' }]}>{labels[0]}</Text>
          <Text style={[s.label, { position: 'absolute', left: p2.x - 40, width: 80, textAlign: 'center' }]}>{labels[1]}</Text>
          <Text style={[s.label, { position: 'absolute', left: p3.x - 35, width: 70, textAlign: 'center' }]}>{labels[2]}</Text>
        </View>

        {/* Tooltips */}
        <Animated.View entering={FadeInDown.delay(1200)} style={[s.tooltip, { left: p2.x - 45, top: p2.y - 40, backgroundColor: '#F9E2AF' }]}>
          <Text style={s.tooltipTextDark}>romper patrones malos</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(2200)} style={[s.tooltip, { left: p3.x - 55, top: p3.y - 45, backgroundColor: '#A6E3A1' }]}>
          <Text style={s.tooltipTextDark}>tú mandas</Text>
        </Animated.View>
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(2400).duration(500)} style={s.loremText}>
        basado en tu análisis, creemos que para el próximo {labels[2]} serás capaz de construir hábitos saludables y constantes.
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(2600).duration(500)} style={s.buttonContainer}>
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
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    backgroundColor: colors.surface,
  },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  labelsContainer: {
    height: 20,
    width: CHART_WIDTH,
    marginTop: -20,
    position: 'relative',
    paddingBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  tooltip: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tooltipTextDark: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  loremText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '800',
  },
});
