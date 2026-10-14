import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated } from 'react-native';

export type LanguageTransitionProps = { locale: string; children: ReactNode };

export function LanguageTransition({ locale, children }: LanguageTransitionProps) {
  const previousLocale = useRef(locale);
  const [progress] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (previousLocale.current === locale) return;
    previousLocale.current = locale;
    progress.stopAnimation();
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [locale, progress]);
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
