import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { ZodError } from 'zod';
import {
  Button,
  Card,
  Choice,
  ConfirmAction,
  Copy,
  Feedback,
  Field,
  Screen,
  styles,
} from '../components/ui';
import { EventDescription } from '../components/event-card';
import { TimestampField } from '../components/timestamp-field';
import { useStore } from '../lib/store';
import {
  consistencies,
  diaperKinds,
  feedingKinds,
  observations,
  sides,
  stoolColors,
  validateEvent,
  type CareEvent,
  type SavedEvent,
} from '../domain/events';
import { dayKey } from '../domain/time';
import { errorKey, type TextKey } from '../lib/i18n';
const numberOrNull = (text: string) => (text.trim() ? Number(text.replace(',', '.')) : null);
type DetailKey =
  | 'feeding_kind'
  | 'breast_side'
  | 'volume_offered_ml'
  | 'volume_consumed_ml'
  | 'diaper_kind'
  | 'stool_color'
  | 'stool_consistency'
  | 'stool_amount'
  | 'blood_seen'
  | 'mucus_seen'
  | 'urine_unusual'
  | 'rash_present'
  | 'sleep_kind'
  | 'interruptions_count';
const labels: Record<DetailKey, TextKey> = {
  feeding_kind: 'feeding_kind',
  breast_side: 'breast_side',
  volume_offered_ml: 'offered',
  volume_consumed_ml: 'consumed',
  diaper_kind: 'diaper_kind',
  stool_color: 'stool_color',
  stool_consistency: 'stool_consistency',
  stool_amount: 'stool_amount',
  blood_seen: 'blood_seen',
  mucus_seen: 'mucus_seen',
  urine_unusual: 'urine_unusual',
  rash_present: 'rash_present',
  sleep_kind: 'sleep_kind',
  interruptions_count: 'interruptions',
};
function ConflictDetails({ event }: { event: SavedEvent }) {
  const { t } = useStore();
  return (
    <Card>
      <Copy>{event.occurred_at}</Copy>
      <Copy>{event.ended_at ?? t('no_end')}</Copy>
      <EventDescription event={event} />
      {Object.entries(event.detail).map(([key, value]) => (
        <Copy key={key}>
          {t(labels[key as DetailKey])}:{' '}
          {value === null
            ? t('not_recorded')
            : typeof value === 'number'
              ? value
              : t(value as TextKey)}
        </Copy>
      ))}
    </Card>
  );
}
export function ConflictView({ event }: { event: SavedEvent }) {
  const store = useStore();
  const { t } = store;
  const [server, setServer] = useState<SavedEvent | null>(null);
  const [error, setError] = useState<TextKey | null>(null);
  const serverConflict = store.serverConflict;
  useEffect(() => {
    let active = true;
    serverConflict(event.id)
      .then((value) => {
        if (active) setServer(value);
      })
      .catch(() => {
        if (active) setError('error');
      });
    return () => {
      active = false;
    };
  }, [event.id, event.sync_status, serverConflict]);
  const choose = async (choice: 'mine' | 'server') => {
    try {
      await store.resolve(event.id, choice);
      router.replace('/history');
    } catch (e) {
      setError(errorKey(e));
    }
  };
  return (
    <Screen title={t('conflict')} back>
      <Copy>{t('conflict_explanation')}</Copy>
      <Copy>{t('mine')}</Copy>
      <ConflictDetails event={event} />
      <Copy>{t('theirs')}</Copy>
      {server && <ConflictDetails event={server} />}
      {error && <Feedback message={t(error)} />}
      <Button
        title={t('keep_server')}
        onPress={() => {
          void choose('server');
        }}
        disabled={!server}
      />
      <Button
        title={t('keep_mine')}
        secondary
        onPress={() => {
          void choose('mine');
        }}
        disabled={!server || !!server.deleted_at}
      />
    </Screen>
  );
}
export function LogForm({
  kind,
  existing,
}: {
  kind: CareEvent['event_type'];
  existing?: SavedEvent;
}) {
  const store = useStore();
  const { t, baby } = store;
  const [id] = useState(existing?.id ?? Crypto.randomUUID());
  const [start, setStart] = useState(existing?.occurred_at ?? new Date().toISOString());
  const [baselineVersion] = useState(existing?.server_version);
  const [end, setEnd] = useState(existing?.ended_at ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [feeding, setFeeding] = useState<string | null>(
    existing?.event_type === 'feeding' ? existing.detail.feeding_kind : 'direct_breast',
  );
  const [side, setSide] = useState<string | null>(
    existing?.event_type === 'feeding' ? existing.detail.breast_side : null,
  );
  const [offered, setOffered] = useState(
    existing?.event_type === 'feeding' && existing.detail.volume_offered_ml !== null
      ? String(existing.detail.volume_offered_ml)
      : '',
  );
  const [consumed, setConsumed] = useState(
    existing?.event_type === 'feeding' && existing.detail.volume_consumed_ml !== null
      ? String(existing.detail.volume_consumed_ml)
      : '',
  );
  const [diaper, setDiaper] = useState<string | null>(
    existing?.event_type === 'diaper' ? existing.detail.diaper_kind : 'wet',
  );
  const [color, setColor] = useState<string | null>(
    existing?.event_type === 'diaper' ? existing.detail.stool_color : null,
  );
  const [consistency, setConsistency] = useState<string | null>(
    existing?.event_type === 'diaper' ? existing.detail.stool_consistency : null,
  );
  const [amount, setAmount] = useState<string | null>(
    existing?.event_type === 'diaper' ? existing.detail.stool_amount : null,
  );
  const [blood, setBlood] = useState<string | null>(
    existing?.event_type === 'diaper' ? existing.detail.blood_seen : null,
  );
  const [mucus, setMucus] = useState<string | null>(
    existing?.event_type === 'diaper' ? existing.detail.mucus_seen : null,
  );
  const [urine, setUrine] = useState<string | null>(
    existing?.event_type === 'diaper' ? existing.detail.urine_unusual : null,
  );
  const [rash, setRash] = useState<string | null>(
    existing?.event_type === 'diaper' ? existing.detail.rash_present : null,
  );
  const [sleep, setSleep] = useState<string | null>(
    existing?.event_type === 'sleep' ? existing.detail.sleep_kind : null,
  );
  const [interruptions, setInterruptions] = useState(
    existing?.event_type === 'sleep' && existing.detail.interruptions_count !== null
      ? String(existing.detail.interruptions_count)
      : '',
  );
  const [futureConfirmed, setFutureConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TextKey | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const choices = (values: readonly string[], optional = true) => [
    ...(optional ? [{ value: null, label: t('optional') }] : []),
    ...values.map((value) => ({ value, label: t(value as TextKey) })),
  ];
  const dirty = diaper === 'dirty' || diaper === 'both';
  const wet = diaper === 'wet' || diaper === 'both';
  const draft = (): unknown => ({
    id,
    baby_id: baby?.id,
    event_type: kind,
    occurred_at: start,
    ended_at: kind === 'diaper' ? null : end.trim() || null,
    note: note.trim() || null,
    detail:
      kind === 'feeding'
        ? {
            feeding_kind: feeding,
            breast_side: feeding === 'direct_breast' ? side : null,
            volume_offered_ml: feeding === 'direct_breast' ? null : numberOrNull(offered),
            volume_consumed_ml: feeding === 'direct_breast' ? null : numberOrNull(consumed),
          }
        : kind === 'diaper'
          ? {
              diaper_kind: diaper,
              stool_color: dirty ? color : null,
              stool_consistency: dirty ? consistency : null,
              stool_amount: dirty ? amount : null,
              blood_seen: dirty ? blood : null,
              mucus_seen: dirty ? mucus : null,
              urine_unusual: wet ? urine : null,
              rash_present: rash,
            }
          : { sleep_kind: sleep, interruptions_count: numberOrNull(interruptions) },
  });
  const submit = async () => {
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const event = validateEvent(draft(), new Date(), futureConfirmed);
      await store.save(event, existing ? 'update' : 'create', futureConfirmed, baselineVersion);
      if (router.canGoBack()) router.back();
      else router.replace('/today');
    } catch (e) {
      if (e instanceof ZodError)
        setErrors(
          Object.fromEntries(
            e.issues.map((issue) => {
              const key = String(issue.path[issue.path.length - 1]);
              const message = errorKey(new Error(issue.message));
              return [key, t(message === 'error' ? 'invalid' : message)];
            }),
          ),
        );
      else setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  const deleteEntry = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      const {
        recorded_by: _r,
        server_version: _v,
        deleted_at: _d,
        sync_status: _s,
        ...event
      } = existing;
      await store.save(event, 'delete', true, baselineVersion);
      if (router.canGoBack()) router.back();
      else router.replace('/today');
    } catch (e) {
      setError(errorKey(e));
    } finally {
      setBusy(false);
    }
  };
  const future = [start, end].some((time) => time && Date.parse(time) > now.getTime() + 300000);
  let beforeBirth = false;
  try {
    beforeBirth = !!baby && dayKey(new Date(start), baby.timezone) < baby.date_of_birth;
  } catch {
    /* validation on save */
  }
  return (
    <Screen
      title={t(kind)}
      back
      footer={
        <Button
          title={t('save')}
          onPress={() => {
            void submit();
          }}
          disabled={busy || baby?.role === 'viewer' || (future && !futureConfirmed)}
        />
      }
    >
      <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', gap: 20 }}>
        {kind === 'feeding' && (
          <>
            <Choice
              label={t('feeding_kind')}
              value={feeding}
              onChange={setFeeding}
              choices={choices(feedingKinds, false)}
            />
            {feeding === 'direct_breast' ? (
              <>
                <Choice
                  label={t('breast_side')}
                  value={side}
                  onChange={setSide}
                  choices={choices(sides)}
                />
                <Copy muted>{t('breast_note')}</Copy>
              </>
            ) : (
              <>
                <Field
                  label={t('offered')}
                  value={offered}
                  onChangeText={setOffered}
                  keyboardType="decimal-pad"
                  error={errors.volume_offered_ml}
                />
                <Field
                  label={t('consumed')}
                  value={consumed}
                  onChangeText={setConsumed}
                  keyboardType="decimal-pad"
                  error={errors.volume_consumed_ml}
                />
              </>
            )}
          </>
        )}
        {kind === 'diaper' && (
          <>
            <Choice
              label={t('diaper_kind')}
              value={diaper}
              onChange={setDiaper}
              choices={choices(diaperKinds, false)}
            />
            {dirty && (
              <>
                <Choice
                  label={t('stool_color')}
                  value={color}
                  onChange={setColor}
                  choices={choices(stoolColors)}
                />
                <Choice
                  label={t('stool_consistency')}
                  value={consistency}
                  onChange={setConsistency}
                  choices={choices(consistencies)}
                />
                <Choice
                  label={t('stool_amount')}
                  value={amount}
                  onChange={setAmount}
                  choices={choices(['small', 'medium', 'large', 'unknown'])}
                />
                <Choice
                  label={t('blood_seen')}
                  value={blood}
                  onChange={setBlood}
                  choices={choices(observations)}
                />
                <Choice
                  label={t('mucus_seen')}
                  value={mucus}
                  onChange={setMucus}
                  choices={choices(observations)}
                />
              </>
            )}
            {wet && (
              <Choice
                label={t('urine_unusual')}
                value={urine}
                onChange={setUrine}
                choices={choices(['yes', 'no', 'unsure'])}
              />
            )}
            <Choice
              label={t('rash_present')}
              value={rash}
              onChange={setRash}
              choices={choices(['yes', 'no', 'unsure'])}
            />
          </>
        )}
        {kind === 'sleep' && (
          <>
            <Choice
              label={t('sleep_kind')}
              value={sleep}
              onChange={setSleep}
              choices={choices(['nap', 'night', 'unspecified'])}
            />
            <Field
              label={t('interruptions')}
              value={interruptions}
              onChangeText={setInterruptions}
              keyboardType="number-pad"
              error={errors.interruptions_count}
            />
            <Button title={t('safe_sleep')} secondary onPress={() => router.push('/safety')} />
          </>
        )}
        <TimestampField
          label={t('start_time')}
          value={start}
          onChange={(value) => {
            setStart(value);
            setFutureConfirmed(false);
          }}
          error={errors.occurred_at}
        />
        <Button title={t('now')} secondary onPress={() => setStart(new Date().toISOString())} />
        {kind !== 'diaper' && (
          <>
            <TimestampField
              label={t('end_time')}
              value={end}
              onChange={(value) => {
                setEnd(value);
                setFutureConfirmed(false);
              }}
              optional
              error={errors.ended_at}
            />
            <Copy muted>{t('no_end')}</Copy>
            <Button
              title={t(kind === 'sleep' ? 'wake' : 'end_feed')}
              secondary
              onPress={() => setEnd(new Date().toISOString())}
            />
          </>
        )}
        {beforeBirth && <Feedback message={t('far_backdated')} />}
        <Field
          label={t('notes')}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={1000}
          error={errors.note}
        />
        {future && (
          <Card>
            <Feedback message={t('future_confirmation')} />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={t('confirm_future')}
              accessibilityState={{ checked: futureConfirmed }}
              onPress={() => setFutureConfirmed(!futureConfirmed)}
              style={styles.chip}
            >
              <Copy>
                {futureConfirmed ? '☑ ' : '☐ '}
                {t('confirm_future')}
              </Copy>
            </Pressable>
          </Card>
        )}
        {error && <Feedback message={t(error)} />}
        {existing && (
          <ConfirmAction
            title={t('delete')}
            description={t('delete_confirm')}
            cancel={t('cancel')}
            onConfirm={() => {
              void deleteEntry();
            }}
            disabled={busy || baby?.role === 'viewer'}
          />
        )}
      </View>
    </Screen>
  );
}
