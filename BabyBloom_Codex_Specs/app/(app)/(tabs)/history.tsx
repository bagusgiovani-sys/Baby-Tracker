import { useState } from 'react';
import { Button, Choice, Copy, Feedback, Field, Screen } from '../../../src/components/ui';
import { EventCard } from '../../../src/components/event-card';
import { useStore } from '../../../src/lib/store';
import { dayKey, dayRange } from '../../../src/domain/time';
export default function History() {
    const { t, baby, events, retry } = useStore();
    const [kind, setKind] = useState<string | null>('all');
    const [day, setDay] = useState(() => dayKey(new Date(), baby?.timezone ?? 'Asia/Jakarta'));
    let range: [
        number,
        number
    ] | null = null;
    try {
        range = dayRange(day, baby?.timezone ?? 'Asia/Jakarta');
    }
    catch { /* inline validation */ }
    const list = events.filter(e => (!e.deleted_at || e.sync_status !== 'synced') && (kind === 'all' || e.event_type === kind) && range && Date.parse(e.occurred_at) >= range[0] && Date.parse(e.occurred_at) < range[1]).sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
    return <Screen title={t('history')}><Field label={t('day_filter')} value={day} onChangeText={setDay}/>{!range && <Feedback message={t('invalid')}/>}<Choice label={t('filter')} value={kind} onChange={setKind} choices={(['all', 'feeding', 'diaper', 'sleep'] as const).map(value => ({ value, label: t(value) }))}/><Button title={t('retry')} secondary onPress={() => { void retry(); }}/>{list.length ? list.map(event => <EventCard key={event.id} event={event}/>) : <Copy>{t('empty')}</Copy>}</Screen>;
}
