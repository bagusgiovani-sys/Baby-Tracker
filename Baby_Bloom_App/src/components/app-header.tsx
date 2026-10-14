import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { CareIcon, MotionSurface } from './motion';
import { useStore } from '../lib/store';
import { useTheme, type AppTheme } from '../lib/theme';
import { useAppearance } from '../lib/theme-state';
import type { TextKey } from '../lib/i18n';
type Destination = '/welcome' | '/sign-in' | '/today' | '/settings' | '/safety';
export function AppHeader() {
  const { t, locale, setLocale, session, baby } = useStore();
  const { width, height } = useWindowDimensions();
  const compact = width < 380;
  const styles = makeStyles(useTheme(), compact);
  const { openPicker } = useAppearance();
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === pathname;
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuPath(null);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open]);
  const navigate = (path: Destination) => {
    setMenuPath(null);
    router.push(path);
  };
  const items: { label: TextKey; path: Destination; icon: string }[] = [
    { label: 'home', path: '/welcome', icon: '⌂' },
    { label: 'sign_in', path: '/sign-in', icon: '↗' },
    ...(session && baby ? [{ label: 'today' as const, path: '/today' as const, icon: '♡' }] : []),
    { label: 'settings', path: '/settings', icon: '⚙' },
    { label: 'safety', path: '/safety', icon: '+' },
  ];
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      {open && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dismiss_menu')}
          onPress={() => setMenuPath(null)}
          style={[styles.backdrop, { height }]}
        />
      )}
      <View style={styles.header} testID="header-row">
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('home')}
          onPress={() => navigate('/welcome')}
          style={styles.brand}
        >
          <CareIcon kind="development" size={compact ? 18 : 22} />
          <Text numberOfLines={1} style={styles.name}>
            {t('app')}
          </Text>
        </Pressable>
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('theme_button')}
            onPress={() => {
              setMenuPath(null);
              openPicker();
            }}
            style={styles.iconButton}
          >
            <Text accessible={false} style={styles.themeIcon}>
              ◐
            </Text>
          </Pressable>
          <View style={styles.languages} accessibilityLabel={t('language')}>
            {(
              [
                { value: 'en', label: 'english', short: 'language_eng' },
                { value: 'id-ID', label: 'bahasa', short: 'language_ind' },
              ] as const
            ).map((option, index) => (
              <View key={option.value} style={styles.languageItem}>
                {index === 1 && (
                  <Text accessible={false} style={styles.separator}>
                    |
                  </Text>
                )}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={t(option.label)}
                  accessibilityState={{ selected: locale === option.value }}
                  onPress={() => setLocale(option.value)}
                  style={[styles.option, locale === option.value && styles.selected]}
                >
                  <Text style={[styles.label, locale === option.value && styles.selectedLabel]}>
                    {t(option.short)}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(open ? 'close_menu' : 'open_menu')}
            accessibilityState={{ expanded: open }}
            onPress={() => setMenuPath(open ? null : pathname)}
            style={[styles.iconButton, open && styles.menuActive]}
          >
            <View accessible={false} style={styles.burger}>
              {[0, 1, 2].map((line) => (
                <View key={line} style={styles.burgerLine} />
              ))}
            </View>
          </Pressable>
        </View>
      </View>
      {open && (
        <View style={styles.menu} testID="header-menu">
          <MotionSurface reveal>
            <View style={styles.menuPanel}>
              <Text accessibilityRole="header" style={styles.menuTitle}>
                {t('menu')}
              </Text>
              {items.map((item) => (
                <Pressable
                  key={item.path}
                  accessibilityRole="button"
                  accessibilityLabel={t(item.label)}
                  onPress={() => navigate(item.path)}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuPressed]}
                >
                  <Text accessible={false} style={styles.menuIcon}>
                    {item.icon}
                  </Text>
                  <Text style={styles.menuLabel}>{t(item.label)}</Text>
                  <Text accessible={false} style={styles.arrow}>
                    ↗
                  </Text>
                </Pressable>
              ))}
            </View>
          </MotionSurface>
        </View>
      )}
    </SafeAreaView>
  );
}
const makeStyles = (theme: AppTheme, compact: boolean) =>
  StyleSheet.create({
    safe: {
      backgroundColor: theme.color.canvas,
      borderBottomWidth: 1,
      borderBottomColor: theme.color.border,
      zIndex: 100,
      position: 'relative',
    },
    header: {
      paddingHorizontal: compact ? 10 : 16,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      flexWrap: 'nowrap',
      width: '100%',
      maxWidth: 1264,
      alignSelf: 'center',
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: compact ? 4 : 6,
      flex: 1,
      minWidth: 0,
      minHeight: 44,
    },
    name: {
      color: theme.color.ink,
      fontSize: compact ? 15 : 18,
      fontWeight: '800',
      letterSpacing: -0.7,
      flexShrink: 1,
    },
    controls: { flexDirection: 'row', alignItems: 'center', gap: compact ? 4 : 6, flexShrink: 0 },
    iconButton: {
      width: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.paper,
    },
    themeIcon: { color: theme.color.brand, fontSize: 24 },
    languages: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.color.paper,
      borderColor: theme.color.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 2,
    },
    languageItem: { flexDirection: 'row', alignItems: 'center' },
    option: {
      paddingHorizontal: compact ? 6 : 8,
      minHeight: 40,
      justifyContent: 'center',
      borderRadius: 9,
    },
    separator: { color: theme.color.muted, marginHorizontal: 2, fontSize: 12 },
    selected: { backgroundColor: theme.color.brand },
    label: { color: theme.color.muted, fontSize: 11, fontWeight: '800' },
    selectedLabel: { color: theme.color.onBrand },
    burger: { gap: 4, width: 18 },
    burgerLine: { height: 2, borderRadius: 1, backgroundColor: theme.color.ink },
    menuActive: { borderColor: theme.color.brand },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'transparent' },
    menu: { position: 'absolute', top: 66, right: 12, width: 248, maxWidth: '90%', zIndex: 110 },
    menuPanel: {
      borderRadius: 20,
      backgroundColor: theme.color.paper,
      borderWidth: 1,
      borderColor: theme.color.border,
      padding: 10,
      gap: 4,
      boxShadow: '0 18px 48px rgba(0,0,0,.35)',
    },
    menuTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.color.muted,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      padding: 10,
    },
    menuItem: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    menuPressed: { backgroundColor: theme.color.elevated },
    menuIcon: { color: theme.color.brand, fontSize: 20, width: 24 },
    menuLabel: { color: theme.color.ink, fontSize: 14, fontWeight: '600', flex: 1 },
    arrow: { color: theme.color.muted, fontSize: 16 },
  });
