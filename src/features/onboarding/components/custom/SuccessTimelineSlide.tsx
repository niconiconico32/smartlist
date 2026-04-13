import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Flame, Sparkles } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

// ============================================
// TIMELINE NODE (internal)
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
}) => {
  const glowOpacity = useSharedValue(0.3);
  const nodeScale = useSharedValue(0);

  useEffect(() => {
    nodeScale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
    if (isFirst) {
      glowOpacity.value = withDelay(
        delay + 300,
        withRepeat(
          withSequence(withTiming(1, { duration: 1200 }), withTiming(0.4, { duration: 1200 })),
          -1,
          true,
        ),
      );
    }
  }, []);

  const nodeStyle = useAnimatedStyle(() => ({ transform: [{ scale: nodeScale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <Animated.View style={[s.nodeContainer, nodeStyle]}>
      {isFirst && (
        <Animated.View style={[s.nodeGlow, { backgroundColor: glowColor }, glowStyle]} />
      )}
      <View style={[s.nodeCircle, { borderColor: color }]}>
        <LinearGradient colors={[color, glowColor]} style={s.nodeGradient}>
          {icon}
        </LinearGradient>
      </View>
      <View style={s.nodeContent}>
        <Text style={[s.nodeDay, { color }]}>{day}</Text>
        <Text style={s.nodeTitle}>{title}</Text>
        <Text style={s.nodeDescription}>{description}</Text>
      </View>
    </Animated.View>
  );
};

// ============================================
// SUCCESS TIMELINE SLIDE
// ============================================
interface Props {
  onNext: () => void;
}

const SuccessTimelineSlide: React.FC<Props> = ({ onNext }) => {
  const mascotY = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({ transform: [{ translateY: mascotY.value }] }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
  };
  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  return (
    <LinearGradient colors={[colors.background, '#16213E']} style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={s.title}>
          Tu Cronología de Éxito
        </Animated.Text>

        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={s.subtitle}>
          No es magia. Es neurociencia aplicada a tus tiempos.
        </Animated.Text>

        <View style={s.timelineContainer}>
          <View style={s.pathContainer}>
            <LinearGradient
              colors={[colors.textPrimary, '#FAB387', '#CBA6F7']}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={s.pathLine}
            />
            <Animated.View style={s.pathGlow} />
          </View>

          <Animated.View style={[s.mascotContainer, mascotStyle]}>
            <View style={s.speechBubble}>
              <Text style={s.speechBubbleText}>
                ¡Tu nuevo yo está más cerca de lo que crees!
              </Text>
              <View style={s.speechBubbleArrow} />
            </View>
            <Image
              source={require('@/assets/images/logomain.png')}
              style={s.mascot}
              resizeMode="contain"
            />
          </Animated.View>

          <View style={s.nodesContainer}>
            <TimelineNode
              day="Día 30"
              title="Control Total"
              description="La procrastinación ya no es tu jefe. Tú mandas."
              color="#CBA6F7"
              glowColor="#9D4EDD"
              icon={<Crown size={20} color={colors.textPrimary} strokeWidth={2} />}
              delay={1800}
              isLast
            />
            <TimelineNode
              day="Día 7"
              title="Inercia Positiva"
              description="Tus primeras rachas se sienten naturales, no forzadas."
              color="#FAB387"
              glowColor="#FF8C42"
              icon={<Flame size={20} color={colors.textPrimary} strokeWidth={2} />}
              delay={1200}
            />
            <TimelineNode
              day="Día 1 (Hoy)"
              title="Alivio Mental"
              description="Dejas de guardar todo en tu cabeza. Tu ansiedad baja hoy mismo."
              color={colors.textPrimary}
              glowColor="#A6E3A1"
              icon={<Sparkles size={20} color={colors.background} strokeWidth={2} />}
              delay={600}
              isFirst
            />
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(2200).duration(500)} style={s.buttonContainer}>
          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onNext();
              }}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              style={primaryButtonStyles}
            >
              <LinearGradient
                colors={PRIMARY_GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={primaryButtonGradient}
              >
                <Text style={primaryButtonText}>Ver mi Regalo de Bienvenida</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
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
  pathLine: { flex: 1, borderRadius: 3 },
  pathGlow: {
    position: 'absolute',
    top: 0,
    left: -4,
    right: -4,
    bottom: 0,
    backgroundColor: `${colors.textPrimary}26`,
    borderRadius: 8,
  },
  mascotContainer: {
    position: 'absolute',
    right: 0,
    bottom: -10,
    display: 'flex',
    flexDirection: 'row',
  },
  mascot: { width: 60, height: 60 },
  speechBubble: {
    backgroundColor: `${colors.textPrimary}F2`,
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
    color: colors.background,
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
    borderLeftColor: `${colors.textPrimary}F2`,
  },
  nodesContainer: { paddingLeft: 0, gap: 24 },
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
    backgroundColor: `${colors.background}CC`,
  },
  nodeGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nodeContent: { flex: 1, marginLeft: 16, paddingTop: 4 },
  nodeDay: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  nodeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  nodeDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  buttonContainer: { marginTop: 8 },
});

export default SuccessTimelineSlide;
