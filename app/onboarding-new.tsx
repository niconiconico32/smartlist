import { colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
    AlertTriangle,
    ArrowRight,
    Brain,
    Check,
    CloudFog,
    CreditCard,
    Crown,
    Flame,
    Plus,
    Shield,
    Sparkles,
    Unlock,
    User,
    Zap,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated,
{
    Easing,
    FadeInDown,
    FadeInUp,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Chart dimensions
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 200;

// Satisfaction Chart Component
const SatisfactionChart = () => {
  const progress = useSharedValue(0);
  const [showTooltip1, setShowTooltip1] = useState(false);
  const [showTooltip2, setShowTooltip2] = useState(false);
  const [showTooltip3, setShowTooltip3] = useState(false);

  // Path for the curve (Bezier curve going up)
  // Formato: M startX startY Q controlX controlY endX endY T finalX finalY
  // Ajusta los valores para cambiar la curvatura
  const pathD = `M 20 ${CHART_HEIGHT - 30} Q 80 ${CHART_HEIGHT - 50}, 140 ${CHART_HEIGHT - 80} T 330 ${CHART_HEIGHT - 200}`;
  const pathLength = 310; // Approximate path length

  useEffect(() => {
    // Start the animation
    progress.value = withTiming(1, {
      duration: 2000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // Show tooltips sequentially
    const timer1 = setTimeout(() => setShowTooltip1(true), 400);
    const timer2 = setTimeout(() => setShowTooltip2(true), 1200);
    const timer3 = setTimeout(() => setShowTooltip3(true), 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: pathLength * (1 - progress.value),
    };
  });

  return (
    <View style={chartStyles.container}>
      {/* Chart Title */}
      <Text style={chartStyles.title}>TU NIVEL DE SATISFACCIÓN</Text>

      {/* Chart Card */}
      <View style={chartStyles.chartCard}>
        {/* Grid Lines (dashed) */}
        <View style={chartStyles.gridContainer}>
          <View style={chartStyles.gridLine} />
          <View style={chartStyles.gridLine} />
          <View style={chartStyles.gridLine} />
        </View>

        {/* SVG Chart */}
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={chartStyles.svg}>
          <Defs>
            <SvgLinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#F38BA8" />
              <Stop offset="50%" stopColor="#FAB387" />
              <Stop offset="100%" stopColor="#CBA6F7" />
            </SvgLinearGradient>
          </Defs>
          <AnimatedPath
            d={pathD}
            stroke="url(#lineGradient)"
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={pathLength}
            animatedProps={animatedProps}
          />
        </Svg>

        {/* Tooltip 1 - BAJO (Bottom Left) */}
        {showTooltip1 && (
          <Animated.View
            entering={FadeInUp.duration(400)}
            style={[chartStyles.tooltipContainer, { left: 24 + 1 - 4, top: 24 + (CHART_HEIGHT - 30) - 6 }]}
          >
            <View style={[chartStyles.tooltipDot, { backgroundColor: '#F38BA8' }]} />
            <View style={[chartStyles.tooltip, { backgroundColor: '#F38BA8' }]}>
              <Text style={chartStyles.tooltipText}>BAJO</Text>
            </View>
            <Text style={chartStyles.tooltipLabelBelow}>AHORA</Text>
          </Animated.View>
        )}

        {/* Tooltip 2 - Primeros Cambios (Middle) */}
        {showTooltip2 && (
          <Animated.View
            entering={FadeInUp.duration(400)}
            style={[chartStyles.tooltipContainer, { left: 24 + 70 - 4, top: 24 + (CHART_HEIGHT - 80) - 6 }]}
          >
            <View style={[chartStyles.tooltipDot, { backgroundColor: '#FAB387' }]} />
            <View style={[chartStyles.tooltip, { backgroundColor: '#FAB387' }]}>
              <Text style={chartStyles.tooltipText}>Primeros Cambios</Text>
            </View>
          </Animated.View>
        )}

        {/* Tooltip 3 - La vida que quieres (Top Right) */}
        {showTooltip3 && (
          <Animated.View
            entering={FadeInUp.duration(400)}
            style={[chartStyles.tooltipContainer, { left: 24 + 200 - 4, top: 24 + (CHART_HEIGHT - 160) - 6 }]}
          >
            <View style={[chartStyles.tooltipDot, { backgroundColor: '#CBA6F7' }]} />
            <View style={[chartStyles.tooltip, { backgroundColor: '#CBA6F7' }]}>
              <Text style={chartStyles.tooltipText}>La vida que quieres</Text>
            </View>
            <Text style={chartStyles.tooltipLabelBelow}>PRONTO</Text>
          </Animated.View>
        )}

        {/* X Axis Labels */}
        <View style={chartStyles.xAxisLabels}>
          <Text style={chartStyles.xAxisLabel}>Día 1</Text>
          <Text style={chartStyles.xAxisLabel}>Pronto</Text>
        </View>
      </View>
    </View>
  );
};

const chartStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 2,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: SCREEN_WIDTH - 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    minHeight: CHART_HEIGHT + 80,
  },
  gridContainer: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    height: CHART_HEIGHT,
    justifyContent: 'space-evenly',
  },
  gridLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderStyle: 'dashed',
  },
  svg: {
    marginLeft: -4,
  },
  tooltipContainer: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -6 }], // Center the dot (dot is 12px wide)
  },
  tooltipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  tooltipLabelBelow: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
    letterSpacing: 1,
  },
  tooltip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1E2E',
  },
  tooltipDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  xAxisLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});

// ============================================================================
// HABIT DAYS ANIMATION COMPONENT
// ============================================================================

const HABIT_DAYS = [
  { id: 0, label: "L" },
  { id: 1, label: "M" },
  { id: 2, label: "X" },
  { id: 3, label: "J" },
  { id: 4, label: "V" },
  { id: 5, label: "S" },
  { id: 6, label: "D" },
];

// ============================================
// GROWTH POTENTIAL SCREEN COMPONENT
// ============================================
interface GrowthBarProps {
  label: string;
  value: number;
  maxValue: number;
  isPotential?: boolean;
  delay: number;
}

