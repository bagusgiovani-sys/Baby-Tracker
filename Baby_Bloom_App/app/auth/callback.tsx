import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Copy, Loading, Screen } from '../../src/components/ui';
import { useStore } from '../../src/lib/store';
import { supabase } from '../../src/lib/supabase';
export default function Callback() {
  const { code } = useLocalSearchParams<{
    code?: string;
  }>();
  const { t, completeSignIn } = useStore();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!code || !supabase || Array.isArray(code)) {
      return;
    }
    let active = true;
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (!active) return;
        if (error) setFailed(true);
        else {
          completeSignIn();
          router.replace('/today');
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [code, completeSignIn]);
  return failed || !code || !supabase || Array.isArray(code) ? (
    <Screen>
      <Copy>{t('error')}</Copy>
      <Button title={t('sign_in')} onPress={() => router.replace('/sign-in')} />
    </Screen>
  ) : (
    <Loading />
  );
}
