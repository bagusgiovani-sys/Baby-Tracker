import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { loadLogScreen } from '../../src/features/screen-loaders';
import { useStore } from '../../src/lib/store';
import { Loading, Screen, Copy } from '../../src/components/ui';
export default function AppLayout() {
  const { ready, session, baby, busy, error, t, online } = useStore();
  useEffect(() => {
    // Warm the essential editor after login so first-time offline entry is less
    // likely to require a new network download. Navigation never waits on this.
    if (ready && session && online) void loadLogScreen().catch(() => {});
  }, [ready, session, online]);
  if (!ready || (busy && !baby)) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (error && !baby)
    return (
      <Screen>
        <Copy>{t(error)}</Copy>
      </Screen>
    );
  if (!baby) return <Redirect href="/onboarding" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }} />;
}
