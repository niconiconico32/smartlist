import { colors } from '@/constants/theme';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';

interface CoinsCounterProps {
  coins: number;
  size?: 'small' | 'large' | 'special';
  color?: string;
}

export function CoinsCounter({ coins, size = 'small', color }: CoinsCounterProps) {
  const animatedValue = useRef(new Animated.Value(coins)).current;
  const previousCoins = useRef(coins);
  const [displayCoins, setDisplayCoins] = React.useState(coins);

  useEffect(() => {
    // If coins increased, animate the number
    if (coins > previousCoins.current) {

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
      ]}
    >

      <Text
        style={[
          styles.coinsText,
          size === 'small' && styles.coinsTextSmall,
          size === 'large' && styles.coinsTextLarge,
          size === 'special' && styles.coinsTextSpecial,
          color ? { color } : undefined,
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
    paddingVertical: 3,
    gap: 4,
  },
  containerLarge: {
    paddingVertical: 4,
    gap: 6,
  },
  coinsText: {
    fontWeight: '800',
    color: colors.primary,
  },
  coinsTextSmall: {
    fontSize: 12,
  },
  coinsTextLarge: {
    fontSize: 14,
  },
  coinsTextSpecial: {
    fontSize: 12,
    fontWeight: '900',
  },
});
