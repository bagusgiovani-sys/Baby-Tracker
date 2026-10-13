import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Copy, styles } from './ui';
import type { SavedEvent } from '../domain/events';
import { durationSeconds } from '../domain/events';
import { useStore } from '../lib/store';
import { timeLabel, dayKey } from '../domain/time';
import type { TextKey } from '../lib/i18n';
import { theme } from '../lib/theme';
export function EventDescription({ event }: {
    event: SavedEvent;
}) {
    const { t } = useStore();
    const timed = event.event_type === 'sleep' || (event.event_type === 'feeding' && event.detail.feeding_kind === 'direct_breast');
    return <View style={{ gap: 6 }}><Copy>{event.event_type === 'feeding' ? t(event.detail.feeding_kind) : event.event_type === 'diaper' ? t(event.detail.diaper_kind) : t(event.detail.sleep_kind ?? 'unspecified')}</Copy>{event.event_type === 'feeding' && event.detail.volume_consumed_ml !== null && <Copy>{event.detail.volume_consumed_ml} {t('ml')}</Copy>}{timed && <Copy muted>{Math.round(durationSeconds(event, new Date()) / 60)} {t('minutes')}{!event.ended_at ? ' · ' + t('provisional') : ''}</Copy>}{event.note && <Copy>{event.note}</Copy>}</View>;
}
export function EventCard({ event, canEdit = true }: {
    event: SavedEvent;
    canEdit?: boolean;
}) {
    const { t, baby, locale, hour12, session, syncErrors } = useStore();
    if (!baby)
        return null;
    const status: TextKey = event.sync_status === 'error' ? 'sync_error' : event.sync_status;
    return <Card><View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}><View style={{ flex: 1, minWidth: 150, gap: 4 }}><Text style={styles.label}>{t(event.event_type)}</Text><Copy muted>{dayKey(new Date(event.occurred_at), baby.timezone)} · {timeLabel(event.occurred_at, baby.timezone, locale, hour12)}</Copy></View><Text style={{ color: theme.color.muted, fontSize: 13 }}>{t(status)}</Text></View><EventDescription event={event}/>{syncErrors[event.id] && <Copy>{t(syncErrors[event.id]!)}</Copy>}<Copy muted>{t('recorder')}: {event.recorded_by === session?.user.id ? t('you') : t('caregiver')}</Copy>{canEdit && baby.role !== 'viewer' && <Button title={t(event.sync_status === 'conflict' ? 'conflict' : 'edit')} secondary onPress={() => router.push({ pathname: '/log/[kind]', params: { kind: event.event_type, id: event.id } })}/>}</Card>;
}