const GrowthBar: React.FC<GrowthBarProps> = ({ label, value, maxValue, isPotential = false, delay }) => {
  const barHeight = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const targetHeight = (value / maxValue) * 160;

  useEffect(() => {
    barHeight.value = withDelay(
      delay,
      withSpring(targetHeight, { damping: 12, stiffness: 80 })
    );
    if (isPotential) {
      glowOpacity.value = withDelay(
        delay + 400,
        withRepeat(
          withSequence(
            withTiming(0.8, { duration: 1500 }),
            withTiming(0.3, { duration: 1500 })
          ),
          -1,
          true
        )
      );
    }
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    height: barHeight.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={growthStyles.barWrapper}>
      <View style={growthStyles.barContainer}>
        {isPotential ? (
          <>
            {/* Glow effect behind */}
            <Animated.View style={[growthStyles.barGlow, glowStyle, { height: targetHeight }]} />
            <Animated.View style={[growthStyles.barAnimated, barStyle]}>
              <LinearGradient
                colors={['#FF9A9E', '#FECFEF', '#D4A5FF']}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={growthStyles.barGradient}
              />
            </Animated.View>
          </>
        ) : (
          <Animated.View style={[growthStyles.barAnimated, barStyle]}>
            <View style={growthStyles.barDimmed} />
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const GrowthPotentialScreen = ({ onContinue }: { onContinue: () => void }) => {
  const mascotY = useSharedValue(0);
  const handRotate = useSharedValue(0);

  useEffect(() => {
    // Mascot floating animation
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    // Hand pointing animation
    handRotate.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 800 }),
        withTiming(5, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  return (
    <ScrollView
      style={styles.slideScroll}
      contentContainerStyle={growthStyles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.Text
        entering={FadeInDown.delay(100).duration(500)}
        style={growthStyles.title}
      >
        Tu Potencial Desbloqueable
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.delay(200).duration(500)}
        style={growthStyles.subtitle}
      >
        Mira lo que puedes lograr con el sistema correcto
      </Animated.Text>

      {/* Comparison Bars Chart */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(600)}
        style={growthStyles.chartContainer}
      >
        {/* Columnas de barras con sus valores */}
        <View style={growthStyles.barsRow}>
          {/* Columna Actual */}
          <View style={growthStyles.barColumnActual}>
            <Text style={growthStyles.barValueActual}>35%</Text>
            <GrowthBar label="Actual" value={35} maxValue={100} delay={400} />
            <Text style={growthStyles.barLabel}>Actual</Text>
          </View>

          {/* Columna Con SmartList */}
          <View style={growthStyles.barColumnPotential}>
            <Text style={growthStyles.barValuePotentialTop}>+85%</Text>
            <GrowthBar label="Con SmartList" value={100} maxValue={100} isPotential delay={700} />
            <Text style={[growthStyles.barLabel, growthStyles.barLabelPotential]}>Con SmartList</Text>
          </View>
        </View>

        {/* Mascot pointing up */}
        <Animated.View style={[growthStyles.mascotContainer, mascotStyle]}>
          <Image
            source={require("@/assets/images/logomain.png")}
            style={growthStyles.mascot}
            resizeMode="contain"
          />
          <Text style={growthStyles.mascotSpeech}>¡Tu potencial es enorme!</Text>
        </Animated.View>
      </Animated.View>

      {/* Reframed Stats Cards */}
      <Animated.View
        entering={FadeInDown.delay(500).duration(500)}
        style={growthStyles.statsContainer}
      >
        {/* Card 1: Margen de Mejora */}
        <View style={growthStyles.statCard}>
          <LinearGradient
            colors={['rgba(166, 227, 161, 0.15)', 'rgba(166, 227, 161, 0.05)']}
            style={growthStyles.statCardGradient}
          >
            <View style={growthStyles.statCardHeader}>
              <View style={[growthStyles.statIconBg, { backgroundColor: `${colors.success}25` }]}>
                <Sparkles size={18} color={colors.success} strokeWidth={2} />
              </View>
              <Text style={growthStyles.statCardTitle}>Margen de Mejora</Text>
              <View style={growthStyles.statBadge}>
                <Text style={growthStyles.statBadgeText}>ALTO</Text>
              </View>
            </View>
            <Text style={growthStyles.statCardDescription}>
              Tu mente creativa solo necesita la estructura correcta para brillar.
            </Text>
          </LinearGradient>
        </View>

        {/* Card 2: Productividad Estimada */}
        <View style={growthStyles.statCard}>
          <LinearGradient
            colors={['rgba(243, 139, 168, 0.15)', 'rgba(243, 139, 168, 0.05)']}
            style={growthStyles.statCardGradient}
          >
            <View style={growthStyles.statCardHeader}>
              <View style={[growthStyles.statIconBg, { backgroundColor: `${colors.primary}25` }]}>
                <Zap size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={growthStyles.statCardTitle}>Productividad Estimada</Text>
              <View style={[growthStyles.statBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[growthStyles.statBadgeText, { color: colors.primary }]}>+3x</Text>
              </View>
            </View>
            <Text style={growthStyles.statCardDescription}>
              Usuarios similares triplican su productividad en 4 semanas.
            </Text>
          </LinearGradient>
        </View>

        {/* Card 3: Claridad Mental */}
        <View style={growthStyles.statCard}>
          <LinearGradient
            colors={['rgba(203, 166, 247, 0.15)', 'rgba(203, 166, 247, 0.05)']}
            style={growthStyles.statCardGradient}
          >
            <View style={growthStyles.statCardHeader}>
              <View style={[growthStyles.statIconBg, { backgroundColor: `${colors.accent}25` }]}>
                <Brain size={18} color={colors.accent} strokeWidth={2} />
              </View>
              <Text style={growthStyles.statCardTitle}>Claridad Mental</Text>
              <View style={[growthStyles.statBadge, { backgroundColor: `${colors.accent}20` }]}>
                <Text style={[growthStyles.statBadgeText, { color: colors.accent }]}>ALTA</Text>
              </View>
            </View>
            <Text style={growthStyles.statCardDescription}>
              Reduce el ruido mental y enfócate en lo que realmente importa.
            </Text>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* CTA Button */}
      <Animated.View
        entering={FadeInDown.delay(700).duration(500)}
        style={growthStyles.buttonContainer}
      >
        <Pressable onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onContinue();
        }}>
          <LinearGradient
            colors={['#FF9A9E', '#FECFEF', '#D4A5FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={growthStyles.ctaButton}
          >
            <Text style={growthStyles.ctaButtonText}>Empezar mi Transformación</Text>
            <Sparkles size={20} color={'#ffffff'} strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
};

const growthStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  chartContainer: {
    backgroundColor: 'rgba(49, 50, 68, 0.5)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    position: 'relative',
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 40,
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barColumnActual: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 220,
  },
  barColumnPotential: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 220,
  },
  barWrapper: {
    alignItems: 'center',
    width: 70,
  },
  barContainer: {
    width: 60,
    height: 160,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  barAnimated: {
    width: 60,
    borderRadius: 12,
    overflow: 'hidden',
  },
  barGradient: {
    flex: 1,
    borderRadius: 12,
  },
  barDimmed: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  barGlow: {
    position: 'absolute',
    bottom: 0,
    left: -5,
    width: 70,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 154, 158, 0.3)',
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  barLabelPotential: {
    color: colors.textPrimary,
  },
  barValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 0,
  },
  barValueActual: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: -95,
  },
  barValuePotentialTop: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FF9A9E',
    textAlign: 'center',
    marginBottom: 8,
  },
  barValuePotential: {
    color: '#FF9A9E',
  },
  mascotContainer: {
    position: 'absolute',
    right: 10,
    top: 20,
    alignItems: 'center',
  },
  mascot: {
    width: 70,
    height: 70,
  },
  mascotSpeech: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
    maxWidth: 80,
    justifyContent: 'center',
    textAlign: 'center'
  },
  statsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statBadge: {
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.success,
  },
  statCardDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 18,
    marginLeft: 42,
  },
  buttonContainer: {
    marginTop: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

// ============================================
// SUCCESS TIMELINE SCREEN COMPONENT
// ============================================
interface TimelineNodeProps {
  day: string;
  title: string;
  description: string;
  color: string;
  glowColor: string;
  icon: React.ReactNode;
  delay: number;
  isFirst?: boolean;
  isLast?: boolean;
}

const TimelineNode: React.FC<TimelineNodeProps> = ({
  day,
  title,
  description,
  color,
  glowColor,
  icon,
  delay,
  isFirst = false,
  isLast = false,
}) => {
  const glowOpacity = useSharedValue(0.3);
  const nodeScale = useSharedValue(0);

  useEffect(() => {
    nodeScale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
    if (isFirst) {
      glowOpacity.value = withDelay(
        delay + 300,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1200 }),
            withTiming(0.4, { duration: 1200 })
          ),
          -1,
          true
        )
      );
    }
  }, []);

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nodeScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[timelineStyles.nodeContainer, nodeStyle]}>
      {/* Glow effect for active node */}
      {isFirst && (
        <Animated.View
          style={[
            timelineStyles.nodeGlow,
            { backgroundColor: glowColor },
            glowStyle,
          ]}
        />
      )}

      {/* Node circle */}
      <View style={[timelineStyles.nodeCircle, { borderColor: color }]}>
        <LinearGradient
          colors={[color, glowColor]}
          style={timelineStyles.nodeGradient}
        >
          {icon}
        </LinearGradient>
      </View>

      {/* Content */}
      <View style={timelineStyles.nodeContent}>
        <Text style={[timelineStyles.nodeDay, { color }]}>{day}</Text>
        <Text style={timelineStyles.nodeTitle}>{title}</Text>
        <Text style={timelineStyles.nodeDescription}>{description}</Text>
      </View>
    </Animated.View>
  );
};

