import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Choice, ConfirmAction, Copy, Feedback, Screen } from '../src/components/ui';
import { useStore } from '../src/lib/store';
import { supabase } from '../src/lib/supabase';
export default function Settings() {
  const { t, locale, setLocale, hour12, setHour12, babies, baby, selectBaby, session, retry } =
    useStore();
  const [failed, setFailed] = useState(false);
  const signOut = async () => {
    setFailed(false);
    try {
      const result = await supabase?.auth.signOut({ scope: 'local' });
      if (result?.error) setFailed(true);
      else router.replace('/welcome');
    } catch {
      setFailed(true);
    }
  };
  return (
    <Screen title={t('settings')} back>
      <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center', gap: 20 }}>
        <Choice
          label={t('language')}
          value={locale}
          onChange={(value) => setLocale(value === 'en' ? 'en' : 'id-ID')}
          choices={[
            { value: 'id-ID', label: t('indonesian') },
            { value: 'en', label: t('english') },
          ]}
        />
        <Choice
          label={t('hour_format')}
          value={hour12 ? '12' : '24'}
          onChange={(value) => setHour12(value === '12')}
          choices={[
            { value: '24', label: t('hour24') },
            { value: '12', label: t('hour12') },
          ]}
        />
        {session && (
          <>
            <Choice
              label={t('choose_baby')}
              value={baby?.id ?? null}
              onChange={(value) => {
                if (value) selectBaby(value);
              }}
              choices={babies.map((item) => ({ value: item.id, label: item.nickname }))}
            />
            <Button
              title={t('add_baby')}
              secondary
              onPress={() => router.push({ pathname: '/onboarding', params: { add: '1' } })}
            />
            <Button
              title={t('retry')}
              secondary
              onPress={() => {
                void retry();
              }}
            />
            <ConfirmAction
              title={t('sign_out')}
              description={t('sign_out_confirm')}
              cancel={t('cancel')}
              onConfirm={() => {
                void signOut();
              }}
            />
          </>
        )}
        {failed && <Feedback message={t('error')} />}
        <Card>
          <Copy>{t('privacy')}</Copy>
          <Copy muted>{t('version')}</Copy>
        </Card>
        <Button title={t('safety')} secondary onPress={() => router.push('/safety')} />
      </View>
    </Screen>
  );
}
