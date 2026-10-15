import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Copy, Loading, Screen } from '../../src/components/ui';
import { useStore } from '../../src/lib/store';
import { supabase } from '../../src/lib/supabase';
import { EmailAuthForm } from '../../src/features/email-auth';
export default function Callback() {
  const { code } = useLocalSearchParams<{
    code?: string;
  }>();
  const { t, completeSignIn } = useStore();
  const [failed, setFailed] = useState(false);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!code || !supabase || Array.isArray(code)) {
      return;
    }
    let active = true;
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data.session) setFailed(true);
        // The pinned SDK returns the PKCE verifier's redirectType at runtime.
        else if ('redirectType' in data && data.redirectType === 'PASSWORD_RECOVERY')
          setRecovery(true);
        else {
          completeSignIn();
          router.replace('/home');
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
      <Copy>{t('auth_callback_failed')}</Copy>
      <Button title={t('sign_in')} onPress={() => router.replace('/sign-in')} />
    </Screen>
  ) : recovery ? (
    <Screen showStoreError={false}>
      <EmailAuthForm
        recovery
        onVerified={() => {
          completeSignIn();
          router.replace('/home');
        }}
      />
    </Screen>
  ) : (
    <Loading />
  );
}
