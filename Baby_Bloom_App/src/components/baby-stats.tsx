import { useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Choice, Copy, Eyebrow, Feedback, Heading, useUIStyles } from './ui';
import { MeasurementTrend } from './measurement-trend';
import {
  measurementMetrics,
  type MeasurementMetric,
  type babyOverview,
} from '../domain/baby-overview';
import type { Baby } from '../domain/events';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

export function BabyStats({
  baby,
  overview,
}: {
  baby: Baby;
  overview: ReturnType<typeof babyOverview>;
}) {
  const { t, locale } = useStore();
  const theme = useTheme();
  const styles = useUIStyles();
  const [metric, setMetric] = useState<MeasurementMetric>('weight_kg');
  const [sourceFailed, setSourceFailed] = useState(false);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 });
  const date = new Intl.DateTimeFormat(locale, { timeZone: baby.timezone, dateStyle: 'medium' });
  const points = overview.series[metric].slice(-12);
  const anyMeasurements = measurementMetrics.some((key) => overview.latest[key] !== null);
  return (
    <View style={{ gap: 20 }}>
      <Eyebrow>{t('recorded_measurements')}</Eyebrow>
      <View style={styles.row}>
        {measurementMetrics.map((key, index) => {
          const point = overview.latest[key];
          return (
            <View key={key} style={{ flexGrow: 1, flexBasis: 145 }}>
              <Card delay={index * 0.07}>
                <Copy muted>{t(key)}</Copy>
                <Heading style={{ color: point ? theme.color.accentInk : theme.color.ink }}>
                  {point ? number.format(point.value) : t('not_recorded')}
                </Heading>
                {point && (
                  <>
                    <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                      {t('measurement_date')}: {date.format(new Date(point.at))}
                    </Copy>
                    <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
                      {t(point.syncStatus === 'synced' ? 'synced_record' : 'pending_record')}
                    </Copy>
                  </>
                )}
              </Card>
            </View>
          );
        })}
      </View>
      {!anyMeasurements && (
        <Card>
          <Heading>{t('no_measurements_title')}</Heading>
          <Copy muted>{t('no_measurements_help')}</Copy>
        </Card>
      )}
      <Card>
        <Heading>{t('weight_trend')}</Heading>
        <Choice
          label={t('trend_metric')}
          value={metric}
          onChange={(value) => {
            if (measurementMetrics.includes(value as MeasurementMetric))
              setMetric(value as MeasurementMetric);
          }}
          choices={measurementMetrics.map((key) => ({ value: key, label: t(key) }))}
        />
        {points.length ? (
          <MeasurementTrend
            points={points}
            label={t(metric)}
            locale={locale}
            timezone={baby.timezone}
          />
        ) : (
          <Copy muted>{t('trend_empty')}</Copy>
        )}
        <Copy muted>{t('trend_note')}</Copy>
        <Copy muted>{t('weight_change')}</Copy>
        <Heading>
          {overview.weightChange === null
            ? t('not_recorded')
            : `${overview.weightChange > 0 ? '+' : ''}${number.format(overview.weightChange)} kg`}
        </Heading>
        <Copy muted>
          {t(overview.weightChange === null ? 'two_weights_needed' : 'change_between_readings')}
        </Copy>
        {overview.previousWeight && overview.weightChange !== null && (
          <Copy muted>
            {date.format(new Date(overview.previousWeight.at))} —{' '}
            {date.format(new Date(overview.latest.weight_kg!.at))}
          </Copy>
        )}
        {overview.weightChange !== null && overview.weightChange < 0 && (
          <>
            <Feedback message={t('weight_lower_recorded')} />
            <Copy>{t('weight_lower_help')}</Copy>
          </>
        )}
      </Card>
      <View style={styles.row}>
        <Button
          title={t('add_measurement')}
          disabled={baby.role === 'viewer'}
          onPress={() => router.push({ pathname: '/log/[kind]', params: { kind: 'measurement' } })}
        />
        <Button secondary title={t('view_growth')} onPress={() => router.push('/growth')} />
      </View>
      <Card>
        <Eyebrow>{t('growth_status')}</Eyebrow>
        <Heading>{t('growth_not_assessed')}</Heading>
        <Copy muted>{t('growth_status_help')}</Copy>
        {overview.premature && <Copy muted>{t('insight_premature')}</Copy>}
        <Button
          secondary
          title={t('growth_source')}
          onPress={() => {
            setSourceFailed(false);
            void Linking.openURL('https://www.who.int/tools/child-growth-standards').catch(() =>
              setSourceFailed(true),
            );
          }}
        />
        {sourceFailed && <Feedback message={t('error')} />}
      </Card>
    </View>
  );
}
