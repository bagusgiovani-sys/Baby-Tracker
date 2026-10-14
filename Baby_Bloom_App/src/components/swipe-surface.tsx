import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { Animated, PanResponder } from 'react-native';
import { useTheme } from '../lib/theme';
export function SwipeSurface({
  children,
  index,
  onNext,
  onPrevious,
}: {
  children: ReactNode;
  index: number;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const theme = useTheme();
  const [float] = useState(() => new Animated.Value(0));
  const [x] = useState(() => new Animated.Value(0));
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => x.setValue(g.dx * 0.5),
        onPanResponderRelease: (_, g) => {
          Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
          if (g.dx < -65) onNext();
          else if (g.dx > 65) onPrevious();
        },
      }),
    [x, onNext, onPrevious],
  );
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -7, duration: 1800, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);
  useEffect(() => {
    x.setValue(35);
    Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
  }, [index, x]);
  return (
    <Animated.View
      {...pan.panHandlers}
      style={{
        padding: 24,
        gap: 16,
        marginVertical: 12,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: theme.color.border,
        backgroundColor: theme.color.paper,
        transform: [{ translateX: x }, { translateY: float }],
      }}
    >
      {children}
    </Animated.View>
  );
}
