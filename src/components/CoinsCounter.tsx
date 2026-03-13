import { colors } from '@/constants/theme';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface CoinsCounterProps {
  coins: number;
  size?: 'small' | 'large';
}

export function CoinsCounter({ coins, size = 'small' }: CoinsCounterProps) {
  const animatedValue = useRef(new Animated.Value(coins)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const previousCoins = useRef(coins);
  const [displayCoins, setDisplayCoins] = React.useState(coins);

  useEffect(() => {
    // Update display on mount
    setDisplayCoins(coins);
    
    // If coins increased, animate the number
    if (coins > previousCoins.current) {
      // Scale animation (bounce effect)
      Animated.sequence([
        Animated.spring(scaleValue, {
          toValue: 1.3,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Number count animation
      Animated.timing(animatedValue, {
        toValue: coins,
        duration: 800,
        useNativeDriver: false,
      }).start();
      
      // Listen to animation value changes
      const listener = animatedValue.addListener(({ value }) => {
        setDisplayCoins(Math.floor(value));
      });
      
      // Cleanup listener after animation
      setTimeout(() => {
        animatedValue.removeListener(listener);
        setDisplayCoins(coins);
      }, 850);
    } else if (coins < previousCoins.current) {
      // If coins decreased, just set the value
      animatedValue.setValue(coins);
      setDisplayCoins(coins);
    }

    previousCoins.current = coins;
  }, [coins]);

  const isSmall = size === 'small';

  return (
    <Animated.View
      style={[
        styles.container,
        isSmall ? styles.containerSmall : styles.containerLarge,
        { transform: [{ scale: scaleValue }] },
      ]}
    >
      
      <Text
        style={[
          styles.coinsText,
          isSmall ? styles.coinsTextSmall : styles.coinsTextLarge,
        ]}
      >
        {displayCoins}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerSmall: {
    paddingVertical: 6,
    gap: 4,
  },
  containerLarge: {
    paddingVertical: 8,
    gap: 6,
  },
  coinsText: {
    fontWeight: '800',
    color: colors.primary,
  },
  coinsTextSmall: {
    fontSize: 18,
  },
  coinsTextLarge: {
    fontSize: 18,
  },
});
