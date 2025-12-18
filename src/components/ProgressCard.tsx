import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProgressCardProps {
  completedToday: number;
  totalToday: number;
}

export function ProgressCard({ completedToday, totalToday }: ProgressCardProps) {
  const percentage = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  const progress = useSharedValue(0);
  const wave1X = useSharedValue(0);
  const wave2X = useSharedValue(0);
  const wave3X = useSharedValue(0);

  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cardWidth = SCREEN_WIDTH - 32; // Asumiendo padding de 16 a cada lado

  useEffect(() => {
    progress.value = withTiming(percentage / 100, { duration: 1000 });
    
    // Animar las ondas con diferentes velocidades
    wave1X.value = withRepeat(
      withTiming(cardWidth, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
    wave2X.value = withRepeat(
      withTiming(cardWidth, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );
    wave3X.value = withRepeat(
      withTiming(cardWidth, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - progress.value * circumference;
    return {
      strokeDashoffset,
    };
  });

  const createWavePath = (offsetY: number, translateX: number) => {
    'worklet';
    const waveWidth = cardWidth * 0.5;
    const amplitude = 20;
    
    let path = `M ${-cardWidth + translateX} ${offsetY}`;
    
    for (let i = 0; i < 4; i++) {
      const x1 = -cardWidth + translateX + (i * waveWidth);
      const x2 = -cardWidth + translateX + ((i + 0.8) * waveWidth);
      const x3 = -cardWidth + translateX + ((i + 1.2) * waveWidth);
      
      const y1 = offsetY - amplitude;
      const y2 = offsetY;
      
      path += ` Q ${x2} ${y1}, ${x3} ${y2}`;
    }
    
    path += ` L ${cardWidth * 2} 200 L ${-cardWidth} 200 Z`;
    return path;
  };

  const animatedWave1Props = useAnimatedProps(() => ({
    d: createWavePath(50, wave1X.value),
  }));

  const animatedWave2Props = useAnimatedProps(() => ({
    d: createWavePath(45, wave2X.value),
  }));

  const animatedWave3Props = useAnimatedProps(() => ({
    d: createWavePath(60, wave3X.value),
  }));

  return (
    <View style={styles.container}>
      {/* Waves Background */}
      <View style={styles.wavesContainer}>
        <Svg height="150" width="100%" viewBox={`0 0 ${cardWidth} 150`} style={styles.svg}>
          <AnimatedPath animatedProps={animatedWave1Props} fill="rgba(168, 123, 255, 0.4)" />
          <AnimatedPath animatedProps={animatedWave2Props} fill="rgba(168, 123, 255, 0.3)" />
          <AnimatedPath animatedProps={animatedWave3Props} fill="rgba(168, 123, 255, 0.2)" />
        </Svg>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Mi plan{'\n'}para hoy</Text>
        
        <View style={styles.progressContainer}>
          <Svg width={size} height={size}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#FFFFFF"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <View style={styles.percentageContainer}>
            <Text style={styles.percentage}>{percentage}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8B5CF6',
    borderRadius: 24,
    padding: 20,
    paddingVertical: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  wavesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  svg: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
});
