import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { FetusMark } from './fetus-mark';
import { MotionSurface } from './motion';
import { useTheme } from '../lib/theme';
export type LaunchTransitionProps = {
  visible: boolean;
  greeting: string;
  subtitle: string;
  children: ReactNode;
};
export function LaunchTransition({ visible, greeting, subtitle, children }: LaunchTransitionProps) {
  const theme = useTheme();
  if (!visible) return <View style={{ flex: 1 }}>{children}</View>;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={greeting}
      accessibilityState={{ busy: true }}
      accessible
      style={{
        flex: 1,
        backgroundColor: theme.color.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: 24,
      }}
    >
      <FetusMark />
      <MotionSurface>
        <Text
          style={{ textAlign: 'center', color: theme.color.ink, fontSize: 46, fontWeight: '800' }}
        >
          {greeting}
        </Text>
      </MotionSurface>
      <MotionSurface delay={0.3}>
        <Text style={{ textAlign: 'center', color: theme.color.muted, fontSize: 16 }}>
          {subtitle}
        </Text>
      </MotionSurface>
    </View>
  );
}