const SuccessTimelineScreen = ({ onContinue }: { onContinue: () => void }) => {
  const pathProgress = useSharedValue(0);
  const mascotY = useSharedValue(0);

  useEffect(() => {
    // Animate path drawing
    pathProgress.value = withDelay(
      400,
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.cubic) })
    );

    // Mascot floating
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  return (
    <LinearGradient
      colors={['#1A1A2E', '#16213E']}
      style={timelineStyles.container}
    >
      <ScrollView
        contentContainerStyle={timelineStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.Text
          entering={FadeInDown.delay(100).duration(500)}
          style={timelineStyles.title}
        >
          Tu Cronología de Éxito
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          style={timelineStyles.subtitle}
        >
          No es magia. Es neurociencia aplicada a tus tiempos.
        </Animated.Text>

        {/* Timeline Container */}
        <View style={timelineStyles.timelineContainer}>
          {/* Glowing Path Line */}
          <View style={timelineStyles.pathContainer}>
            <LinearGradient
              colors={['#FFFFFF', '#FAB387', '#CBA6F7']}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={timelineStyles.pathLine}
            />
            {/* Animated glow overlay */}
            <Animated.View style={timelineStyles.pathGlow} />
          </View>

          {/* Mascot at top */}
          <Animated.View style={[timelineStyles.mascotContainer, mascotStyle]}>
            {/* Speech Bubble */}
            <View style={timelineStyles.speechBubble}>
              <Text style={timelineStyles.speechBubbleText}>
                ¡Tu nuevo yo está más cerca de lo que crees!
              </Text>
              <View style={timelineStyles.speechBubbleArrow} />
            </View>
            <Image
              source={require("@/assets/images/logomain.png")}
              style={timelineStyles.mascot}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Nodes - From top to bottom visually, but conceptually bottom to top */}
          <View style={timelineStyles.nodesContainer}>
            {/* Node 3 - Day 30 (Top) */}
            <TimelineNode
              day="Día 30"
              title="Control Total"
              description="La procrastinación ya no es tu jefe. Tú mandas."
              color="#CBA6F7"
              glowColor="#9D4EDD"
              icon={<Crown size={20} color="#FFFFFF" strokeWidth={2} />}
              delay={1800}
              isLast
            />

            {/* Node 2 - Day 7 (Middle) */}
            <TimelineNode
              day="Día 7"
              title="Inercia Positiva"
              description="Tus primeras rachas se sienten naturales, no forzadas."
              color="#FAB387"
              glowColor="#FF8C42"
              icon={<Flame size={20} color="#FFFFFF" strokeWidth={2} />}
              delay={1200}
            />

            {/* Node 1 - Day 1 (Bottom - Active) */}
            <TimelineNode
              day="Día 1 (Hoy)"
              title="Alivio Mental"
              description="Dejas de guardar todo en tu cabeza. Tu ansiedad baja hoy mismo."
              color="#FFFFFF"
              glowColor="#A6E3A1"
              icon={<Sparkles size={20} color="#1A1A2E" strokeWidth={2} />}
              delay={600}
              isFirst
            />
          </View>
        </View>

        {/* CTA Button */}
        <Animated.View
          entering={FadeInDown.delay(2200).duration(500)}
          style={timelineStyles.buttonContainer}
        >
          <Pressable onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onContinue();
          }}>
            <LinearGradient
              colors={['#FF9A9E', '#FECFEF', '#D4A5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={timelineStyles.ctaButton}
            >
              <Text style={timelineStyles.ctaButtonText}>Ver mi Regalo de Bienvenida</Text>
              <Sparkles size={20} color="#ffffff" strokeWidth={2.5} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

const timelineStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
  },
  timelineContainer: {
    position: 'relative',
    minHeight: 450,
    marginBottom: 24,
  },
  pathContainer: {
    position: 'absolute',
    left: 27,
    top: 60,
    bottom: 60,
    width: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  pathLine: {
    flex: 1,
    borderRadius: 3,
  },
  pathGlow: {
    position: 'absolute',
    top: 0,
    left: -4,
    right: -4,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
  },
  mascotContainer: {
    position: 'absolute',
    right: 0,
    bottom: -10,
    display: 'flex',
    flexDirection: 'row'
    
  },
  mascot: {
    width: 60,
    height: 60,
  },
  speechBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: 160,
    marginRight: 8,
    position: 'relative',
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  speechBubbleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A2E',
    textAlign: 'center',
    lineHeight: 16,
  },
  speechBubbleArrow: {
    position: 'absolute',
    right: -8,
    top: '50%',
    marginTop: -6,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(255, 255, 255, 0.95)',
  },
  mascotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBA6F7',
    marginTop: 4,
  },
  nodesContainer: {
    paddingLeft: 0,
    gap: 24,
  },
  nodeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 0,
    position: 'relative',
  },
  nodeGlow: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  nodeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
  },
  nodeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeContent: {
    flex: 1,
    marginLeft: 16,
    paddingTop: 4,
  },
  nodeDay: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  nodeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  nodeDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

