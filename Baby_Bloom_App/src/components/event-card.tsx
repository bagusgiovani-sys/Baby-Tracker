import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Copy, useUIStyles } from './ui';
import type { SavedEvent } from '../domain/events';
import { durationSeconds } from '../domain/events';
import { useStore } from '../lib/store';
import { timeLabel, dayKey } from '../domain/time';
import type { TextKey } from '../lib/i18n';
import { useTheme } from '../lib/theme';
export function EventDescription({ event }: { event: SavedEvent }) {
  const { t } = useStore();
  const timed =
    event.event_type === 'sleep' ||
    (event.event_type === 'feeding' && event.detail.feeding_kind === 'direct_breast');
  return (
    <View style={{ gap: 6 }}>
      <Copy>
        {event.event_type === 'feeding'
          ? t(event.detail.feeding_kind)
          : event.event_type === 'diaper'
            ? t(event.detail.diaper_kind)
            : event.event_type === 'sleep'
              ? t(event.detail.sleep_kind ?? 'unspecified')
              : event.event_type === 'meal'
                ? event.detail.food_name
                : t(event.event_type)}
      </Copy>
      {event.event_type === 'feeding' && event.detail.volume_consumed_ml !== null && (
        <Copy>
          {event.detail.volume_consumed_ml} {t('ml')}
        </Copy>
      )}
      {timed && (
        <Copy muted>
          {Math.round(durationSeconds(event, new Date()) / 60)} {t('minutes')}
          {!event.ended_at ? ' · ' + t('provisional') : ''}
        </Copy>
      )}
      {event.note && <Copy>{event.note}</Copy>}
      {event.event_type === 'diaper' && (
        <View style={{ gap: 6 }}>
          {(
            [
              'stool_color',
              'stool_consistency',
              'stool_amount',
              'blood_seen',
              'mucus_seen',
              'urine_unusual',
              'rash_present',
            ] as const
          )
            .filter((key) => event.detail[key] !== null)
            .map((key) => (
              <Copy key={key} muted>
                {t(key)}: {t(event.detail[key] as TextKey)}
              </Copy>
            ))}
        </View>
      )}
      {event.event_type === 'meal' && (
        <>
          <Copy>
            {t('portion_consumed')}: {event.detail.portion_consumed ?? t('not_recorded')}{' '}
            {t(event.detail.portion_unit)}
          </Copy>
          {event.detail.texture && (
            <Copy muted>
              {t('texture')}: {t(event.detail.texture)}
            </Copy>
          )}
          {event.detail.ingredients && (
            <Copy muted>
              {t('ingredients')}: {event.detail.ingredients}
            </Copy>
          )}
          {event.detail.reaction && (
            <Copy>
              {t('reaction')}: {t(event.detail.reaction)}
            </Copy>
          )}
          {event.detail.nutrition && (
            <Copy muted>
              {t('calories_kcal')}: {event.detail.nutrition.calories_kcal ?? t('not_recorded')} ·{' '}
              {t('protein_g')}: {event.detail.nutrition.protein_g ?? t('not_recorded')}
            </Copy>
          )}
        </>
      )}
      {event.event_type === 'measurement' && (
        <View>
          {(['weight_kg', 'length_cm', 'head_cm'] as const).map((key) => (
            <Copy key={key}>
              {t(key)}: {event.detail[key] ?? t('not_recorded')}
            </Copy>
          ))}
        </View>
      )}
      {event.event_type === 'checkin' && (
        <View>
          {(
            [
              'overall',
              'feeding_vs_usual',
              'wet_diapers_vs_usual',
              'sleep_concern',
              'new_symptoms',
            ] as const
          ).map((key) => (
            <Copy key={key}>
              {t(key)}: {t(event.detail[key])}
            </Copy>
          ))}
          {event.detail.parent_concern && <Copy>{event.detail.parent_concern}</Copy>}
        </View>
      )}
    </View>
  );
}
export function EventCard({ event, canEdit = true }: { event: SavedEvent; canEdit?: boolean }) {
  const styles = useUIStyles();
  const theme = useTheme();
  const { t, baby, locale, hour12, session, syncErrors } = useStore();
  if (!baby) return null;
  const status: TextKey = event.sync_status === 'error' ? 'sync_error' : event.sync_status;
  return (
    <Card>
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1, minWidth: 150, gap: 4 }}>
          <Text style={styles.label}>{t(event.event_type)}</Text>
          <Copy muted>
            {dayKey(new Date(event.occurred_at), baby.timezone)} ·{' '}
            {timeLabel(event.occurred_at, baby.timezone, locale, hour12)}
          </Copy>
        </View>
        <Text style={{ color: theme.color.muted, fontSize: 13 }}>{t(status)}</Text>
      </View>
      <EventDescription event={event} />
      {syncErrors[event.id] && <Copy>{t(syncErrors[event.id]!)}</Copy>}
      <Copy muted>
        {t('recorder')}: {event.recorded_by === session?.user.id ? t('you') : t('caregiver')}
      </Copy>
      {canEdit && baby.role !== 'viewer' && (
        <Button
          title={t(event.sync_status === 'conflict' ? 'conflict' : 'edit')}
          secondary
          onPress={() =>
            router.push({
              pathname: '/log/[kind]',
              params: { kind: event.event_type, id: event.id },
            })
          }
        />
      )}
    </Card>
  );
}
