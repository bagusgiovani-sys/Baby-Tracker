import { useContext, useEffect, useState, type ReactNode } from 'react';
import { Animated, Text, View } from 'react-native';
import { useTheme } from '../lib/theme';
import { MotionCycle } from './motion-context';

export type MotionSurfaceProps = {
  children: ReactNode;
  delay?: number;
  hover?: boolean;
  compact?: boolean;
  interactive?: boolean;
  reveal?: boolean;
};
export type MotionPageProps = { children: ReactNode; cycle: number };
export type SkeletonBlockProps = {
  width?: number | `${number}%`;
  height?: number;
  rounded?: boolean;
};
export type CareIconKind =
  | 'feeding'
  | 'diaper'
  | 'sleep'
  | 'today'
  | 'history'
  | 'growth'
  | 'development'
  | 'health';

const reduced = false;
export function MotionPage({ children, cycle }: MotionPageProps) {
  return (
    <MotionCycle.Provider value={cycle}>
      <MotionSurface reveal>{children}</MotionSurface>
    </MotionCycle.Provider>
  );
}
export function MotionSurface({ children, delay = 0, reveal = true }: MotionSurfaceProps) {
  const cycle = useContext(MotionCycle);
  const [progress] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced || !reveal) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 400,
      delay: delay * 1000,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [cycle, reveal, progress, delay]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
function Pulse({ children }: { children: ReactNode }) {
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) {
      scale.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 300, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(1500),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scale]);
  return (
    <Animated.View accessible={false} style={{ transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
}
export function AmbientBackground() {
  return null;
}
export function HeartMark({ size = 300 }: { size?: number }) {
  const theme = useTheme();
  return (
    <View
      accessible={false}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Pulse>
        <Text style={{ color: theme.color.brand, fontSize: size * 0.7, lineHeight: size }}>♥</Text>
      </Pulse>
    </View>
  );
}
const glyphs: Record<CareIconKind, string> = {
  feeding: '◒',
  diaper: '◇',
  sleep: '☾',
  today: '☀',
  history: '≡',
  growth: '↗',
  development: '♥',
  health: '♡',
};
export function CareIcon({
  kind,
  size = 30,
  color,
}: {
  kind: CareIconKind;
  size?: number;
  color?: string;
  active?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pulse>
      <Text accessible={false} style={{ color: color ?? theme.color.brand, fontSize: size }}>
        {glyphs[kind]}
      </Text>
    </Pulse>
  );
}
export function SkeletonBlock({
  width = '100%',
  height = 20,
  rounded = false,
}: SkeletonBlockProps) {
  const theme = useTheme();
  return (
    <View
      accessible={false}
      style={{
        width,
        height,
        borderRadius: rounded ? 18 : 6,
        backgroundColor: theme.color.elevated,
      }}
    />
  );
}
