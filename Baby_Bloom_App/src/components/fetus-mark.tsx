import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '../lib/theme';
export function FetusMark({ size = 280 }: { size?: number }) {
  const theme = useTheme();
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 950, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 950, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return (
    <Animated.View
      accessible={false}
      style={{ width: size, height: size, transform: [{ scale: pulse }] }}
    >
      <View
        style={{
          position: 'absolute',
          inset: size * 0.08,
          borderWidth: 1,
          borderColor: theme.color.border,
          borderRadius: size,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.43,
          top: size * 0.23,
          width: size * 0.22,
          height: size * 0.22,
          borderRadius: size,
          backgroundColor: theme.color.brand,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.32,
          top: size * 0.45,
          width: size * 0.29,
          height: size * 0.29,
          borderWidth: size * 0.075,
          borderColor: theme.color.brand,
          borderRadius: size,
          transform: [{ rotate: '-30deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.5,
          top: size * 0.45,
          width: size * 0.19,
          height: size * 0.045,
          borderRadius: size,
          backgroundColor: theme.color.brand,
          transform: [{ rotate: '40deg' }],
        }}
      />
    </Animated.View>
  );
}