// ============================================
// REVERSE TRIAL SCREEN COMPONENT
// ============================================
const ReverseTrialScreen = ({ onAccept }: { onAccept: () => void }) => {
  const cardY = useSharedValue(0);
  const badgePulse = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Card floating animation
    cardY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Badge pulse animation
    badgePulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );

    // Glow animation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000 }),
        withTiming(0.3, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardY.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <LinearGradient
      colors={['#1A1A2E', '#16213E']}
      style={trialStyles.container}
    >
      <ScrollView
        contentContainerStyle={trialStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.Text
          entering={FadeInDown.delay(100).duration(500)}
          style={trialStyles.headerTitle}
        >
          Hagamos un trato honesto.
        </Animated.Text>

        {/* Radial Glow behind card */}
        <Animated.View style={[trialStyles.cardGlow, glowStyle]} />

        {/* Floating Golden Ticket Card */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(600)}
          style={[trialStyles.cardContainer, cardStyle]}
        >
          <LinearGradient
            colors={['rgba(49, 50, 68, 0.9)', 'rgba(30, 32, 48, 0.95)']}
            style={trialStyles.card}
          >
            {/* Mascot with Shield */}
            <View style={trialStyles.iconContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={trialStyles.shieldGlow}
              />
              <View style={trialStyles.shieldIcon}>
                <Shield size={75} color="#FFD700" strokeWidth={1.2} fill="rgba(255, 215, 0, 0.2)" />
              </View>
              <Image
                source={require("@/assets/images/logomain.png")}
                style={trialStyles.mascotSmall}
                resizeMode="contain"
              />
            </View>

            {/* Headline */}
            <Text style={trialStyles.cardHeadline}>
              Probablemente odias las pruebas gratuitas que piden tu tarjeta.
            </Text>

            {/* Body Text */}
            <Text style={trialStyles.cardBody}>
              Sabemos que algunas apps ofrecen una prueba gratis y esperan que sus usuarios olviden cancelarla. Aquí no hacemos eso.
            </Text>

            {/* The Offer */}
            <View style={trialStyles.offerContainer}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.1)']}
                style={trialStyles.offerGradient}
              >
                <Text style={trialStyles.offerText}>
                  3 Días Premium.{"\n"} 0 Riesgos.
                </Text>
                <Text style={trialStyles.offerHighlight}>
                  No pedimos tarjeta.
                </Text>
              </LinearGradient>
            </View>

            {/* Trust Badges */}
            <View style={trialStyles.trustBadges}>
              <Animated.View style={[trialStyles.trustBadge, badgeStyle]}>
                <View style={trialStyles.badgeIconContainer}>
                  <CreditCard size={16} color="#F38BA8" strokeWidth={2} />
                  <View style={trialStyles.crossLine} />
                </View>
                <Text style={trialStyles.trustBadgeText}>Sin Cobros Sorpresa</Text>
              </Animated.View>

              <View style={trialStyles.badgeDivider} />

              <View style={trialStyles.trustBadge}>
                <Unlock size={16} color="#A6E3A1" strokeWidth={2} />
                <Text style={trialStyles.trustBadgeText}>Acceso Total</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View
          entering={FadeInDown.delay(700).duration(500)}
          style={trialStyles.buttonContainer}
        >
          <Pressable onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onAccept();
          }}>
            <LinearGradient
              colors={['#FF9A9E', '#FAB387', '#FFD700']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={trialStyles.ctaButton}
            >
              <Text style={trialStyles.ctaButtonText}>Acepto el Regalo (Empezar)</Text>
              <Sparkles size={20} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Secondary Text */}
        <Animated.Text
          entering={FadeInDown.delay(900).duration(500)}
          style={trialStyles.secondaryText}
        >
          Después de 3 días, tú decides si vale la pena.
        </Animated.Text>
      </ScrollView>
    </LinearGradient>
  );
};

const trialStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  cardGlow: {
    position: 'absolute',
    top: 100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  cardContainer: {
    width: '100%',
    marginBottom: 24,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  shieldGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.2,
  },
  shieldIcon: {
    position: 'absolute',
    top: 5,
    zIndex: 1,
  },
  mascotSmall: {
    width: 70,
    height: 70,
    marginTop: 15,
  },
  cardHeadline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  cardBody: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  offerContainer: {
    marginBottom: 20,
  },
  offerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  offerText: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  offerHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
    textAlign: 'center',
  },
  trustBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeIconContainer: {
    position: 'relative',
  },
  crossLine: {
    position: 'absolute',
    top: 7,
    left: -2,
    width: 20,
    height: 2,
    backgroundColor: '#F38BA8',
    transform: [{ rotate: '45deg' }],
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  badgeDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 16,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});

// ============================================
// ANIMATED DAY CIRCLE COMPONENT
// ============================================
const AnimatedDayCircle = ({ 
  label, 
  delay, 
  onFilled 
}: { 
  label: string; 
  delay: number; 
  onFilled?: () => void;
}) => {
  const fillProgress = useSharedValue(0);
  const scale = useSharedValue(1);
  const checkOpacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Haptic feedback al llenar
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Animación de llenado
      fillProgress.value = withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.cubic) 
      });
      
      // Pequeño bounce al llenar
      scale.value = withSequence(
        withTiming(1.15, { duration: 150 }),
        withSpring(1, { damping: 10 })
      );
      
      // Mostrar check
      checkOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));
      
      // Callback después de la animación
      if (onFilled) {
        setTimeout(onFilled, 400);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: fillProgress.value > 0 
      ? `rgba(166, 227, 161, ${fillProgress.value})` 
      : colors.surface,
    borderColor: fillProgress.value > 0 
      ? colors.success 
      : 'rgba(255, 255, 255, 0.1)',
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: 1 - checkOpacity.value,
  }));

  return (
    <Animated.View style={[habitStyles.dayCircle, circleStyle]}>
      <Animated.Text style={[habitStyles.dayLabel, labelStyle]}>
        {label}
      </Animated.Text>
      <Animated.Text style={[habitStyles.checkMark, checkStyle]}>
        ✓
      </Animated.Text>
    </Animated.View>
  );
};

