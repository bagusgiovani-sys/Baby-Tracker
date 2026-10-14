import React, { Children, useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { theme, useTheme, type AppTheme } from '../lib/theme';
import { useStore } from '../lib/store';
import type { TextKey } from '../lib/i18n';
import { AmbientBackground, CareIcon, MotionPage, MotionSurface, SkeletonBlock } from './motion';
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <MotionSurface compact={compact} interactive={!disabled} reveal={false}>
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
    </MotionSurface>
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
export function Copy({
  children,
  muted = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <Text style={[styles.copy, muted && { color: theme.color.muted }, style]}>{children}</Text>
  );
}
export function Heading({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <Text accessibilityRole="header" style={[styles.heading, style]}>
      {children}
    </Text>
  );
}
export function Card({
  children,
  tint,
  delay = 0,
}: {
  children: React.ReactNode;
  tint?: string;
  delay?: number;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <MotionSurface hover delay={delay}>
      <View style={[styles.card, { backgroundColor: tint ?? theme.color.paper }]}>{children}</View>
    </MotionSurface>
  );
}
export function Eyebrow({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return <Text style={styles.eyebrow}>{children}</Text>;
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
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
  const theme = useTheme();
  const styles = makeStyles(theme);
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
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
      {message}
    </Text>
  );
}
export function SkeletonContent({ form = false }: { form?: boolean }) {
  return (
    <View accessible={false} style={{ gap: 24, width: '100%' }}>
      <SkeletonBlock width="28%" height={14} />
      <SkeletonBlock width="65%" height={42} />
      <SkeletonBlock width="45%" height={18} />
      {form ? (
        <View style={{ gap: 20 }}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={{ gap: 10 }}>
              <SkeletonBlock width="24%" height={14} />
              <SkeletonBlock height={54} rounded />
            </View>
          ))}
          <SkeletonBlock height={48} rounded />
        </View>
      ) : (
        <>
          <View style={styles.row}>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={{ flexGrow: 1, flexBasis: 130 }}>
                <SkeletonBlock height={130} rounded />
              </View>
            ))}
          </View>
          {[0, 1, 2].map((index) => (
            <SkeletonBlock key={index} height={76} rounded />
          ))}
        </>
      )}
    </View>
  );
}
export function Loading({ form = false }: { form?: boolean }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { t } = useStore();
  return (
    <View
      style={styles.loading}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
    >
      <View style={{ width: '100%', maxWidth: 900, gap: 28 }}>
        <View style={[styles.row, { alignItems: 'center' }]}>
          <CareIcon kind="development" />
          <Copy>{t('loading')}</Copy>
        </View>
        <SkeletonContent form={form} />
      </View>
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
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { t, error } = useStore();
  const { width } = useWindowDimensions();
  const [cycle, setCycle] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setCycle((value) => value + 1);
    }, []),
  );
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <AmbientBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.screen, { padding: width >= 768 ? 32 : 20 }]}
        >
          <View style={styles.container}>
            <MotionPage cycle={cycle}>
              <View style={{ gap: 24 }}>
                <View style={{ alignSelf: 'flex-end' }}>
                  {back ? (
                    <Button
                      title={t('cancel')}
                      secondary
                      compact
                      onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace('/today');
                      }}
                    />
                  ) : (
                    <Button
                      title={t('settings')}
                      secondary
                      compact
                      onPress={() => router.push('/settings')}
                    />
                  )}
                </View>
                {title && <Heading>{title}</Heading>}
                {error && <Feedback message={t(error)} />}
                <View style={{ gap: 24 }}>
                  {Children.toArray(children).map((child, index) => (
                    <MotionSurface
                      key={React.isValidElement(child) ? (child.key ?? index) : index}
                      delay={Math.min(index * 0.06, 0.24)}
                    >
                      {child}
                    </MotionSurface>
                  ))}
                </View>
              </View>
            </MotionPage>
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
const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.color.canvas },
    screen: { flexGrow: 1 },
    container: { width: '100%', maxWidth: 1200, alignSelf: 'center', gap: 24 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      marginBottom: 20,
      paddingBottom: 22,
      borderBottomWidth: 1,
      borderBottomColor: theme.color.border,
    },
    brand: { fontSize: 23, fontWeight: '800', color: theme.color.ink, letterSpacing: -0.7 },
    brandMark: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.color.brand,
      backgroundColor: theme.color.mint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 2,
      color: theme.color.brand,
      textTransform: 'uppercase',
      lineHeight: 18,
    },
    heading: {
      fontSize: 30,
      lineHeight: 38,
      fontWeight: '800',
      color: theme.color.ink,
      letterSpacing: -0.6,
    },
    copy: { fontSize: 16, lineHeight: 24, color: theme.color.ink },
    label: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: theme.color.ink },
    card: {
      borderRadius: theme.radius.card,
      padding: 24,
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
    secondary: {
      backgroundColor: theme.color.elevated,
      borderWidth: 1,
      borderColor: theme.color.border,
    },
    buttonText: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: theme.color.onBrand },
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
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      padding: 24,
      backgroundColor: theme.color.canvas,
    },
    row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  });

export const styles = makeStyles(theme);
export const useUIStyles = () => makeStyles(useTheme());
