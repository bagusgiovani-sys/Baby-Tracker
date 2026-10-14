import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Redirect } from 'expo-router';
import { z } from 'zod';
import { Button, Copy, Feedback, Field, Screen } from '../../src/components/ui';
import { useStore } from '../../src/lib/store';
import { supabase } from '../../src/lib/supabase';
import type { TextKey } from '../../src/lib/i18n';
export default function SignIn() {
  const { t, session } = useStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TextKey | null>(null);
  if (session) return <Redirect href="/today" />;
  const submit = async () => {
    if (!supabase) {
      setError('config_required');
      return;
    }
    if (!z.email().safeParse(email.trim()).success) {
      setError('invalid');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = sent
        ? await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
        : await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
              emailRedirectTo:
                Platform.OS === 'web'
                  ? `${window.location.origin}/auth/callback`
                  : 'babybloom://auth/callback',
            },
          });
      if (response.error) setError('error');
      else setSent(true);
    } catch {
      setError('error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title={t('sign_in')} back>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: 20 }}>
        <Field
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!sent}
        />
        {sent && (
          <>
            <Copy>{t('check_email')}</Copy>
            <Field
              label={t('code')}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
            />
          </>
        )}
        {error && <Feedback message={t(error)} />}
        <Button
          title={t(sent ? 'verify' : 'send_code')}
          onPress={() => {
            void submit();
          }}
          disabled={busy}
        />
        <Copy muted>{t('privacy')}</Copy>
      </View>
    </Screen>
  );
}