const HabitDaysAnimation = ({ onComplete }: { onComplete: () => void }) => {
  const [filledCount, setFilledCount] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const factOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    // Animaciones de entrada del texto
    titleOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
    subtitleOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    factOpacity.value = withDelay(3500, withTiming(1, { duration: 500 }));
    
    // Mostrar botón después de que termine la animación (~4 segundos)
    const buttonTimer = setTimeout(() => {
      setShowButton(true);
      buttonOpacity.value = withTiming(1, { duration: 400 });
    }, 4000);
    
    return () => clearTimeout(buttonTimer);
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: (1 - titleOpacity.value) * 20 }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const factStyle = useAnimatedStyle(() => ({
    opacity: factOpacity.value,
    transform: [{ translateY: (1 - factOpacity.value) * 10 }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: (1 - buttonOpacity.value) * 20 }],
  }));

  // Calcular delay para cada círculo (4 segundos total / 7 días ≈ 570ms entre cada uno)
  const getDelay = (index: number) => 500 + (index * 430);

  return (
    <View style={habitStyles.container}>
      {/* Logo con breathing */}
      <Animated.View
        entering={FadeInDown.delay(0).duration(500)}
        style={habitStyles.logoContainer}
      >
        <Image
          source={require("@/assets/images/logomain.png")}
          style={habitStyles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Título */}
      <Animated.Text style={[habitStyles.title, titleStyle]}>
        Construye tu hábito diario
      </Animated.Text>

      {/* Subtítulo */}
      <Animated.Text style={[habitStyles.subtitle, subtitleStyle]}>
        La consistencia es clave para el cambio duradero
      </Animated.Text>

      {/* Círculos de días */}
      <View style={habitStyles.daysRow}>
        {HABIT_DAYS.map((day, index) => (
          <AnimatedDayCircle
            key={day.id}
            label={day.label}
            delay={getDelay(index)}
            onFilled={index === 6 ? undefined : () => setFilledCount(prev => prev + 1)}
          />
        ))}
      </View>

      {/* Texto de progreso */}
      <Animated.Text style={habitStyles.progressText}>
        Empieza pequeño y mantén la consistencia
      </Animated.Text>

      {/* Fact Card */}
      <Animated.View style={[habitStyles.factCard, factStyle]}>
        <View style={habitStyles.factIconContainer}>
          <Flame
            size={20}
            color={colors.accent}
            strokeWidth={2}
            fill={colors.accent}
          />
        </View>
        <Text style={habitStyles.factText}>
          Las personas con rachas de 7 días tienen 3x más probabilidades
          de formar hábitos duraderos
        </Text>
      </Animated.View>

      {/* Botón Continuar */}
      {showButton && (
        <Animated.View style={[habitStyles.buttonContainer, buttonStyle]}>
          <Pressable onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onComplete();
          }}>
            <LinearGradient
              colors={['#FF9A9E', '#FECFEF', '#D4A5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={habitStyles.continueButton}
            >
              <Text style={habitStyles.continueButtonText}>Continuar</Text>
              <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

const habitStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 130,
    height: 130,
    marginBottom: -20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    position: 'absolute',
  },
  checkMark: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background,
    position: 'absolute',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  factCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.accent}15`,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginHorizontal: 20,
  },
  factIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 32,
    width: '100%',
    paddingHorizontal: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

const GOAL_OPTIONS = [
  {
    id: "paralysis",
    emoji: "🧠",
    label: "Vencer la parálisis por análisis",
    color: colors.primary,
  },
  {
    id: "time",
    emoji: "⌜",
    label: "Mejorar mi noción del tiempo",
    color: colors.accent,
  },
  {
    id: "noise",
    emoji: "⚡",
    label: "Reducir el ruido mental",
    color: colors.success,
  },
  {
    id: "consistent",
    emoji: "✅",
    label: "Ser más consistente",
    color: colors.primary,
  },
  {
    id: "anxiety",
    emoji: "🧘",
    label: "Bajar la ansiedad al empezar",
    color: colors.accent,
  },
];

const OVERWHELM_OPTIONS = [
  { id: "always", label: "Sí, siempre", value: "always" },
  { id: "often", label: "Sí, a menudo", value: "often" },
  { id: "sometimes", label: "De vez en cuando", value: "sometimes" },
  { id: "rarely", label: "Raramente", value: "rarely" },
  { id: "never", label: "Nunca", value: "never" },
];

const AGREEMENT_OPTIONS = [
  { id: "strongly_agree", label: "Muy de acuerdo", value: "strongly_agree" },
  { id: "somewhat_agree", label: "Algo de acuerdo", value: "somewhat_agree" },
  { id: "disagree", label: "En desacuerdo", value: "disagree" },
  {
    id: "strongly_disagree",
    label: "Muy en desacuerdo",
    value: "strongly_disagree",
  },
];

const STATEMENTS = [
  {
    id: 1,
    textMain: "A menudo sé exactamente lo que tengo que hacer, pero me siento ",
    textHighlight: "físicamente incapaz de empezar",
  },
  {
    id: 2,
    textMain: "Paso más tiempo preocupándome por una tarea que lo que ",
    textHighlight: "realmente me tomaría completarla",
  },
  {
    id: 3,
    textMain: "Si no veo una tarea justo frente a mí, ",
    textHighlight: "efectivamente no existe",
  },
  {
    id: 4,
    textMain: "Los plazos no se sienten 'reales' hasta que llega el ",
    textHighlight: "pánico del último minuto",
  },
];

const DAYS_OF_WEEK = [
  { id: 1, label: "Lun", shortLabel: "L" },
  { id: 2, label: "Mar", shortLabel: "M" },
  { id: 3, label: "Mié", shortLabel: "X" },
  { id: 4, label: "Jue", shortLabel: "J" },
  { id: 5, label: "Vie", shortLabel: "V" },
  { id: 6, label: "Sáb", shortLabel: "S" },
  { id: 0, label: "Dom", shortLabel: "D" },
];

const ENEMY_OPTIONS = [
  {
    id: "analysis",
    icon: Brain,
    label: "Parálisis por Análisis",
    color: colors.primary,
  },
  {
    id: "forget",
    icon: CloudFog,
    label: "Olvido constante",
    color: colors.primary,
  },
  {
    id: "overload",
    icon: Zap,
    label: "Sobrecarga Sensorial",
    color: colors.accent,
  },
];

interface SelectableButtonProps {
  icon: any;
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}

const SelectableButton: React.FC<SelectableButtonProps> = ({
  icon: Icon,
  label,
  color,
  selected,
  onPress,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.95, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.selectableButton,
          selected && styles.selectableButtonSelected,
        ]}
      >
        <View
          style={[
            styles.selectableIconContainer,
            { backgroundColor: `${color}15` },
          ]}
        >
          <Icon size={24} color={color} strokeWidth={2} />
        </View>
        <Text
          style={[
            styles.selectableLabel,
            selected && styles.selectableLabelSelected,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

interface GoalPillProps {
  goal: { id: string; emoji: string; label: string; color: string };
  selected: boolean;
  onPress: () => void;
  delay: number;
}

const GoalPill: React.FC<GoalPillProps> = ({
  goal,
  selected,
  onPress,
  delay,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.92, { damping: 8, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 8, stiffness: 400 });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={animatedStyle}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.goalPill, selected && styles.goalPillSelected]}
      >
        <Text style={styles.goalEmoji}>{goal.emoji}</Text>
        <Text style={[styles.goalLabel, selected && styles.goalLabelSelected]}>
          {goal.label}
        </Text>
        {selected ? (
          <Check size={16} color={colors.primary} strokeWidth={3} />
        ) : (
          <Plus size={16} color={colors.textSecondary} strokeWidth={2} />
        )}
      </Pressable>
    </Animated.View>
  );
};

export default function OnboardingScreen() {
  const searchParams = useLocalSearchParams();
  const initialSlide = searchParams.slide ? parseInt(searchParams.slide as string) : 0;
  
  const [currentSlide, setCurrentSlide] = useState(initialSlide);
  const [userName, setUserName] = useState("");
  const [selectedEnemies, setSelectedEnemies] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [overwhelmLevel, setOverwhelmLevel] = useState<string | null>(null);
  const [statement1, setStatement1] = useState<string | null>(null);
  const [statement2, setStatement2] = useState<string | null>(null);
  const [statement3, setStatement3] = useState<string | null>(null);
  const [statement4, setStatement4] = useState<string | null>(null);
  const [taskText, setTaskText] = useState("");

  // Breathing animation for mascot
  const breathingAnim = useSharedValue(0);
  
  useEffect(() => {
    breathingAnim.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const mascotAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: breathingAnim.value * -12 },
        { scale: 1 + breathingAnim.value * 0.03 },
      ],
    };
  });

  const goToNextSlide = () => {
    if (currentSlide < 12) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const finishOnboarding = () => {
    // Guardar datos del onboarding si es necesario
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  };

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return (
          <LinearGradient
            colors={['#1A1A2E', '#16213E']}
            style={styles.welcomeSlide}
          >
            {/* Mascot with breathing animation */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(700)}
              style={[styles.welcomeHeroContainer, mascotAnimatedStyle]}
            >
              <View style={styles.welcomeGlowContainer}>
                <View style={styles.welcomeGlowCircle} />
                <Image
                  source={require("@/assets/images/logoonboarding1.png")}
                  style={styles.welcomeMascot}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.Text
              entering={FadeInDown.delay(400).duration(600)}
              style={styles.welcomeTitle}
            >
              Hola. Respira.
            </Animated.Text>

            {/* Subtitle */}
            <Animated.Text
              entering={FadeInDown.delay(550).duration(600)}
              style={styles.welcomeSubtitle}
            >
              Tu cerebro no está roto.{"\n"}Solo necesita un copiloto diferente.
            </Animated.Text>

            {/* Spacer to push button to bottom third */}
            <View style={styles.welcomeSpacer} />

            {/* Inner Light Button */}
            <Animated.View
              entering={FadeInDown.delay(700).duration(500)}
              style={styles.welcomeButtonContainer}
            >
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  goToNextSlide();
                }}
                style={({ pressed }) => [
                  styles.welcomeButton,
                  pressed && styles.welcomeButtonPressed,
                ]}
              >
                <LinearGradient
                  colors={['#FF9A9E', '#FECFEF', '#D4A5FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.welcomeButtonGradient}
                >
                  <View style={styles.welcomeButtonInner}>
                    <Text style={styles.welcomeButtonText}>Comenzar</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </LinearGradient>
        );

      case 1:
        return (
          <View style={styles.slide}>
            <Animated.View
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.logoImageContainer}
            >
              <Image
                source={require("@/assets/images/logomain.png")}
                style={styles.logoImageSmall}
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.slideTitle}
            >
              ¿Cuál es tu nombre?
            </Animated.Text>

            <Animated.Text
              entering={FadeInDown.delay(250).duration(500)}
              style={styles.slideSubtitle}
            >
              ¡Me encantaría conocerte mejor!
            </Animated.Text>

            <Animated.View
              entering={FadeInDown.delay(300).duration(500)}
              style={styles.nameInputContainer}
            >
              <TextInput
                style={styles.nameInput}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textSecondary}
                value={userName}
                onChangeText={setUserName}
                autoFocus
              />
            </Animated.View>
          </View>
        );

      case 2:
        return (
          <View style={styles.slide}>
            <Animated.Text
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.slideTitle}
            >
              ¿Cuál es tu mayor{"\n"}enemigo hoy?
            </Animated.Text>

            <Animated.Text
              entering={FadeInDown.delay(150).duration(500)}
              style={styles.slideSubtitle}
            >
              Selecciona todas las pertinentes
            </Animated.Text>

            <Animated.View
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.optionsContainer}
            >
              {ENEMY_OPTIONS.map((option, index) => (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.delay(300 + index * 100).duration(500)}
                >
                  <SelectableButton
                    icon={option.icon}
                    label={option.label}
                    color={option.color}
                    selected={selectedEnemies.includes(option.id)}
                    onPress={() => {
                      if (selectedEnemies.includes(option.id)) {
                        setSelectedEnemies(
                          selectedEnemies.filter((id) => id !== option.id),
                        );
                      } else {
                        setSelectedEnemies([...selectedEnemies, option.id]);
                      }
                    }}
                  />
                </Animated.View>
              ))}
            </Animated.View>
          </View>
        );

      case 3:
        return (
          <View style={styles.slide}>
            <Animated.Text
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.slideTitle}
            >
              Divide y Vencerás.
            </Animated.Text>

            <Animated.View
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.graphContainer}
            >
              {/* Big Circle */}
              <View
                style={[
                  styles.bigCircle,
                  { backgroundColor: `${colors.accent}30` },
                ]}
              >
                <View
                  style={[
                    styles.innerCircle,
                    { backgroundColor: colors.accent },
                  ]}
                />
              </View>

              {/* Connection Lines */}
              <View style={styles.linesContainer}>
                <View style={styles.connectionLine} />
                <View
                  style={[styles.connectionLine, styles.connectionLineLeft]}
                />
                <View
                  style={[styles.connectionLine, styles.connectionLineRight]}
                />
              </View>

              {/* Small Circles */}
              <View style={styles.smallCirclesContainer}>
                <View
                  style={[
                    styles.smallCircle,
                    { backgroundColor: colors.primary },
                  ]}
                />
                <View
                  style={[
                    styles.smallCircle,
                    { backgroundColor: colors.success },
                  ]}
                />
                <View
                  style={[
                    styles.smallCircle,
                    { backgroundColor: colors.accent },
                  ]}
                />
              </View>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(400).duration(500)}
              style={styles.description}
            >
              Hackeamos tu dopamina convirtiendo{"\n"}tareas grandes en
              victorias rápidas.
            </Animated.Text>
          </View>
        );

      case 4:
        return (
          <HabitDaysAnimation onComplete={goToNextSlide} />
        );

      case 5:
        return (
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo con glow */}

            <Animated.Text
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.slideTitle}
            >
              ¿Qué quieres lograr con SmartList?
            </Animated.Text>

            <Animated.Text
              entering={FadeInDown.delay(250).duration(500)}
              style={styles.slideSubtitle}
            >
              Selecciona tus objetivos para que la IA personalice tu
              experiencia.
            </Animated.Text>

            {/* Goals Grid */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(500)}
              style={styles.goalsGrid}
            >
              {GOAL_OPTIONS.map((goal, index) => (
                <GoalPill
                  key={goal.id}
                  goal={goal}
                  selected={selectedGoals.includes(goal.id)}
                  onPress={() => {
                    if (selectedGoals.includes(goal.id)) {
                      setSelectedGoals(
                        selectedGoals.filter((g) => g !== goal.id),
                      );
                    } else {
                      setSelectedGoals([...selectedGoals, goal.id]);
                    }
                  }}
                  delay={350 + index * 50}
                />
              ))}
            </Animated.View>
          </ScrollView>
        );

      case 6:
        return (
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.Text
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.statementSubtitle}
            >
              ¿Qué tan de acuerdo estás con esta afirmación?
            </Animated.Text>

            <Animated.View
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.statementWrapper}
            >
              <Image
                source={require("@/assets/images/logoonboarding5.png")}
                style={styles.statementOwl}
                resizeMode="contain"
              />
              <View style={styles.speechCard}>
                <Text style={styles.quoteOpen}>"</Text>
                <Text style={styles.speechCardText}>
                  {STATEMENTS[0].textMain}
                  <Text style={styles.speechCardHighlight}>
                    {STATEMENTS[0].textHighlight}
                  </Text>
                </Text>
                <Text style={styles.quoteClose}>"</Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(300).duration(500)}
              style={styles.agreementOptions}
            >
              {AGREEMENT_OPTIONS.map((option, index) => (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.delay(350 + index * 50).duration(400)}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setStatement1(option.value);
                      setTimeout(() => goToNextSlide(), 300);
                    }}
                    style={[
                      styles.agreementOption,
                      statement1 === option.value &&
                        styles.agreementOptionSelected,
                    ]}
                  >
                    <LinearGradient
                      colors={statement1 === option.value ? ['#FF9A9E', '#FECFEF', '#D4A5FF'] : ['rgba(49, 50, 68, 0.8)', 'rgba(49, 50, 68, 0.8)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.agreementOptionGradient}
                    >
                      <View style={[
                        styles.agreementOptionInner,
                        statement1 === option.value && styles.agreementOptionInnerSelected,
                      ]}>
                        <Text
                          style={[
                            styles.agreementOptionText,
                            statement1 === option.value &&
                              styles.agreementOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </ScrollView>
        );

      case 7:
        return (
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.Text
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.statementSubtitle}
            >
              ¿Qué tan de acuerdo estás con esta afirmación?
            </Animated.Text>

            <Animated.View
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.statementWrapper}
            >
              <Image
                source={require("@/assets/images/logoonboarding5.png")}
                style={styles.statementOwl}
                resizeMode="contain"
              />
              <View style={styles.speechCard}>
                <Text style={styles.quoteOpen}>“</Text>
                <Text style={styles.speechCardText}>
                  {STATEMENTS[1].textMain}
                  <Text style={styles.speechCardHighlight}>
                    {STATEMENTS[1].textHighlight}
                  </Text>
                </Text>
                <Text style={styles.quoteClose}>”</Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(300).duration(500)}
              style={styles.agreementOptions}
            >
              {AGREEMENT_OPTIONS.map((option, index) => (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.delay(350 + index * 50).duration(400)}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setStatement2(option.value);
                      setTimeout(() => goToNextSlide(), 300);
                    }}
                    style={[
                      styles.agreementOption,
                      statement2 === option.value &&
                        styles.agreementOptionSelected,
                    ]}
                  >
                    <LinearGradient
                      colors={statement2 === option.value ? ['#FF9A9E', '#FECFEF', '#D4A5FF'] : ['rgba(49, 50, 68, 0.8)', 'rgba(49, 50, 68, 0.8)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.agreementOptionGradient}
                    >
                      <View style={[
                        styles.agreementOptionInner,
                        statement2 === option.value && styles.agreementOptionInnerSelected,
                      ]}>
                        <Text
                          style={[
                            styles.agreementOptionText,
                            statement2 === option.value &&
                              styles.agreementOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </ScrollView>
        );

      case 8:
        return (
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.Text
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.statementSubtitle}
            >
              ¿Qué tan de acuerdo estás con esta afirmación?
            </Animated.Text>

            <Animated.View
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.statementWrapper}
            >
              <Image
                source={require("@/assets/images/logoonboarding5.png")}
                style={styles.statementOwl}
                resizeMode="contain"
              />
              <View style={styles.speechCard}>
                <Text style={styles.quoteOpen}>“</Text>
                <Text style={styles.speechCardText}>
                  {STATEMENTS[2].textMain}
                  <Text style={styles.speechCardHighlight}>
                    {STATEMENTS[2].textHighlight}
                  </Text>
                </Text>
                <Text style={styles.quoteClose}>”</Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(300).duration(500)}
              style={styles.agreementOptions}
            >
              {AGREEMENT_OPTIONS.map((option, index) => (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.delay(350 + index * 50).duration(400)}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setStatement3(option.value);
                      setTimeout(() => goToNextSlide(), 300);
                    }}
                    style={[
                      styles.agreementOption,
                      statement3 === option.value &&
                        styles.agreementOptionSelected,
                    ]}
                  >
                    <LinearGradient
                      colors={statement3 === option.value ? ['#FF9A9E', '#FECFEF', '#D4A5FF'] : ['rgba(49, 50, 68, 0.8)', 'rgba(49, 50, 68, 0.8)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.agreementOptionGradient}
                    >
                      <View style={[
                        styles.agreementOptionInner,
                        statement3 === option.value && styles.agreementOptionInnerSelected,
                      ]}>
                        <Text
                          style={[
                            styles.agreementOptionText,
                            statement3 === option.value &&
                              styles.agreementOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </ScrollView>
        );

      case 9:
        return (
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.Text
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.statementSubtitle}
            >
              ¿Qué tan de acuerdo estás con esta afirmación?
            </Animated.Text>

            <Animated.View
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.statementWrapper}
            >
              <Image
                source={require("@/assets/images/logoonboarding5.png")}
                style={styles.statementOwl}
                resizeMode="contain"
              />
              <View style={styles.speechCard}>
                <Text style={styles.quoteOpen}>“</Text>
                <Text style={styles.speechCardText}>
                  {STATEMENTS[3].textMain}
                  <Text style={styles.speechCardHighlight}>
                    {STATEMENTS[3].textHighlight}
                  </Text>
                </Text>
                <Text style={styles.quoteClose}>”</Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(300).duration(500)}
              style={styles.agreementOptions}
            >
              {AGREEMENT_OPTIONS.map((option, index) => (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.delay(350 + index * 50).duration(400)}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setStatement4(option.value);
                      setTimeout(() => goToNextSlide(), 300);
                    }}
                    style={[
                      styles.agreementOption,
                      statement4 === option.value &&
                        styles.agreementOptionSelected,
                    ]}
                  >
                    <LinearGradient
                      colors={statement4 === option.value ? ['#FF9A9E', '#FECFEF', '#D4A5FF'] : ['rgba(49, 50, 68, 0.8)', 'rgba(49, 50, 68, 0.8)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.agreementOptionGradient}
                    >
                      <View style={[
                        styles.agreementOptionInner,
                        statement4 === option.value && styles.agreementOptionInnerSelected,
                      ]}>
                        <Text
                          style={[
                            styles.agreementOptionText,
                            statement4 === option.value &&
                              styles.agreementOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </ScrollView>
        );

      case 10:
        return (
          <GrowthPotentialScreen onContinue={goToNextSlide} />
        );

      case 11:
        return (
          <SuccessTimelineScreen onContinue={goToNextSlide} />
        );

      case 12:
        return (
          <ReverseTrialScreen onAccept={finishOnboarding} />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Dev Close Button - Always visible */}
      {__DEV__ && (
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={styles.devCloseButton}
        >
          <Text style={styles.devCloseButtonText}>×</Text>
        </Pressable>
      )}

      {/* Header - Hidden for welcome slide */}
      {currentSlide > 0 && (
      <View style={styles.headerContainer}>
        {/* Back Button */}
        <View style={styles.backButtonArea}>
          {currentSlide > 0 ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              <Pressable
                onPress={goToPrevSlide}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.backButtonPressed,
                ]}
              >
                <Text style={styles.backButtonText}>←</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={[
                styles.progressBarFill,
                { width: `${((currentSlide + 1) / 13) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Right Spacer */}
        <View style={styles.backButtonArea} />
      </View>
      )}

      {/* Slide Content */}
      <View style={styles.slideContainer}>{renderSlide()}</View>

      {/* Navigation Buttons - Hidden for slides 0, 4, and 6+ */}
      {currentSlide > 0 && currentSlide < 6 && currentSlide !== 4 && (
        <View style={styles.navigationContainer}>
          {currentSlide === 5 ? (
            <Pressable
              onPress={goToNextSlide}
              disabled={selectedGoals.length === 0}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || selectedGoals.length === 0) &&
                  styles.primaryButtonPressed,
              ]}
            >
              <LinearGradient
                colors={['#FF9A9E', '#FECFEF', '#D4A5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonContent}
              >
                <View style={styles.primaryButtonInner}>
                  <Text style={styles.primaryButtonText}>Continuar</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              onPress={goToNextSlide}
              disabled={
                (currentSlide === 1 && !userName.trim()) ||
                (currentSlide === 2 && selectedEnemies.length === 0)
              }
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed ||
                  (currentSlide === 1 && !userName.trim()) ||
                  (currentSlide === 2 && selectedEnemies.length === 0)) &&
                  styles.primaryButtonPressed,
              ]}
            >
              <LinearGradient
                colors={['#FF9A9E', '#FECFEF', '#D4A5FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonContent}
              >
                <View style={styles.primaryButtonInner}>
                  <Text style={styles.primaryButtonText}>Continuar</Text>
                </View>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  devCloseButton: {
    position: "absolute",
    top: 50,
    right: 16,
    zIndex: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  devCloseButtonText: {
    fontSize: 24,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "300",
    marginTop: -2,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backButtonArea: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  progressBarWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  progressBarBackground: {
    height: 2,
    backgroundColor: colors.surface,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  backButtonContainer: {},
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    fontSize: 30,
    color: "#F2F3F4",
  },
  slideContainer: {
    flex: 1,
  },
  slideScroll: {
    flex: 1,
  },
  slideScrollContent: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  slide: {
    paddingHorizontal: 32,
    paddingTop: 60,
    alignItems: "center",
  },
  // Welcome Slide (Case 0) - Deep Ambient Style 2026
  welcomeSlide: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    alignItems: "center",
  },
  welcomeHeroContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  welcomeGlowContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeGlowCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(203, 166, 247, 0.15)",
    shadowColor: "#CBA6F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
  },
  welcomeMascot: {
    width: 120,
    height: 120,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: -0.5,
    fontFamily: "System",
  },
  welcomeSubtitle: {
    fontSize: 17,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.65)",
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 24,
  },
  welcomeSpacer: {
    flex: 1,
    minHeight: 60,
  },
  welcomeButtonContainer: {
    width: "100%",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  welcomeButton: {
    borderRadius: 50,
    overflow: "hidden",
    shadowColor: "#FF9A9E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  welcomeButtonGradient: {
    borderRadius: 50,
    padding: 2,
  },
  welcomeButtonInner: {
    backgroundColor: "rgba(26, 26, 46, 0.3)",
    borderRadius: 48,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  welcomeButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  heroContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  glowContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  glowCircle: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${colors.primary}10`,
    opacity: 0.6,
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: "900",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "400",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 28,
    paddingHorizontal: 20,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  slideSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  logoImageContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoImageSmall: {
    width: 80,
    height: 80,
  },
  nameInputContainer: {
    width: "100%",
    paddingHorizontal: 20,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    textAlign: "center",
  },
  streakIconContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoImage: {
    width: 130,
    height: 130,
    marginBottom: -20,
  },
  daysContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  dayButtonSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  dayLabelSelected: {
    color: colors.background,
  },
  streakSubtext: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  factCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.accent}15`,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginHorizontal: 20,
  },
  factIconContainer: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  factText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
    lineHeight: 18,
  },
  optionsContainer: {
    width: "100%",
    gap: 16,
  },
  selectableButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  selectableButtonSelected: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  selectableIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  selectableLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  selectableLabelSelected: {
    color: colors.textPrimary,
  },
  graphContainer: {
    alignItems: "center",
    marginBottom: 48,
    height: 280,
    justifyContent: "center",
  },
  bigCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 60,
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  linesContainer: {
    position: "absolute",
    top: 100,
    width: 200,
    height: 80,
    alignItems: "center",
  },
  connectionLine: {
    width: 2,
    height: 80,
    backgroundColor: `${colors.primary}30`,
    position: "absolute",
  },
  connectionLineLeft: {
    transform: [{ translateX: -60 }, { rotate: "20deg" }],
  },
  connectionLineRight: {
    transform: [{ translateX: 60 }, { rotate: "-20deg" }],
  },
  smallCirclesContainer: {
    flexDirection: "row",
    gap: 40,
    marginTop: 20,
  },
  smallCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  description: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 140,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    textAlignVertical: "top",
  },
  navigationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  primaryButton: {
    borderRadius: 50,
    overflow: "hidden",
    shadowColor: "#FF9A9E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonContent: {
    borderRadius: 50,
    padding: 2,
  },
  primaryButtonInner: {
    backgroundColor: "rgba(26, 26, 46, 0.3)",
    borderRadius: 48,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  finalButtonWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  finalButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  finalButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  finalButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.background,
    letterSpacing: 0.5,
  },
  goalHeroContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  goalLogo: {
    width: 100,
    height: 100,
  },
  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  goalPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.05)",
    gap: 8,
  },
  goalPillSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}05`,
  },
  goalEmoji: {
    fontSize: 18,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  goalLabelSelected: {
    color: colors.textPrimary,
  },
  overwhelmLogoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  overwhelmLogo: {
    width: 100,
    height: 100,
  },
  overwhelmTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 32,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  overwhelmOptions: {
    width: "100%",
    gap: 10,
    paddingHorizontal: 20,
  },
  overwhelmOption: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  overwhelmOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  overwhelmOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "left",
  },
  overwhelmOptionTextSelected: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  // Statement screens
  statementSubtitle: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statementWrapper: {
    position: "relative",
    width: "100%",
    marginBottom: 32,
    paddingTop: 24,
  },
  statementOwl: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 72,
    height: 72,
    zIndex: 10,
  },
  speechCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 24,
    marginLeft: 40,
    marginTop: 16,
  },
  quoteOpen: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.accent,
    lineHeight: 36,
    marginBottom: 4,
  },
  quoteClose: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.accent,
    lineHeight: 36,
    textAlign: "right",
    marginTop: 4,
  },
  speechCardText: {
    fontSize: 17,
    fontWeight: "500",
    color: colors.textPrimary,
    lineHeight: 26,
  },
  speechCardHighlight: {
    fontWeight: "700",
    color: colors.primary,
  },
  agreementOptions: {
    width: "100%",
    gap: 12,
    paddingHorizontal: 20,
  },
  agreementOption: {
    borderRadius: 50,
    overflow: "hidden",
    shadowColor: "#FF9A9E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  agreementOptionGradient: {
    borderRadius: 50,
    padding: 2,
  },
  agreementOptionInner: {
    backgroundColor: "rgba(26, 26, 46, 0.6)",
    borderRadius: 48,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  agreementOptionSelected: {
    shadowOpacity: 0.35,
  },
  agreementOptionInnerSelected: {
    backgroundColor: "rgba(26, 26, 46, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  agreementOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  agreementOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // Results Screen (Slide 11)
  resultsScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  resultsCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  progressSection: {
    marginBottom: 24,
  },
  tooltipContainer: {
    position: "relative",
    height: 32,
    marginBottom: 8,
  },
  tooltip: {
    position: "absolute",
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    transform: [{ translateX: -40 }],
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  gradientBarContainer: {
    position: "relative",
    height: 12,
    marginBottom: 12,
  },
  gradientBar: {
    height: 12,
    borderRadius: 6,
    width: "100%",
  },
  progressThumb: {
    position: "absolute",
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F38BA8",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    transform: [{ translateX: -10 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabelText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  warningBox: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    marginBottom: 24,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  warningText: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsGrid: {
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  resultsLogo: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 80,
    height: 80,
    opacity: 0.3,
  },
  resultsButtonContainer: {
    paddingHorizontal: 20,
  },
  resultsButton: {
    borderRadius: 50,
    overflow: "hidden",
    shadowColor: "#FF9A9E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  resultsButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  resultsButtonGradient: {
    borderRadius: 50,
    padding: 2,
  },
  resultsButtonInner: {
    backgroundColor: "rgba(26, 26, 46, 0.3)",
    borderRadius: 48,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  resultsButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  // Projection Screen (Slide 12)
  projectionSlide: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  projectionButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
