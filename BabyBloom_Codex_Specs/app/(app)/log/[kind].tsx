import { useLocalSearchParams } from 'expo-router';
import { LogForm, ConflictView } from '../../../src/features/log-form';
import { useStore } from '../../../src/lib/store';
import { Copy, Screen } from '../../../src/components/ui';
export default function Log() {
    const { kind, id } = useLocalSearchParams<{
        kind: string;
        id?: string;
    }>();
    const { events, t } = useStore();
    if (kind !== 'feeding' && kind !== 'diaper' && kind !== 'sleep')
        return <Screen back><Copy>{t('invalid')}</Copy></Screen>;
    const existing = id ? events.find(e => e.id === id && e.event_type === kind) : undefined;
    if (id && !existing)
        return <Screen back><Copy>{t('not_recorded')}</Copy></Screen>;
    if (existing?.sync_status === 'conflict')
        return <ConflictView event={existing}/>;
    if (existing?.deleted_at)
        return <Screen back><Copy>{t('deleted_on_server')}</Copy></Screen>;
    return <LogForm key={existing?.id ?? kind} kind={kind} existing={existing}/>;
}
