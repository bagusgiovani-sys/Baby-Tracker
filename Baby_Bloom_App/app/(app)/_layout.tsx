import { Redirect, Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { loadLogScreen } from '../../src/features/screen-loaders';
import { useStore } from '../../src/lib/store';
import { Button, Card, Loading, Screen, Copy, Heading, Feedback } from '../../src/components/ui';
export default function AppLayout() {
  const { ready, profilesReady, session, baby, busy, error, t, online, retry } = useStore();
  const [retryFailed, setRetryFailed] = useState(false);
  useEffect(() => {
    // Warm the essential editor after login so first-time offline entry is less
    // likely to require a new network download. Navigation never waits on this.
    if (ready && session && online) void loadLogScreen().catch(() => {});
  }, [ready, session, online]);
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (error && !baby)
    return (
      <Screen showStoreError={false}>
        <Card>
          <Heading>{t('diary_load_failed')}</Heading>
          <Copy>{t('diary_load_help')}</Copy>
          <Feedback message={t(error)} />
          {retryFailed && <Feedback message={t('error')} />}
          <Button
            title={t(busy ? 'loading' : 'retry')}
            disabled={busy}
            onPress={() => {
              setRetryFailed(false);
              void retry().catch(() => setRetryFailed(true));
            }}
          />
          <Button
            secondary
            title={t('back_to_welcome')}
            onPress={() => router.replace('/welcome')}
          />
        </Card>
      </Screen>
    );
  if (!baby && (!profilesReady || busy)) return <Loading />;
  if (!baby) return <Redirect href="/onboarding" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }} />;
}
