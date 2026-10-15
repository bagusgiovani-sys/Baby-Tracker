import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ZodError } from 'zod';
import {
  Button,
  Card,
  Choice,
  Copy,
  Feedback,
  Field,
  Loading,
  Screen,
  useUIStyles,
} from '../components/ui';
import { useStore } from '../lib/store';
import { babySchema } from '../domain/events';
import { dayKey } from '../domain/time';
import { errorKey, type TextKey } from '../lib/i18n';
export default function Onboarding() {
  const styles = useUIStyles();
  const store = useStore();
  const { t, ready, session, online } = store;
  const { add } = useLocalSearchParams<{
    add?: string;
  }>();
  const [nickname, setNickname] = useState('');
  const [birth, setBirth] = useState('');
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
  );
  const [weeks, setWeeks] = useState('');
  const [days, setDays] = useState('');
  const [sex, setSex] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<TextKey | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (store.baby && add !== '1') return <Redirect href="/home" />;
  const submit = async () => {
    if (submitting.current) return;
    setError(null);
    setFields({});
    if (!online) {
      setError('profile_online_required');
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const input = babySchema.parse({
        nickname,
        date_of_birth: birth,
        timezone,
        gestation_weeks: weeks.trim() ? Number(weeks) : null,
        gestation_days: days.trim() ? Number(days) : null,
        growth_reference_sex: sex,
        guardian_confirmed: consent,
        policy_version: '2026-10-draft',
      });
      if (birth > dayKey(new Date(), timezone)) {
        setFields({ date_of_birth: t('birth_in_future') });
        return;
      }
      await store.addBaby(input);
      router.replace('/home');
    } catch (e) {
      if (e instanceof ZodError)
        setFields(
          Object.fromEntries(
            e.issues.map((issue) => [
              String(issue.path[0]),
              t(
                issue.path[0] === 'guardian_confirmed'
                  ? 'consent_required'
                  : issue.path[0] === 'date_of_birth'
                    ? 'birth_date_invalid'
                    : issue.message === 'invalid_timezone'
                      ? 'invalid_timezone'
                      : 'invalid',
              ),
            ]),
          ),
        );
      else setError(errorKey(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen title={t('onboarding')} back>
      <View style={{ maxWidth: 700, width: '100%', alignSelf: 'center', gap: 20 }}>
        <Field
          label={t('nickname')}
          value={nickname}
          onChangeText={setNickname}
          maxLength={80}
          error={fields.nickname}
        />
        <Field
          label={t('birth_date')}
          value={birth}
          onChangeText={setBirth}
          autoCapitalize="none"
          placeholder="2026-01-01"
          error={fields.date_of_birth}
        />
        <Field
          label={t('timezone')}
          value={timezone}
          onChangeText={setTimezone}
          autoCapitalize="none"
          error={fields.timezone}
        />
        <View style={styles.row}>
          <View style={{ flexGrow: 1, flexBasis: 240 }}>
            <Field
              label={t('gestation_weeks')}
              value={weeks}
              onChangeText={setWeeks}
              keyboardType="number-pad"
              error={fields.gestation_weeks}
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 200 }}>
            <Field
              label={t('gestation_days')}
              value={days}
              onChangeText={setDays}
              keyboardType="number-pad"
              error={fields.gestation_days}
            />
          </View>
        </View>
        <Choice
          label={t('reference_sex')}
          value={sex}
          onChange={setSex}
          choices={[
            { value: null, label: t('optional') },
            { value: 'female', label: t('female') },
            { value: 'male', label: t('male') },
          ]}
        />
        <Card>
          <Copy>{t('privacy')}</Copy>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={t('consent')}
            accessibilityState={{ checked: consent }}
            onPress={() => setConsent(!consent)}
            style={[styles.chip, consent && styles.selected]}
          >
            <Copy>
              {consent ? '☑ ' : '☐ '}
              {t('consent')}
            </Copy>
          </Pressable>
          {fields.guardian_confirmed && <Feedback message={t('consent_required')} />}
        </Card>
        <View style={{ gap: 12 }}>
          {Object.keys(fields).length > 0 && (
            <View testID="onboarding-errors" style={{ gap: 8 }}>
              <Feedback message={t('profile_check_fields')} />
              {Object.entries(fields).map(([field, message]) => (
                <Feedback
                  key={field}
                  message={
                    field === 'guardian_confirmed'
                      ? message
                      : `${t(
                          (
                            {
                              nickname: 'nickname',
                              date_of_birth: 'birth_date',
                              timezone: 'timezone',
                              gestation_weeks: 'gestation_weeks',
                              gestation_days: 'gestation_days',
                              growth_reference_sex: 'reference_sex',
                            } as Record<string, TextKey>
                          )[field] ?? 'invalid',
                        )}: ${message}`
                  }
                />
              ))}
            </View>
          )}
          {error && <Feedback message={t(error)} />}
          <Button
            title={t(busy ? 'creating_baby' : 'create_baby')}
            onPress={() => {
              void submit();
            }}
            disabled={busy}
          />
        </View>
        <Copy muted>{t('disclaimer')}</Copy>
      </View>
    </Screen>
  );
}
