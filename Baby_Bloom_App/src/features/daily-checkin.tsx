import { useRef, useState } from 'react';
import { View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { Button, Choice, Copy, Feedback, Field, Heading, styles } from '../components/ui';
import { SwipeSurface } from '../components/swipe-surface';
import { CareIcon } from '../components/motion';
import { useStore } from '../lib/store';
import { checkinQuestions, checkinChoices, type CheckinDetail } from '../domain/journal';
import { dayKey } from '../domain/time';
import type { SavedEvent } from '../domain/events';
import { validateEvent } from '../domain/events';
import { errorKey, type TextKey } from '../lib/i18n';
export function DailyCheckin({ record }: { record?: SavedEvent } = {}) {
  const { baby, events } = useStore();
  if (!baby) return null;
  const day =
    record?.event_type === 'checkin' ? record.detail.local_day : dayKey(new Date(), baby.timezone);
  const existing =
    record?.id ??
    events.find((e) => e.event_type === 'checkin' && !e.deleted_at && e.detail.local_day === day)
      ?.id;
  return <CheckinCards key={baby.id + day + (existing ?? 'new')} day={day} existing={existing} />;
}
function CheckinCards({ day, existing }: { day: string; existing?: string }) {
  const store = useStore();
  const { t, baby, events } = store;
  const recorded = events.find((e) => e.id === existing && e.event_type === 'checkin');
  const baseline = useRef(recorded?.server_version);
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(!recorded);
  const [answers, setAnswers] = useState<CheckinDetail>(() =>
    recorded?.event_type === 'checkin'
      ? recorded.detail
      : {
          local_day: day,
          timezone_at_entry: baby!.timezone,
          state: 'completed',
          overall: 'not_answered',
          feeding_vs_usual: 'not_answered',
          wet_diapers_vs_usual: 'not_answered',
          sleep_concern: 'not_answered',
          new_symptoms: 'not_answered',
          parent_concern: null,
        },
  );
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState<TextKey | null>(null);
  if (!baby) return null;
  const next = () => setIndex((i) => Math.min(checkinQuestions.length, i + 1));
  const previous = () => setIndex((i) => Math.max(0, i - 1));
  const question = checkinQuestions[index];
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `babybloom.checkin.v1:${baby.id}:${day}`,
      );
      const id =
        recorded?.id ??
        `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      const payload = validateEvent(
        {
          id,
          baby_id: baby.id,
          event_type: 'checkin',
          occurred_at: recorded?.occurred_at ?? new Date().toISOString(),
          ended_at: null,
          note: null,
          detail: { ...answers, state: 'completed' },
        },
        new Date(),
      );
      await store.save(payload, recorded ? 'update' : 'create', false, baseline.current);
      setMessage('checkin_saved');
      setEditing(false);
    } catch (e) {
      setMessage(errorKey(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 16 }}>
      <Heading>{t('checkin')}</Heading>
      {!store.journalReady && <Feedback message={t('backend_update_required')} />}
      {!editing ? (
        <>
          <Copy>{t(message ?? 'recorded')}</Copy>
          <Button
            secondary
            title={t('review_checkin')}
            disabled={baby.role === 'viewer'}
            onPress={() => {
              baseline.current = recorded?.server_version;
              setEditing(true);
            }}
          />
        </>
      ) : (
        <>
          <Copy muted>{t('checkin_swipe')}</Copy>
          <Copy muted>
            {index + 1} / {checkinQuestions.length + 1}
          </Copy>
          <SwipeSurface index={index} onNext={next} onPrevious={previous}>
            <View style={{ gap: 22 }}>
              <CareIcon
                kind={
                  index === 1
                    ? 'feeding'
                    : index === 2
                      ? 'diaper'
                      : index === 3
                        ? 'sleep'
                        : 'development'
                }
                size={40}
              />
              {question ? (
                <Choice
                  label={t(question)}
                  value={answers[question]}
                  onChange={(value) => {
                    if (value) setAnswers({ ...answers, [question]: value });
                  }}
                  choices={checkinChoices[question].map((value) => ({ value, label: t(value) }))}
                />
              ) : (
                <Field
                  label={t('parent_concern')}
                  multiline
                  maxLength={2000}
                  value={answers.parent_concern ?? ''}
                  onChangeText={(text) => setAnswers({ ...answers, parent_concern: text || null })}
                />
              )}
            </View>
          </SwipeSurface>
          <View style={styles.row}>
            <Button
              secondary
              title={t('previous_card')}
              disabled={index === 0 || busy}
              onPress={previous}
            />
            {question ? (
              <Button title={t('next_card')} disabled={busy} onPress={next} />
            ) : (
              <Button
                title={t('finish_checkin')}
                disabled={busy || !store.journalReady || baby.role === 'viewer'}
                onPress={() => void save()}
              />
            )}
          </View>
          {message && <Feedback message={t(message)} />}
        </>
      )}
    </View>
  );
}
