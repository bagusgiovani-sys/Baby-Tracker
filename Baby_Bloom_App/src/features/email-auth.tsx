import { useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { z } from 'zod';
import { Button, Copy, Feedback, Field, Heading, useUIStyles } from '../components/ui';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import type { TextKey } from '../lib/i18n';

type Mode = 'login' | 'register' | 'forgot' | 'update';
function authCallbackUrl() {
  return Platform.OS === 'web'
    ? `${window.location.origin}/auth/callback`
    : 'babybloom://auth/callback';
}
function authError(error: { code?: string; status?: number }): TextKey {
  if (error.status === 429 || error.code?.includes('rate_limit')) return 'auth_rate_limited';
  if (error.code === 'invalid_credentials') return 'password_login_failed';
  if (error.code === 'email_not_confirmed') return 'registration_confirm';
  if (error.code === 'weak_password') return 'password_weak';
  if (error.code === 'same_password') return 'password_different';
  if (error.code === 'user_already_exists' || error.code === 'email_exists')
    return 'registration_existing';
  return 'password_request_failed';
}

export function EmailAuthForm({
  onVerified,
  recovery = false,
}: { onVerified?: () => void; recovery?: boolean } = {}) {
  const { t } = useStore();
  const styles = useUIStyles();
  const [mode, setMode] = useState<Mode>(recovery ? 'update' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TextKey | null>(null);
  const [notice, setNotice] = useState<TextKey | null>(null);
  const pending = useRef(false);
  const creatingPassword = mode === 'register' || mode === 'update';
  const action: TextKey =
    mode === 'login'
      ? 'password_sign_in'
      : mode === 'register'
        ? 'register_account'
        : mode === 'forgot'
          ? 'send_password_reset'
          : 'save_password';
  const changeMode = (next: Mode) => {
    if (pending.current) return;
    setMode(next);
    setPassword('');
    setConfirmation('');
    setError(null);
    setNotice(null);
  };
  const submit = async () => {
    if (pending.current) return;
    setError(null);
    setNotice(null);
    if (!supabase) return setError('config_required');
    const address = email.trim();
    if (mode !== 'update' && !z.email().safeParse(address).success)
      return setError('auth_invalid_email');
    if (mode !== 'forgot' && !password) return setError('password_required');
    if (creatingPassword && password.length < 8) return setError('password_minimum');
    if (creatingPassword && password !== confirmation) return setError('password_mismatch');
    pending.current = true;
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const { error: failure } = await supabase.auth.resetPasswordForEmail(address, {
          redirectTo: authCallbackUrl(),
        });
        if (failure) setError(authError(failure));
        else setNotice('password_reset_sent');
      } else if (mode === 'update') {
        const { error: failure } = await supabase.auth.updateUser({ password });
        if (failure) setError(authError(failure));
        else {
          setPassword('');
          setConfirmation('');
          onVerified?.();
        }
      } else {
        const { data, error: failure } =
          mode === 'register'
            ? await supabase.auth.signUp({
                email: address,
                password,
                options: { emailRedirectTo: authCallbackUrl() },
              })
            : await supabase.auth.signInWithPassword({ email: address, password });
        if (failure) setError(authError(failure));
        else {
          setPassword('');
          setConfirmation('');
          if (data.session) onVerified?.();
          else if (mode === 'register') setNotice('registration_confirm');
          else setError('password_login_failed');
        }
      }
    } catch {
      setError('password_request_failed');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 18 }}>
      <Heading style={{ fontSize: 24, lineHeight: 32 }}>
        {t(mode === 'forgot' ? 'forgot_password' : mode === 'update' ? 'set_password' : action)}
      </Heading>
      <Copy muted>
        {t(
          mode === 'forgot'
            ? 'password_reset_help'
            : mode === 'update'
              ? 'password_minimum'
              : 'auth_explanation',
        )}
      </Copy>
      {mode !== 'update' && (
        <Field
          label={t('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          placeholder={t('email_placeholder')}
          editable={!busy}
        />
      )}
      {mode !== 'forgot' && (
        <Field
          label={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={creatingPassword ? 'new-password' : 'current-password'}
          editable={!busy}
          onSubmitEditing={() => {
            if (mode === 'login') void submit();
          }}
        />
      )}
      {creatingPassword && (
        <>
          {mode === 'register' && <Copy muted>{t('password_minimum')}</Copy>}
          <Field
            label={t('confirm_password')}
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            editable={!busy}
            onSubmitEditing={() => {
              void submit();
            }}
          />
        </>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={styles.copy}>
          {t(notice)}
        </Text>
      )}
      {error && <Feedback message={t(error)} />}
      <Button
        title={t(busy ? 'auth_working' : action)}
        disabled={busy}
        onPress={() => {
          void submit();
        }}
      />
      {mode !== 'update' && (
        <Button
          secondary
          title={t(mode === 'login' ? 'register_instead' : 'login_instead')}
          disabled={busy}
          onPress={() => changeMode(mode === 'login' ? 'register' : 'login')}
        />
      )}
      {mode === 'login' && (
        <Button
          secondary
          title={t('forgot_password')}
          disabled={busy}
          onPress={() => changeMode('forgot')}
        />
      )}
    </View>
  );
}
