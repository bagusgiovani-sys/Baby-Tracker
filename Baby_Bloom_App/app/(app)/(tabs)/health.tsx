import { router } from 'expo-router';
import { Button, Card, Copy, Screen } from '../../../src/components/ui';
import { useStore } from '../../../src/lib/store';
export default function Health() {
  const { t } = useStore();
  return (
    <Screen title={t('health')}>
      <Card>
        <Copy>{t('health_pending')}</Copy>
        <Copy muted>{t('review_pending')}</Copy>
        <Button title={t('safety')} secondary onPress={() => router.push('/safety')} />
      </Card>
      <Copy>{t('disclaimer')}</Copy>
    </Screen>
  );
}
