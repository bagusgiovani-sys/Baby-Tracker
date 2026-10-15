import { Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Card,
  Copy,
  Eyebrow,
  Feedback,
  Heading,
  Screen,
  useUIStyles,
} from '../components/ui';
import { CareIcon } from '../components/motion';
import { BabyStats } from '../components/baby-stats';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { useBabyOverview } from '../lib/use-baby-overview';
import type { TextKey } from '../lib/i18n';

export default function Home() {
  const { baby, t, locale, online } = useStore();
  const theme = useTheme();
  const styles = useUIStyles();
  const overview = useBabyOverview();
  if (!baby || !overview) return null;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const care: {
    label: TextKey;
    value: number | null;
    icon: 'feeding' | 'diaper' | 'sleep';
    unit?: TextKey;
  }[] = [
    { label: 'feeding', value: overview.today.feeding_count, icon: 'feeding' },
    { label: 'wet_diapers', value: overview.today.wet_count, icon: 'diaper' },
    { label: 'dirty_diapers', value: overview.today.dirty_count, icon: 'diaper' },
    { label: 'meal', value: overview.mealsToday, icon: 'feeding' },
    {
      label: 'recorded_volume',
      value: overview.today.bottle_consumed_ml,
      icon: 'feeding',
      unit: 'ml',
    },
    {
      label: 'sleep',
      value: overview.today.sleep_minutes === null ? null : overview.today.sleep_minutes / 60,
      icon: 'sleep',
      unit: 'hours',
    },
  ];
  return (
    <Screen>
      <Card tint={theme.color.mint}>
        <Eyebrow>{t('baby_dashboard')}</Eyebrow>
        <Heading style={{ fontSize: 40, lineHeight: 48 }}>{baby.nickname}</Heading>
        <Copy>{t('dashboard_intro')}</Copy>
        <Copy muted>
          {overview.age.months} {t('months')} · {overview.age.days} {t('days')} ·{' '}
          {t(online ? 'online' : 'offline')}
        </Copy>
        {overview.correctedDays !== null && (
          <Copy muted>
            {t('corrected_age_days')}: {overview.correctedDays}
          </Copy>
        )}
        <View style={styles.row}>
          <Button title={t('view_today')} onPress={() => router.push('/today')} />
          <Button secondary title={t('view_profile')} onPress={() => router.push('/profile')} />
        </View>
      </Card>
      {overview.conflicts > 0 && <Feedback message={t('dashboard_conflicts')} />}
      {overview.pending > 0 && (
        <Copy muted>
          {overview.pending} {t('not_synced')}
        </Copy>
      )}
      <BabyStats baby={baby} overview={overview} />
      <Eyebrow>{t('today_snapshot')}</Eyebrow>
      <Copy muted>
        {overview.day} · {baby.timezone}
      </Copy>
      <View style={styles.row}>
        {care.map((tile, index) => (
          <View key={tile.label} style={{ flexBasis: 150, flexGrow: 1 }}>
            <Card delay={index * 0.06}>
              <CareIcon kind={tile.icon} />
              <Copy muted>{t(tile.label)}</Copy>
              <Text
                style={{
                  fontSize: tile.value === null ? 16 : 34,
                  fontWeight: '800',
                  color: theme.color.ink,
                }}
              >
                {tile.value === null ? t('not_recorded') : number.format(tile.value)}
              </Text>
              <Copy muted>{t(tile.unit ?? 'recorded')}</Copy>
            </Card>
          </View>
        ))}
      </View>
      <Copy muted>{t('snapshot_help')}</Copy>
      {overview.today.provisional && <Copy muted>{t('provisional')}</Copy>}
      <Card>
        <Heading>{t('week_snapshot')}</Heading>
        <Copy muted>
          {overview.report.startDay} — {overview.day}
        </Copy>
        <View style={styles.row}>
          {(['calories_kcal', 'protein_g', 'iron_mg'] as const).map((key) => (
            <View key={key} style={{ flexGrow: 1, flexBasis: 180, gap: 8 }}>
              <Copy muted>{t(key)}</Copy>
              <Heading>
                {overview.report.totals[key].total === null
                  ? t('not_recorded')
                  : number.format(overview.report.totals[key].total!)}
              </Heading>
              <Copy muted>
                {overview.report.totals[key].knownPortions} / {overview.report.coverage.portions}{' '}
                {t('recorded')}
              </Copy>
            </View>
          ))}
        </View>
        <Copy muted>{t('week_snapshot_help')}</Copy>
        <Button secondary title={t('reports')} onPress={() => router.push('/reports')} />
      </Card>
      <Card>
        <Eyebrow>{t('data_completeness')}</Eyebrow>
        <Copy>
          {t('logged_days')}: {overview.report.coverage.loggedDays} / 7
        </Copy>
        <Copy>
          {t('nutrition_entries')}: {overview.report.coverage.nutritionCount} /{' '}
          {overview.report.coverage.portions}
        </Copy>
        <Copy>
          {t(
            overview.checkin === 'completed'
              ? 'checkin_done'
              : overview.checkin === 'draft'
                ? 'checkin_draft'
                : 'checkin_missing',
          )}
        </Copy>
        <Button
          secondary
          title={t('meal') + ' / ' + t('poop_journal')}
          onPress={() => router.push('/journals')}
        />
      </Card>
    </Screen>
  );
}
