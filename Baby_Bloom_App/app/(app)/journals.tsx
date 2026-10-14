import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Choice, Copy, Screen } from '../../src/components/ui';
import { EventCard } from '../../src/components/event-card';
import { useStore } from '../../src/lib/store';
export default function Journals() {
  const { t, baby, events } = useStore();
  const [kind, setKind] = useState<string | null>('meal');
  const list = events
    .filter(
      (e) =>
        !e.deleted_at &&
        (kind === 'meal'
          ? e.event_type === 'meal' || e.event_type === 'feeding'
          : e.event_type === 'diaper' && ['dirty', 'both'].includes(e.detail.diaper_kind)),
    )
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
  return (
    <Screen title={t(kind === 'meal' ? 'meal' : 'poop_journal')} back>
      <Choice
        label={t('filter')}
        value={kind}
        onChange={setKind}
        choices={[
          { value: 'meal', label: t('meal') },
          { value: 'diaper', label: t('poop_journal') },
        ]}
      />
      <Copy muted>{t(kind === 'meal' ? 'nutrition_hint' : 'poop_hint')}</Copy>
      <Button
        title={t('save')}
        disabled={!baby || baby.role === 'viewer'}
        onPress={() => router.push({ pathname: '/log/[kind]', params: { kind: kind ?? 'meal' } })}
      />
      {list.length ? (
        list.map((event) => <EventCard key={event.id} event={event} />)
      ) : (
        <Copy>{t('empty')}</Copy>
      )}
    </Screen>
  );
}
