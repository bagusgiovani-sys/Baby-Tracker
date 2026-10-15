import { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Card,
  Choice,
  Copy,
  Feedback,
  Heading,
  Screen,
  useUIStyles,
  Eyebrow,
} from '../../../src/components/ui';
import { EventCard } from '../../../src/components/event-card';
import { CareIcon } from '../../../src/components/motion';
import { useStore } from '../../../src/lib/store';
import { summarize } from '../../../src/domain/totals';
import { ageOn, dayKey, dayRange } from '../../../src/domain/time';
import type { CareEvent } from '../../../src/domain/events';
import { useTheme } from '../../../src/lib/theme';
import { errorKey, type TextKey } from '../../../src/lib/i18n';
import { DailyCheckin } from '../../../src/features/daily-checkin';
export default function Today() {
  const styles = useUIStyles();
  const theme = useTheme();
  const store = useStore();
  const { t, baby, events, online, busy } = store;
  const { width } = useWindowDimensions();
  const [actionError, setActionError] = useState<TextKey | null>(null);
  const [rolling, setRolling] = useState<string | null>('calendar_day');
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  if (!baby) return null;
  const day = dayKey(now, baby.timezone);
  const range: [number, number] =
    rolling === 'rolling'
      ? [now.getTime() - 86400000, now.getTime()]
      : dayRange(day, baby.timezone);
  const age = ageOn(baby.date_of_birth, day);
  const totals = summarize(events, baby.id, range, now);
  const recent = events
    .filter(
      (e) =>
        !e.deleted_at &&
        Date.parse(e.occurred_at) >= now.getTime() - 86400000 &&
        Date.parse(e.occurred_at) <= now.getTime() + 300000,
    )
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
  const pending = events.filter((e) => e.sync_status !== 'synced').length;
  const active = events.filter(
    (e) =>
      !e.deleted_at &&
      !e.ended_at &&
      (e.event_type === 'sleep' ||
        (e.event_type === 'feeding' && e.detail.feeding_kind === 'direct_breast')),
  );
  const stop = async (id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    const {
      recorded_by: _r,
      server_version: _v,
      deleted_at: _d,
      sync_status: _s,
      ...payload
    } = event;
    await store.save({ ...payload, ended_at: new Date().toISOString() } as CareEvent, 'update');
  };
  const tiles = [
    {
      label: 'feeding' as const,
      value: totals.feeding_count,
      tint: theme.color.peach,
      icon: 'feeding' as const,
    },
    {
      label: 'wet_diapers' as const,
      value: totals.wet_count,
      tint: theme.color.blue,
      icon: 'diaper' as const,
    },
    {
      label: 'sleep' as const,
      value: totals.sleep_minutes === null ? null : +(totals.sleep_minutes / 60).toFixed(1),
      tint: theme.color.mint,
      icon: 'sleep' as const,
    },
    {
      label: 'dirty_diapers' as const,
      value: totals.dirty_count,
      tint: theme.color.paper,
      icon: 'diaper' as const,
    },
  ];
  return (
    <Screen>
      {actionError && <Feedback message={t(actionError)} />}
      <Card tint={theme.color.mint}>
        <Eyebrow>{t('your_day')}</Eyebrow>
        <Heading style={{ fontSize: width >= 900 ? 48 : 36, lineHeight: width >= 900 ? 58 : 44 }}>
          {baby.nickname}
        </Heading>
        <Copy muted>
          {age.months} {t('months')} · {age.days} {t('days')}
        </Copy>
        <Copy muted>
          {new Intl.DateTimeFormat(store.locale, {
            timeZone: baby.timezone,
            dateStyle: 'full',
          }).format(now)}{' '}
          · {baby.timezone}
        </Copy>
        <Copy muted>
          {busy ? t('syncing') : online ? t('online') : t('offline')}
          {pending ? ` · ${pending} ${t('queued')}` : ''}
        </Copy>
        <View style={styles.row}>
          <Button secondary title={t('home')} onPress={() => router.push('/home')} />
          <Button secondary title={t('view_profile')} onPress={() => router.push('/profile')} />
        </View>
      </Card>
      <Eyebrow>{t('care_overview')}</Eyebrow>
      <Choice
        label={t('based_on')}
        value={rolling}
        onChange={setRolling}
        choices={[
          { value: 'calendar_day', label: t('calendar_day') },
          { value: 'rolling', label: t('rolling') },
        ]}
      />
      <View style={styles.row}>
        {tiles.map((tile, index) => (
          <View key={tile.label} style={{ width: width >= 900 ? '23%' : '47%', flexGrow: 1 }}>
            <Card tint={tile.tint} delay={index * 0.07}>
              <CareIcon kind={tile.icon} />
              <Copy>{t(tile.label)}</Copy>
              <Text
                style={{
                  fontSize: tile.value === null ? 16 : 40,
                  fontWeight: '700',
                  color: theme.color.ink,
                }}
              >
                {tile.value === null ? t('not_recorded') : tile.value}
              </Text>
              <Copy muted>{tile.label === 'sleep' ? t('hours') : t('recorded')}</Copy>
            </Card>
          </View>
        ))}
      </View>
      {totals.provisional && <Copy muted>{t('provisional')}</Copy>}
      <View
        style={{ flexDirection: width >= 900 ? 'row' : 'column', gap: 24, alignItems: 'stretch' }}
      >
        <View style={{ flex: width >= 900 ? 0.9 : undefined, gap: 20 }}>
          <Card>
            <Eyebrow>{t('quick')}</Eyebrow>
            <Copy muted>{t('quick_description')}</Copy>
            {baby.role === 'viewer' ? (
              <Copy>{t('viewer')}</Copy>
            ) : (
              <View style={styles.row}>
                {(['feeding', 'diaper', 'sleep', 'meal'] as const).map((kind) => (
                  <View key={kind} style={{ flexGrow: 1, minWidth: 100 }}>
                    <Button
                      title={t(kind)}
                      onPress={() => router.push({ pathname: '/log/[kind]', params: { kind } })}
                    />
                  </View>
                ))}
              </View>
            )}
          </Card>
          {active.map((event) => (
            <Card key={event.id} tint={theme.color.mint}>
              <Copy>{t(event.event_type === 'sleep' ? 'active_sleep' : 'active_feed')}</Copy>
              <EventCard event={event} canEdit={false} />
              {baby.role !== 'viewer' && (
                <Button
                  title={t(event.event_type === 'sleep' ? 'wake' : 'end_feed')}
                  onPress={() => {
                    setActionError(null);
                    void stop(event.id).catch((error) => setActionError(errorKey(error)));
                  }}
                />
              )}
            </Card>
          ))}
          <Card>
            <Copy>
              {t('recorded_volume')}:{' '}
              {totals.bottle_consumed_ml === null
                ? t('not_recorded')
                : `${totals.bottle_consumed_ml} ${t('ml')}`}
            </Copy>
            {totals.missing_bottle_volume > 0 && (
              <Copy muted>
                {totals.missing_bottle_volume} {t('missing_volume')}
              </Copy>
            )}
            <Copy muted>{t('breast_note')}</Copy>
          </Card>
          <Button
            secondary
            title={t('meal') + ' / ' + t('poop_journal')}
            onPress={() => router.push('/journals')}
          />
          <Button secondary title={t('reports')} onPress={() => router.push('/reports')} />
          <DailyCheckin />
          <Copy muted>{t('disclaimer')}</Copy>
        </View>
        <View style={{ flex: width >= 900 ? 1.1 : undefined, gap: 16 }}>
          <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text accessibilityRole="header" style={styles.label}>
              {t('recent')}
            </Text>
            <Button title={t('view_all')} secondary onPress={() => router.push('/history')} />
          </View>
          {recent.length ? (
            recent.slice(0, 8).map((event) => <EventCard key={event.id} event={event} />)
          ) : (
            <Card>
              <Heading>{t('empty')}</Heading>
              <Copy muted>{t('empty_body')}</Copy>
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}
