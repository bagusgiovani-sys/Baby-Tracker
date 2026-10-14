import { Component, Suspense, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { Button, Copy, Loading, Screen } from './ui';
import { useStore } from '../lib/store';

function LoadFailure() {
  const { t } = useStore();
  return (
    <Screen back>
      <Copy>{t('screen_load_failed')}</Copy>
      <Button
        title={t('retry')}
        onPress={() => {
          if (Platform.OS === 'web') window.location.reload();
          else router.replace('/today');
        }}
      />
    </Screen>
  );
}
class LoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <LoadFailure /> : this.props.children;
  }
}
export function DeferredScreen({
  children,
  form = false,
}: {
  children: ReactNode;
  form?: boolean;
}) {
  return (
    <LoadBoundary>
      <Suspense fallback={<Loading form={form} />}>{children}</Suspense>
    </LoadBoundary>
  );
}
