import { useLocalSearchParams } from 'expo-router';
import { LogForm, ConflictView } from './log-form';
import { useStore } from '../lib/store';
import { Copy, Screen } from '../components/ui';
import { JournalForm } from './journal-form';
import { DailyCheckin } from './daily-checkin';
export default function Log() {
  const { kind, id } = useLocalSearchParams<{
    kind: string;
    id?: string;
  }>();
  const { events, t } = useStore();
  if (!['feeding', 'diaper', 'sleep', 'meal', 'measurement', 'checkin'].includes(kind))
    return (
      <Screen back>
        <Copy>{t('invalid')}</Copy>
      </Screen>
    );
  const existing = id ? events.find((e) => e.id === id && e.event_type === kind) : undefined;
  if (id && !existing)
    return (
      <Screen back>
        <Copy>{t('not_recorded')}</Copy>
      </Screen>
    );
  if (existing?.sync_status === 'conflict') return <ConflictView event={existing} />;
  if (existing?.deleted_at)
    return (
      <Screen back>
        <Copy>{t('deleted_on_server')}</Copy>
      </Screen>
    );
  if (kind === 'checkin')
    return (
      <Screen title={t('checkin')} back>
        <DailyCheckin record={existing} />
      </Screen>
    );
  if (kind === 'meal' || kind === 'measurement')
    return <JournalForm key={existing?.id ?? kind} kind={kind} existing={existing} />;
  return (
    <LogForm
      key={existing?.id ?? kind}
      kind={kind as 'feeding' | 'diaper' | 'sleep'}
      existing={existing}
    />
  );
}
