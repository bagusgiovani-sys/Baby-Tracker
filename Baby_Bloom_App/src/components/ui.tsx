import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '../lib/theme';
import { useStore } from '../lib/store';
import type { TextKey } from '../lib/i18n';
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        pressed && { opacity: 0.8 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: theme.color.ink }]}>{title}</Text>
    </Pressable>
  );
}
export function ConfirmAction({
  title,
  description,
  cancel,
  onConfirm,
  disabled = false,
}: {
  title: string;
  description: string;
  cancel: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return <Button title={title} secondary disabled={disabled} onPress={() => setOpen(true)} />;
  return (
    <Card>
      <Copy>{description}</Copy>
      <View style={styles.row}>
        <Button title={cancel} secondary onPress={() => setOpen(false)} />
        <Button
          title={title}
          disabled={disabled}
          onPress={() => {
            setOpen(false);
            onConfirm();
          }}
        />
      </View>
    </Card>
  );
}
export function Copy({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <Text style={[styles.copy, muted && { color: theme.color.muted }]}>{children}</Text>;
}
export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}
export function Card({
  children,
  tint = theme.color.paper,
}: {
  children: React.ReactNode;
  tint?: string;
}) {
  return <View style={[styles.card, { backgroundColor: tint }]}>{children}</View>;
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        {...props}
        style={[styles.input, props.multiline && { minHeight: 100 }, props.style]}
        placeholderTextColor={theme.color.muted}
      />
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
export function Choice({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string | null;
  choices: {
    value: string | null;
    label: string;
  }[];
  onChange: (value: string | null) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        {choices.map((choice) => (
          <Pressable
            key={choice.value ?? '__null'}
            accessibilityRole="radio"
            accessibilityLabel={choice.label}
            accessibilityState={{ selected: value === choice.value }}
            onPress={() => onChange(choice.value)}
            style={[styles.chip, value === choice.value && styles.selected]}
          >
            <Text
              style={[
                styles.copy,
                value === choice.value && { color: theme.color.brand, fontWeight: '600' },
              ]}
            >
              {choice.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Feedback({ message }: { message: string }) {
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
      {message}
    </Text>
  );
}
export function Loading() {
  const { t } = useStore();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.color.brand} accessibilityLabel={t('loading')} />
      <Copy>{t('loading')}</Copy>
    </View>
  );
}
export function Screen({
  children,
  title,
  back = false,
  footer,
}: {
  children: React.ReactNode;
  title?: string;
  back?: boolean;
  footer?: React.ReactNode;
}) {
  const { t, error } = useStore();
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.screen, { padding: width >= 768 ? 32 : 20 }]}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.brand}>
                ❋ {t('app')}
              </Text>
              {back ? (
                <Button
                  title={t('cancel')}
                  secondary
                  onPress={() => {
                    if (router.canGoBack()) router.back();
                    else router.replace('/today');
                  }}
                />
              ) : (
                <Button title={t('settings')} secondary onPress={() => router.push('/settings')} />
              )}
            </View>
            {title && <Heading>{title}</Heading>}
            {error && <Feedback message={t(error)} />}
            {children}
          </View>
        </ScrollView>
        {footer && (
          <SafeAreaView
            edges={['bottom']}
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              backgroundColor: theme.color.canvas,
              borderTopWidth: 1,
              borderTopColor: theme.color.border,
            }}
          >
            <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 12 }}>
              {footer}
            </View>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Placeholder({ title, message }: { title: TextKey; message: TextKey }) {
  const { t } = useStore();
  return (
    <Screen title={t(title)}>
      <Card>
        <Copy>{t(message)}</Copy>
        <Copy muted>{t('review_pending')}</Copy>
      </Card>
    </Screen>
  );
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.canvas },
  screen: { flexGrow: 1 },
  container: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  brand: { fontSize: 24, fontWeight: '700', color: theme.color.brand, letterSpacing: -0.5 },
  heading: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    color: theme.color.ink,
    letterSpacing: -0.6,
  },
  copy: { fontSize: 16, lineHeight: 24, color: theme.color.ink },
  label: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: theme.color.ink },
  card: {
    borderRadius: theme.radius.card,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  button: {
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 20,
    backgroundColor: theme.color.brand,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { backgroundColor: theme.color.mint },
  buttonText: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#FFFFFF' },
  field: { gap: 8 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.paper,
    borderRadius: theme.radius.input,
    padding: 14,
    fontSize: 16,
    color: theme.color.ink,
    textAlignVertical: 'top',
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: theme.color.paper,
  },
  selected: { backgroundColor: theme.color.mint, borderColor: theme.color.brand },
  error: { fontSize: 15, lineHeight: 23, color: theme.color.warning },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
});
