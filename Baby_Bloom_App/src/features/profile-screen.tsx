import { View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Card,
  Choice,
  Copy,
  Eyebrow,
  Heading,
  Screen,
  useUIStyles,
} from '../components/ui';
import { BabyStats } from '../components/baby-stats';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { useBabyOverview } from '../lib/use-baby-overview';
import type { TextKey } from '../lib/i18n';

export default function Profile() {
  const { t, baby, babies, locale, selectBaby } = useStore();
  const theme = useTheme();
  const styles = useUIStyles();
  const overview = useBabyOverview();
  if (!baby || !overview) return null;
  const birth = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', dateStyle: 'long' }).format(
    new Date(baby.date_of_birth + 'T00:00:00Z'),
  );
  const rows: { label: TextKey; value: string }[] = [
    { label: 'birth_date', value: birth },
    { label: 'timezone', value: baby.timezone },
    {
      label: 'reference_sex',
      value:
        baby.growth_reference_sex === null ? t('profile_missing') : t(baby.growth_reference_sex),
    },
    {
      label: 'gestation_weeks',
      value:
        baby.gestation_weeks === null
          ? t('profile_missing')
          : `${baby.gestation_weeks} ${t('weeks')}`,
    },
    {
      label: 'gestation_days',
      value:
        baby.gestation_days === null ? t('profile_missing') : `${baby.gestation_days} ${t('days')}`,
    },
    {
      label: 'profile_access',
      value: t(
        baby.role === 'owner'
          ? 'profile_owner'
          : baby.role === 'editor'
            ? 'profile_editor'
            : 'viewer',
      ),
    },
  ];
  return (
    <Screen title={t('baby_profile')} back>
      <Card tint={theme.color.mint}>
        <Eyebrow>{t('saved_profile')}</Eyebrow>
        <Heading>{baby.nickname}</Heading>
        <Copy>
          {t('age')}: {overview.age.months} {t('months')} · {overview.age.days} {t('days')}
        </Copy>
        <Copy muted>
          {t('chronological_age_days')}: {overview.chronologicalDays}
        </Copy>
        {overview.correctedDays !== null && (
          <Copy>
            {t('corrected_age_days')}: {overview.correctedDays}
          </Copy>
        )}
        {overview.premature && <Copy muted>{t('corrected_age_note')}</Copy>}
        <Button secondary title={t('home')} onPress={() => router.push('/home')} />
      </Card>
      <Card>
        <Heading>{t('profile_details')}</Heading>
        <Copy muted>{t('profile_context')}</Copy>
        {rows.map((row) => (
          <View
            key={row.label}
            style={{
              paddingVertical: 12,
              gap: 6,
              borderBottomWidth: 1,
              borderBottomColor: theme.color.border,
            }}
          >
            <Copy muted>{t(row.label)}</Copy>
            <Copy>{row.value}</Copy>
          </View>
        ))}
      </Card>
      <BabyStats baby={baby} overview={overview} />
      <Card>
        <Heading>{t('more_baby_profiles')}</Heading>
        <Choice
          label={t('choose_baby')}
          value={baby.id}
          onChange={(id) => {
            if (id) selectBaby(id);
          }}
          choices={babies.map((item) => ({ value: item.id, label: item.nickname }))}
        />
        <View style={styles.row}>
          <Button
            secondary
            title={t('add_baby')}
            onPress={() => router.push({ pathname: '/onboarding', params: { add: '1' } })}
          />
          <Button secondary title={t('reports')} onPress={() => router.push('/reports')} />
        </View>
      </Card>
    </Screen>
  );
}
