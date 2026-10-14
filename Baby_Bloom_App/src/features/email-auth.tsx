import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { z } from 'zod';
import { Button, Copy, Feedback, Field, useUIStyles } from '../components/ui';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import type { TextKey } from '../lib/i18n';

const RESEND_SECONDS = 60;
function authError(error: { code?: string; status?: number } | null, verifying: boolean): TextKey {
  if (
    error?.status === 429 ||
    error?.code === 'over_email_send_rate_limit' ||
    error?.code === 'over_request_rate_limit'
  )
    return 'auth_rate_limited';
  if (error?.code === 'otp_expired') return 'auth_invalid_code';
  return verifying ? 'auth_verify_failed' : 'auth_send_failed';
}

export function EmailAuthForm() {
  const styles = useUIStyles();
  const { t } = useStore();
  const [email, setEmail] = useState('');
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null);
  const [error, setError] = useState<TextKey | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [delivery, setDelivery] = useState<'sent' | 'resent' | null>(null);
  const pending = useRef(false);
  const deadline = useRef(0);
  const remaining = Math.max(0, Math.ceil((resendAt - clock) / 1000));
  useEffect(() => {
    if (!resendAt) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (now >= resendAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  const cooldown = () => {
    const now = Date.now();
    deadline.current = now + RESEND_SECONDS * 1000;
    setResendAt(deadline.current);
    setClock(now);
  };
  const send = async () => {
    if (pending.current || Date.now() < deadline.current) return;
    if (!supabase) {
      setError('config_required');
      return;
    }
    const address = requestedEmail ?? email.trim();
    if (!z.email().safeParse(address).success) {
      setError('auth_invalid_email');
      return;
    }
    pending.current = true;
    setBusy('send');
    setError(null);
    setDelivery(null);
    try {
      const response = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: true,
          emailRedirectTo:
            Platform.OS === 'web'
              ? `${window.location.origin}/auth/callback`
              : 'babybloom://auth/callback',
        },
      });
      if (response.error) {
        const message = authError(response.error, false);
        setError(message);
        if (message === 'auth_rate_limited') cooldown();
      } else {
        setRequestedEmail(address);
        setCode('');
        setDelivery(requestedEmail ? 'resent' : 'sent');
        cooldown();
      }
    } catch {
      setError('auth_send_failed');
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };
  const verify = async () => {
    if (pending.current || !requestedEmail) return;
    if (!supabase) {
      setError('config_required');
      return;
    }
    if (!code.trim()) {
      setError('auth_invalid_code');
      return;
    }
    pending.current = true;
    setBusy('verify');
    setError(null);
    try {
      const response = await supabase.auth.verifyOtp({
        email: requestedEmail,
        token: code.trim(),
        type: 'email',
      });
      if (response.error) setError(authError(response.error, true));
    } catch {
      setError('auth_verify_failed');
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };
  return (
    <View style={{ gap: 20 }}>
      <Copy muted>{t('auth_explanation')}</Copy>
      <Field
        label={t('email')}
        value={requestedEmail ?? email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        placeholder={t('email_placeholder')}
        editable={!requestedEmail && !busy}
        onSubmitEditing={() => {
          if (!requestedEmail) void send();
        }}
      />
      {requestedEmail && (
        <>
          <Copy>{t('check_email')}</Copy>
          <Field
            label={t('code')}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            autoFocus
            placeholder={t('code_placeholder')}
            editable={!busy}
            onSubmitEditing={() => {
              void verify();
            }}
          />
        </>
      )}
      {delivery && (
        <Text accessibilityLiveRegion="polite" style={styles.copy}>
          {t(delivery === 'resent' ? 'email_resent' : 'email_sent')}
        </Text>
      )}
      {error && <Feedback message={t(error)} />}
      <Button
        title={t(
          busy === 'verify'
            ? 'verifying'
            : busy === 'send'
              ? 'sending_email'
              : requestedEmail
                ? 'verify'
                : 'send_code',
        )}
        disabled={Boolean(busy) || (!requestedEmail && remaining > 0)}
        onPress={() => {
          void (requestedEmail ? verify() : send());
        }}
      />
      {requestedEmail && (
        <>
          <Button
            secondary
            title={remaining > 0 ? `${t('resend_in')} ${remaining}s` : t('resend_code')}
            disabled={Boolean(busy) || remaining > 0}
            onPress={() => {
              void send();
            }}
          />
          <Button
            secondary
            title={t('change_email')}
            disabled={Boolean(busy)}
            onPress={() => {
              setRequestedEmail(null);
              setCode('');
              setError(null);
              setDelivery(null);
            }}
          />
        </>
      )}
      {!requestedEmail && remaining > 0 && (
        <Copy muted>
          {t('resend_in')} {remaining}s
        </Copy>
      )}
      {requestedEmail && <Copy muted>{t('email_delivery_hint')}</Copy>}
    </View>
  );
}
