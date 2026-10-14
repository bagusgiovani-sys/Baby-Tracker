import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CareIcon, MotionSurface } from './motion';
import { useStore } from '../lib/store';
import { useTheme, type AppTheme } from '../lib/theme';
import { useAppearance } from '../lib/theme-state';

export function AppHeader() {
  const { t, locale, setLocale } = useStore();
  const styles = makeStyles(useTheme());
  const { openPicker } = useAppearance();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <CareIcon kind="development" size={25} />
          <Text style={styles.name}>{t('app')}</Text>
        </View>
        <View style={styles.languages} accessibilityLabel={t('language')}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('theme_button')}
            onPress={openPicker}
            style={styles.option}
          >
            <Text style={styles.label}>{t('theme_button')}</Text>
          </Pressable>
          {(
            [
              { value: 'en', label: 'english' },
              { value: 'id-ID', label: 'bahasa' },
            ] as const
          ).map((option) => (
            <MotionSurface key={option.value} compact interactive reveal={false}>
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={t(option.label)}
                accessibilityState={{ selected: locale === option.value }}
                onPress={() => setLocale(option.value)}
                style={[styles.option, locale === option.value && styles.selected]}
              >
                <Text style={[styles.label, locale === option.value && styles.selectedLabel]}>
                  {t(option.label)}
                </Text>
              </Pressable>
            </MotionSurface>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: {
      backgroundColor: theme.color.canvas,
      borderBottomWidth: 1,
      borderBottomColor: theme.color.border,
      zIndex: 20,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      flexWrap: 'wrap',
      width: '100%',
      maxWidth: 1264,
      alignSelf: 'center',
    },
    brand: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    name: { color: theme.color.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.6 },
    languages: {
      flexDirection: 'row',
      gap: 2,
      backgroundColor: theme.color.paper,
      borderColor: theme.color.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 3,
    },
    option: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', borderRadius: 10 },
    selected: { backgroundColor: theme.color.brand },
    label: { color: theme.color.muted, fontSize: 13, fontWeight: '700' },
    selectedLabel: { color: theme.color.onBrand },
  });
