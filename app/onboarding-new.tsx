import { colors } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
    AlertTriangle,
    Brain,
    Check,
    CloudFog,
    Crown,
    Flame,
    Plus,
    Sparkles,
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
import Animated, {
    Easing,
    FadeInDown,
    FadeInUp,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
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
  const pathD = `M 20 ${CHART_HEIGHT - 30} Q 80 ${CHART_HEIGHT - 50}, 140 ${CHART_HEIGHT - 80} T 260 ${CHART_HEIGHT - 160}`;
  const pathLength = 400; // Approximate path length

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
            style={[chartStyles.tooltipContainer, { left: 24 + 20 - 4, top: 24 + (CHART_HEIGHT - 30) - 6 }]}
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
            style={[chartStyles.tooltipContainer, { left: 24 + 140 - 4, top: 24 + (CHART_HEIGHT - 80) - 6 }]}
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
            style={[chartStyles.tooltipContainer, { left: 24 + 260 - 4, top: 24 + (CHART_HEIGHT - 160) - 6 }]}
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
  const [currentSlide, setCurrentSlide] = useState(0);
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

  const goToNextSlide = () => {
    if (currentSlide < 12) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const finishOnboarding = () => {
    // Guardar datos del onboarding si es necesario
    router.replace("/(tabs)");
  };

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return (
          <View style={styles.slide}>
            <Animated.View
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.heroContainer}
            >
              <View style={styles.glowContainer}>
                <View style={styles.glowCircle} />
                <Sparkles size={80} color={colors.primary} strokeWidth={1.5} />
              </View>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(300).duration(500)}
              style={styles.mainTitle}
            >
              Hola. Respira.
            </Animated.Text>

            <Animated.Text
              entering={FadeInDown.delay(400).duration(500)}
              style={styles.subtitle}
            >
              Tu cerebro no está roto.{"\n"}Solo necesita un copiloto diferente.
            </Animated.Text>
          </View>
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
          <View style={styles.slide}>
            {/* Logo */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.streakIconContainer}
            >
              <Image
                source={require("@/assets/images/logomain.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.slideTitle}
            >
              Construye tu hábito diario
            </Animated.Text>

            <Animated.Text
              entering={FadeInDown.delay(250).duration(500)}
              style={styles.slideSubtitle}
            >
              La consistencia es clave para el cambio duradero
            </Animated.Text>

            {/* Days Selector */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(500)}
              style={styles.daysContainer}
            >
              {DAYS_OF_WEEK.map((day, index) => (
                <Pressable
                  key={day.id}
                  onPress={() => {
                    if (selectedDays.includes(day.id)) {
                      setSelectedDays(selectedDays.filter((d) => d !== day.id));
                    } else {
                      setSelectedDays([...selectedDays, day.id]);
                    }
                  }}
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day.id) && styles.dayButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      selectedDays.includes(day.id) && styles.dayLabelSelected,
                    ]}
                  >
                    {day.shortLabel}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(350).duration(500)}
              style={styles.streakSubtext}
            >
              Empieza pequeño y mantén la consistencia
            </Animated.Text>

            {/* Fact Card */}
            <Animated.View
              entering={FadeInDown.delay(400).duration(500)}
              style={styles.factCard}
            >
              <View style={styles.factIconContainer}>
                <Flame
                  size={20}
                  color={colors.accent}
                  strokeWidth={2}
                  fill={colors.accent}
                />
              </View>
              <Text style={styles.factText}>
                Las personas con rachas de 7 días tienen 3x más probabilidades
                de formar hábitos duraderos
              </Text>
            </Animated.View>
          </View>
        );

      case 5:
        return (
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.overwhelmLogoContainer}
            >
              <Image
                source={require("@/assets/images/logoonboarding4.png")}
                style={styles.overwhelmLogo}
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.overwhelmTitle}
            >
              ¿Las tareas complejas{"\n"}te abruman?
            </Animated.Text>

            {/* Options List */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(500)}
              style={styles.overwhelmOptions}
            >
              {OVERWHELM_OPTIONS.map((option, index) => (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.delay(350 + index * 50).duration(400)}
                >
                  <Pressable
                    onPress={() => setOverwhelmLevel(option.value)}
                    style={[
                      styles.overwhelmOption,
                      overwhelmLevel === option.value &&
                        styles.overwhelmOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.overwhelmOptionText,
                        overwhelmLevel === option.value &&
                          styles.overwhelmOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                </Animated.View>
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
                      setStatement1(option.value);
                      setTimeout(() => goToNextSlide(), 300);
                    }}
                    style={[
                      styles.agreementOption,
                      statement1 === option.value &&
                        styles.agreementOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.agreementOptionText,
                        statement1 === option.value &&
                          styles.agreementOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
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
                      setStatement2(option.value);
                      setTimeout(() => goToNextSlide(), 300);
                    }}
                    style={[
                      styles.agreementOption,
                      statement2 === option.value &&
                        styles.agreementOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.agreementOptionText,
                        statement2 === option.value &&
                          styles.agreementOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
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
                      setStatement3(option.value);
                      setTimeout(() => goToNextSlide(), 300);
                    }}
                    style={[
                      styles.agreementOption,
                      statement3 === option.value &&
                        styles.agreementOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.agreementOptionText,
                        statement3 === option.value &&
                          styles.agreementOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </ScrollView>
        );

      case 10:
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
                      setStatement4(option.value);
                      setTimeout(() => goToNextSlide(), 300);
                    }}
                    style={[
                      styles.agreementOption,
                      statement4 === option.value &&
                        styles.agreementOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.agreementOptionText,
                        statement4 === option.value &&
                          styles.agreementOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </ScrollView>
        );

      case 11:
        return (
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.resultsScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Title */}
            <Animated.Text
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.resultsTitle}
            >
              Tu Nivel de ADHD
            </Animated.Text>

            {/* Main Results Card */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(500)}
              style={styles.resultsCard}
            >
              {/* Status Row */}
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Estado ADHD:</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>Normal - 9.3</Text>
                </View>
              </View>

              {/* Progress Bar with Gradient */}
              <View style={styles.progressSection}>
                <View style={styles.tooltipContainer}>
                  <View style={[styles.tooltip, { left: '75%' }]}>
                    <Text style={styles.tooltipText}>Tú - 18.79</Text>
                  </View>
                </View>
                <View style={styles.gradientBarContainer}>
                  <LinearGradient
                    colors={['#A6E3A1', '#F9E2AF', '#F38BA8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBar}
                  />
                  <View style={[styles.progressThumb, { left: '75%' }]} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabelText}>BAJO</Text>
                  <Text style={styles.progressLabelText}>PROMEDIO</Text>
                  <Text style={styles.progressLabelText}>MEDIO</Text>
                  <Text style={styles.progressLabelText}>ALTO</Text>
                </View>
              </View>

              {/* Warning Box */}
              <View style={styles.warningBox}>
                <View style={styles.warningHeader}>
                  <AlertTriangle size={20} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.warningTitle}>Nivel ALTO</Text>
                </View>
                <Text style={styles.warningText}>
                  Los síntomas elevados de ADHD pueden resultar en más estrés, menos oportunidades, relaciones tensas y menor bienestar.
                </Text>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: `${colors.primary}20` }]}>
                    <User size={18} color={colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>Tipo ADHD</Text>
                    <Text style={styles.statValue}>Combinado</Text>
                  </View>
                </View>

                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: `${colors.accent}20` }]}>
                    <Brain size={18} color={colors.accent} strokeWidth={2} />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>Satisfacción de Vida</Text>
                    <Text style={styles.statValue}>Por debajo del promedio</Text>
                  </View>
                </View>

                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: `${colors.success}20` }]}>
                    <Zap size={18} color={colors.success} strokeWidth={2} />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>Disparador</Text>
                    <Text style={styles.statValue}>Autodesarrollo</Text>
                  </View>
                </View>

                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: `${colors.primary}20` }]}>
                    <Crown size={18} color={colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statLabel}>Nivel de Autoconfianza</Text>
                    <Text style={styles.statValue}>Por debajo del promedio</Text>
                  </View>
                </View>
              </View>

              {/* Decorative Logo */}
              <Image
                source={require("@/assets/images/logomain.png")}
                style={styles.resultsLogo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Action Button */}
            <Animated.View
              entering={FadeInDown.delay(400).duration(500)}
              style={styles.resultsButtonContainer}
            >
              <Pressable
                onPress={goToNextSlide}
                style={({ pressed }) => [
                  styles.resultsButton,
                  pressed && styles.resultsButtonPressed,
                ]}
              >
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.resultsButtonGradient}
                >
                  <Text style={styles.resultsButtonText}>Ver mi Proyección ✨</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </ScrollView>
        );

      case 12:
        return (
          <View style={styles.projectionSlide}>
            {/* Chart Component */}
            <SatisfactionChart />

            {/* Action Button */}
            <Animated.View
              entering={FadeInDown.delay(2500).duration(500)}
              style={styles.projectionButtonContainer}
            >
              <Pressable
                onPress={finishOnboarding}
                style={({ pressed }) => [
                  styles.resultsButton,
                  pressed && styles.resultsButtonPressed,
                ]}
              >
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.resultsButtonGradient}
                >
                  <Text style={styles.resultsButtonText}>Ver mi Plan Personalizado ✨</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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

      {/* Slide Content */}
      <View style={styles.slideContainer}>{renderSlide()}</View>

      {/* Navigation Buttons - Hidden for slides 7-11 */}
      {currentSlide < 7 && (
        <View style={styles.navigationContainer}>
          {currentSlide === 6 ? (
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
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonContent}
              >
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </LinearGradient>
            </Pressable>
        ) : currentSlide === 5 ? (
          <Pressable
            onPress={goToNextSlide}
            disabled={!overwhelmLevel}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || !overwhelmLevel) && styles.primaryButtonPressed,
            ]}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonContent}
            >
              <Text style={styles.primaryButtonText}>Continuar</Text>
            </LinearGradient>
          </Pressable>
        ) : currentSlide === 4 ? (
          <Pressable
            onPress={goToNextSlide}
            disabled={selectedDays.length === 0}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || selectedDays.length === 0) &&
                styles.primaryButtonPressed,
            ]}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonContent}
            >
              <Text style={styles.primaryButtonText}>Continuar</Text>
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
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonContent}
            >
              <Text style={styles.primaryButtonText}>
                {currentSlide === 0 ? "Comenzar" : "Continuar"}
              </Text>
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
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonContent: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.background,
    letterSpacing: 0.3,
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  agreementOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  agreementOptionText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
  },
  agreementOptionTextSelected: {
    color: colors.textPrimary,
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
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  resultsButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  resultsButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.background,
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
