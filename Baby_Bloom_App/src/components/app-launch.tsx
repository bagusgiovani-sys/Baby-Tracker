import { useEffect, useState, type ReactNode } from 'react';
import { LaunchTransition } from './launch-motion';
import { useStore } from '../lib/store';
export const INTRO_DURATION_MS = 2200;
export function AppLaunch({ children }: { children: ReactNode }) {
  const { ready, t } = useStore();
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <LaunchTransition
      visible={!elapsed || !ready}
      greeting={t('splash_greeting')}
      subtitle={t('splash_subtitle')}
    >
      {children}
    </LaunchTransition>
  );
}
