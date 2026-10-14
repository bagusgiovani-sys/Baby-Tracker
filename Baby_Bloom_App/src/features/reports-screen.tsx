import { useRef, useState } from 'react';
import { Pressable, View, Linking } from 'react-native';
import {
  Button,
  Card,
  Choice,
  Copy,
  Feedback,
  Field,
  Heading,
  Screen,
  styles,
  SkeletonContent,
} from '../components/ui';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { dayKey } from '../domain/time';
import { buildReport, type DiaryReport, type InsightCode } from '../domain/reports';
import { nutrientKeys } from '../domain/journal';
import { errorKey, type TextKey } from '../lib/i18n';
import { exportReport } from './report-export';
const labels: Record<InsightCode, TextKey> = {
  missing_nutrition: 'insight_missing',
  breast_unquantified: 'insight_breast',
  sparse_days: 'insight_sparse',
  premature_context: 'insight_premature',
  measurement_missing: 'insight_measure',
  review_sources: 'insight_review',
  observations_review: 'insight_observations',
};
export default function Reports() {
  const { t, baby, events, session, online } = useStore();
  const theme = useTheme();
  const [days, setDays] = useState<7 | 30>(7);
  const [end, setEnd] = useState(() => dayKey(new Date(), baby?.timezone ?? 'Asia/Jakarta'));
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<TextKey | null>(null);
  const [insights, setInsights] = useState<{ codes: InsightCode[]; key: string } | null>(null);
  if (!baby) return null;
  let report: DiaryReport | null = null;
  try {
    report = buildReport(events, baby, end, days);
  } catch {
    /* date validation displayed */
  }
  const currentKey =
    baby.id +
    days +
    end +
    events
      .filter((e) => e.sync_status === 'synced')
      .map((e) => e.id + e.server_version)
      .join();
  const ai = async () => {
    if (!report || !session || !consent || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    const key = currentKey;
    try {
      if (report.pending || report.conflicts || !online) throw new Error('ai_requires_sync');
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.access_token,
        },
        body: JSON.stringify({ babyId: baby.id, days, endDay: end, consent: true }),
        signal: AbortSignal.timeout(45000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'error');
      if (
        !Array.isArray(body.insights) ||
        !body.insights.every((code: unknown) => typeof code === 'string' && code in labels)
      )
        throw new Error('error');
      setInsights({ codes: body.insights, key });
    } catch (e) {
      setError(errorKey(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen title={t('reports')} back>
      <Choice
        label={t('report_window')}
        value={String(days)}
        onChange={(v) => {
          setDays(v === '30' ? 30 : 7);
          setError(null);
        }}
        choices={[
          { value: '7', label: t('seven_days') },
          { value: '30', label: t('thirty_days') },
        ]}
      />
      <Field label={t('report_end')} value={end} onChangeText={setEnd} />
      {!report ? (
        <Feedback message={t('invalid')} />
      ) : (
        <>
          <Card>
            <Heading>{t('known_totals')}</Heading>
            <Copy muted>
              {report.startDay} — {report.endDay}
            </Copy>
            <View style={styles.row}>
              {nutrientKeys.map((key) => (
                <View
                  key={key}
                  style={{
                    flexBasis: 200,
                    flexGrow: 1,
                    gap: 8,
                    padding: 16,
                    borderRadius: 18,
                    backgroundColor: theme.color.elevated,
                  }}
                >
                  <Copy muted>{t(key)}</Copy>
                  <Heading>{report.totals[key].total ?? t('not_recorded')}</Heading>
                  <Copy muted>
                    {report.totals[key].knownPortions} / {report.coverage.portions} {t('recorded')}
                  </Copy>
                </View>
              ))}
            </View>
            <Copy muted>{t('report_limits')}</Copy>
          </Card>
          <Card>
            <Heading>{t('report_coverage')}</Heading>
            {report.conflicts > 0 && <Feedback message={t('report_conflicts')} />}
            <Copy>
              {t('logged_days')}: {report.coverage.loggedDays} / {days}
            </Copy>
            <Copy>
              {t('nutrition_entries')}: {report.coverage.nutritionCount} /{' '}
              {report.coverage.portions}
            </Copy>
            <Copy>
              {t('unquantified')}: {report.coverage.unquantified}
            </Copy>
            {report.pending > 0 && (
              <Copy>
                {report.pending} {t('not_synced')}
              </Copy>
            )}
          </Card>
          <Card>
            <Heading>{t('care_overview')}</Heading>
            <Copy>
              {t('feeding')}: {report.care.feeding_count ?? t('not_recorded')}
            </Copy>
            <Copy>
              {t('wet_diapers')}: {report.care.wet_count ?? t('not_recorded')}
            </Copy>
            <Copy>
              {t('dirty_diapers')}: {report.care.dirty_count ?? t('not_recorded')}
            </Copy>
            <Copy>
              {t('sleep')}:{' '}
              {report.care.sleep_minutes === null
                ? t('not_recorded')
                : Math.round(report.care.sleep_minutes)}{' '}
              {t('minutes')}
            </Copy>
            {report.care.provisional && <Copy muted>{t('provisional')}</Copy>}
          </Card>
          <Card>
            <Heading>{t('calories_chart')}</Heading>
            {report.daily.map((d) => (
              <View key={d.day} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Copy muted style={{ width: 56, fontSize: 12 }}>
                  {d.day.slice(5)}
                </Copy>
                <View
                  style={{
                    flex: 1,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: theme.color.elevated,
                  }}
                >
                  {d.calories !== null && (
                    <View
                      style={{
                        height: 14,
                        borderRadius: 7,
                        width: `${Math.max(1, (d.calories / Math.max(1, ...report!.daily.map((v) => v.calories ?? 0))) * 100)}%`,
                        backgroundColor: theme.color.brand,
                      }}
                    />
                  )}
                </View>
                <Copy muted style={{ width: 110, fontSize: 12 }}>
                  {d.calories ?? t('not_recorded')}
                </Copy>
              </View>
            ))}
          </Card>
          <Card>
            <Heading>{t('adequacy_unknown')}</Heading>
            <Copy>
              {t('age_days')}: {report.context.chronologicalDays}
            </Copy>
            {report.context.correctedDays !== null && (
              <>
                <Copy>
                  {t('corrected_age_days')}: {report.context.correctedDays}
                </Copy>
                <Copy muted>{t('corrected_age_note')}</Copy>
              </>
            )}
            <Copy>{t('latest_measurement')}</Copy>
            {report.context.measurement ? (
              (['weight_kg', 'length_cm', 'head_cm'] as const).map((key) => (
                <Copy key={key}>
                  {t(key)}: {report!.context.measurement![key] ?? t('not_recorded')}
                </Copy>
              ))
            ) : (
              <Copy muted>{t('not_recorded')}</Copy>
            )}
            <Copy muted>{t('adequacy_body')}</Copy>
            <Button
              secondary
              title={t('source_nutrition')}
              onPress={() =>
                void Linking.openURL(
                  'https://www.cdc.gov/infant-toddler-nutrition/faqs/index.html',
                ).catch(() => setError('error'))
              }
            />
            <Button
              secondary
              title={t('source_corrected_age')}
              onPress={() =>
                void Linking.openURL(
                  'https://www.healthychildren.org/English/ages-stages/baby/preemie/Pages/Corrected-Age-For-Preemies.aspx',
                ).catch(() => setError('error'))
              }
            />
          </Card>
          <Button
            secondary
            title={t('export_report')}
            onPress={() => void exportReport(report!, t).catch((e) => setError(errorKey(e)))}
          />
          <Card>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={t('ai_consent')}
              accessibilityState={{ checked: consent }}
              onPress={() => setConsent(!consent)}
            >
              <Copy>
                {consent ? '☑' : '☐'} {t('ai_consent')}
              </Copy>
            </Pressable>
            <Button
              title={t(busy ? 'ai_pending' : 'ai_report')}
              disabled={
                !consent ||
                busy ||
                !session ||
                !online ||
                report.pending > 0 ||
                report.conflicts > 0
              }
              onPress={() => void ai()}
            />
            {busy && <SkeletonContent />}
            {insights?.key === currentKey && (
              <>
                <Heading>{t('ai_heading')}</Heading>
                {insights.codes.map((code) => (
                  <Copy key={code}>{t(labels[code])}</Copy>
                ))}
              </>
            )}
          </Card>
        </>
      )}
      {error && <Feedback message={t(error)} />}
    </Screen>
  );
}
