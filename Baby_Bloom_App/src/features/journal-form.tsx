import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Button, Choice, ConfirmAction, Copy, Feedback, Field, Screen } from '../components/ui';
import { TimestampField } from '../components/timestamp-field';
import { useStore } from '../lib/store';
import { validateEvent, type SavedEvent } from '../domain/events';
import { errorKey, type TextKey } from '../lib/i18n';
import { NutritionFields, nutritionDraft, parseNutrition, numberOrNull } from './nutrition-fields';
export function JournalForm({
  kind,
  existing,
}: {
  kind: 'meal' | 'measurement';
  existing?: SavedEvent;
}) {
  const store = useStore();
  const { t, baby } = store;
  const baseline = useRef(existing?.server_version);
  const [id] = useState(() => existing?.id ?? Crypto.randomUUID());
  const meal = existing?.event_type === 'meal' ? existing.detail : null;
  const measurement = existing?.event_type === 'measurement' ? existing.detail : null;
  const [start, setStart] = useState(existing?.occurred_at ?? new Date().toISOString());
  const [note, setNote] = useState(existing?.note ?? '');
  const [food, setFood] = useState(meal?.food_name ?? '');
  const [ingredients, setIngredients] = useState(meal?.ingredients ?? '');
  const [offered, setOffered] = useState(meal?.portion_offered?.toString() ?? '');
  const [consumed, setConsumed] = useState(meal?.portion_consumed?.toString() ?? '');
  const [unit, setUnit] = useState<string | null>(meal?.portion_unit ?? 'g');
  const [texture, setTexture] = useState<string | null>(meal?.texture ?? null);
  const [first, setFirst] = useState<string | null>(meal?.first_exposure ?? null);
  const [reaction, setReaction] = useState<string | null>(meal?.reaction ?? null);
  const [nutrition, setNutrition] = useState(() => nutritionDraft(meal?.nutrition));
  const [weight, setWeight] = useState(measurement?.weight_kg?.toString() ?? '');
  const [length, setLength] = useState(measurement?.length_cm?.toString() ?? '');
  const [head, setHead] = useState(measurement?.head_cm?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const locking = useRef(false);
  const [error, setError] = useState<TextKey | null>(null);
  const choices = (values: readonly string[], optional = true) => [
    ...(optional ? [{ value: null, label: t('optional') }] : []),
    ...values.map((value) => ({ value, label: t(value as TextKey) })),
  ];
  const save = async () => {
    if (!baby || locking.current) return;
    locking.current = true;
    setBusy(true);
    setError(null);
    try {
      const payload = validateEvent(
        {
          id,
          baby_id: baby.id,
          event_type: kind,
          occurred_at: start,
          ended_at: null,
          note: note.trim() || null,
          detail:
            kind === 'meal'
              ? {
                  food_name: food.trim(),
                  ingredients: ingredients.trim() || null,
                  portion_offered: numberOrNull(offered),
                  portion_consumed: numberOrNull(consumed),
                  portion_unit: unit,
                  texture,
                  first_exposure: first,
                  reaction,
                  nutrition: parseNutrition(nutrition),
                }
              : {
                  weight_kg: numberOrNull(weight),
                  length_cm: numberOrNull(length),
                  head_cm: numberOrNull(head),
                },
        },
        new Date(),
      );
      await store.save(payload, existing ? 'update' : 'create', false, baseline.current);
      router.replace('/history');
    } catch (e) {
      const code =
        e instanceof Error && 'issues' in e
          ? (e as unknown as { issues: { message: string }[] }).issues[0]?.message
          : null;
      setError(
        code &&
          ['consumed_exceeds_offered', 'nutrition_needs_portion', 'measurement_required'].includes(
            code,
          )
          ? (code as TextKey)
          : errorKey(e) === 'error'
            ? 'invalid'
            : errorKey(e),
      );
    } finally {
      locking.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen title={t(kind)} back>
      {!store.journalReady && <Feedback message={t('backend_update_required')} />}
      <Copy muted>{t(kind === 'meal' ? 'nutrition_hint' : 'measurement_hint')}</Copy>
      <View style={{ gap: 20 }}>
        {kind === 'meal' ? (
          <>
            <Field label={t('food_name')} value={food} onChangeText={setFood} maxLength={120} />
            <Field
              label={t('ingredients')}
              value={ingredients}
              onChangeText={setIngredients}
              multiline
              maxLength={1000}
            />
            <Choice
              label={t('portion_unit')}
              value={unit}
              onChange={setUnit}
              choices={choices(['g', 'ml', 'tsp', 'tbsp', 'piece', 'serving'], false)}
            />
            <Field
              label={t('portion_offered')}
              value={offered}
              onChangeText={setOffered}
              keyboardType="decimal-pad"
            />
            <Field
              label={t('portion_consumed')}
              value={consumed}
              onChangeText={setConsumed}
              keyboardType="decimal-pad"
            />
            <Choice
              label={t('texture')}
              value={texture}
              onChange={setTexture}
              choices={choices([
                'puree',
                'mashed',
                'soft_pieces',
                'family_food',
                'other',
                'unknown',
              ])}
            />
            <Choice
              label={t('first_exposure')}
              value={first}
              onChange={setFirst}
              choices={choices(['yes', 'no', 'unsure'])}
            />
            <Choice
              label={t('reaction')}
              value={reaction}
              onChange={setReaction}
              choices={choices(['none_observed', 'observed', 'unsure', 'not_observed'])}
            />
            <NutritionFields value={nutrition} onChange={setNutrition} />
          </>
        ) : (
          <>
            <Field
              label={t('weight_kg')}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />
            <Field
              label={t('length_cm')}
              value={length}
              onChangeText={setLength}
              keyboardType="decimal-pad"
            />
            <Field
              label={t('head_cm')}
              value={head}
              onChangeText={setHead}
              keyboardType="decimal-pad"
            />
          </>
        )}
        <TimestampField label={t('start_time')} value={start} onChange={setStart} />
        <Field label={t('notes')} value={note} onChangeText={setNote} multiline maxLength={1000} />
        {error && <Feedback message={t(error)} />}
        <Button
          title={t('save')}
          disabled={busy || !store.journalReady || !baby || baby.role === 'viewer'}
          onPress={() => void save()}
        />
        {existing && (
          <ConfirmAction
            title={t('delete')}
            description={t('delete_confirm')}
            cancel={t('cancel')}
            disabled={busy || baby?.role === 'viewer'}
            onConfirm={() => {
              if (locking.current) return;
              locking.current = true;
              setBusy(true);
              const {
                recorded_by: _r,
                server_version: _v,
                sync_status: _s,
                deleted_at: _d,
                ...payload
              } = existing;
              void store
                .save(payload, 'delete', false, baseline.current)
                .then(() => router.replace('/history'))
                .catch((e) => setError(errorKey(e)))
                .finally(() => {
                  locking.current = false;
                  setBusy(false);
                });
            }}
          />
        )}
      </View>
    </Screen>
  );
}
