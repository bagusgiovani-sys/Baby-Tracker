import { router } from 'expo-router';
import { Button, Copy, Screen } from '../../../src/components/ui';
import { EventCard } from '../../../src/components/event-card';
import { useStore } from '../../../src/lib/store';
export default function Growth() {
  const { baby, events, t } = useStore();
  const list = events
    .filter((e) => e.event_type === 'measurement' && !e.deleted_at)
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
  return (
    <Screen title={t('growth')}>
      <Copy muted>{t('measurement_hint')}</Copy>
      <Button
        title={t('measurement')}
        disabled={!baby || baby.role === 'viewer'}
        onPress={() => router.push({ pathname: '/log/[kind]', params: { kind: 'measurement' } })}
      />
      {list.length ? (
        list.map((e) => <EventCard key={e.id} event={e} />)
      ) : (
        <Copy>{t('empty')}</Copy>
      )}
    </Screen>
  );
}
