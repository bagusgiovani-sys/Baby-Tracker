import { useState, type ReactNode } from 'react';
import { Modal, Pressable, View, Text, ScrollView } from 'react-native';
import { Button, Copy, Heading, Loading, styles, Feedback } from './ui';
import { MotionSurface } from './motion';
import { useStore } from '../lib/store';
import { useAppearance } from '../lib/theme-state';
import { palettes, themeIds, type ThemeId } from '../lib/theme-palette';
import { useTheme } from '../lib/theme';

function ThemeCards({
  selected,
  onSelect,
}: {
  selected?: ThemeId;
  onSelect?: (id: ThemeId) => void;
}) {
  const { t } = useStore();
  const appearance = useAppearance();
  return (
    <View style={{ gap: 18, width: '100%' }}>
      {themeIds.map((id, index) => {
        const palette = palettes[id];
        return (
          <MotionSurface key={id} delay={index * 0.1} hover>
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={t(`theme_${id}`)}
              accessibilityState={{ selected: (selected ?? appearance.themeId) === id }}
              onPress={() => (onSelect ? onSelect(id) : appearance.preview(id))}
              style={{
                padding: 24,
                gap: 14,
                borderRadius: 24,
                borderWidth: (selected ?? appearance.themeId) === id ? 3 : 1,
                borderColor:
                  (selected ?? appearance.themeId) === id
                    ? palette.color.accentInk
                    : palette.color.border,
                backgroundColor: palette.color.canvas,
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: '800', color: palette.color.ink }}>
                {t(`theme_${id}`)}
              </Text>
              <Text style={{ color: palette.color.muted, fontSize: 15 }}>
                {t(`theme_${id}_description`)}
              </Text>
              <View style={styles.row}>
                {palette.swatches.map((swatch) => (
                  <View
                    key={swatch}
                    accessible={false}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: swatch,
                      borderWidth: 1,
                      borderColor: palette.color.border,
                    }}
                  />
                ))}
              </View>
            </Pressable>
          </MotionSurface>
        );
      })}
    </View>
  );
}
export function ThemeSelection() {
  const { t } = useStore();
  const appearance = useAppearance();
  const theme = useTheme();
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: theme.color.canvas,
        padding: 24,
        justifyContent: 'center',
      }}
    >
      <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center', gap: 24 }}>
        <Heading>{t('choose_theme')}</Heading>
        <Copy muted>{t('theme_first_visit')}</Copy>
        <ThemeCards />
        <Button title={t('continue')} onPress={() => appearance.choose(appearance.themeId)} />
        {appearance.storageError && <Feedback message={t('theme_storage_error')} />}
      </View>
    </ScrollView>
  );
}
export function ThemeGate({ children }: { children: ReactNode }) {
  const appearance = useAppearance();
  if (!appearance.ready) return <Loading />;
  if (!appearance.chosen) return <ThemeSelection />;
  return (
    <>
      {children}
      <ThemeDialogs key={appearance.themeId + appearance.pickerOpen} />
    </>
  );
}
function ThemeDialogs() {
  const { t } = useStore();
  const appearance = useAppearance();
  const theme = useTheme();
  const tutorial = !appearance.tutorialSeen && !appearance.pickerOpen;
  const [draft, setDraft] = useState<ThemeId>(appearance.themeId);
  return (
    <Modal
      transparent
      visible={appearance.pickerOpen || tutorial}
      animationType="fade"
      onRequestClose={() => (tutorial ? appearance.dismissTutorial() : appearance.closePicker())}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,.55)',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <ScrollView
          style={{
            width: '100%',
            maxWidth: 700,
            maxHeight: '95%',
            alignSelf: 'center',
            backgroundColor: theme.color.paper,
            borderRadius: 28,
          }}
          contentContainerStyle={{ padding: 24, gap: 18 }}
        >
          <Heading>{t(tutorial ? 'theme_tutorial_title' : 'choose_theme')}</Heading>
          {tutorial ? (
            <>
              <Copy>{t('theme_tutorial_body')}</Copy>
              <Button title={t('got_it')} onPress={appearance.dismissTutorial} />
            </>
          ) : (
            <>
              <ThemeCards selected={draft} onSelect={setDraft} />
              <View style={styles.row}>
                <Button secondary title={t('cancel')} onPress={appearance.closePicker} />
                <Button title={t('apply_theme')} onPress={() => appearance.choose(draft)} />
              </View>
            </>
          )}
          {appearance.storageError && <Feedback message={t('theme_storage_error')} />}
        </ScrollView>
      </View>
    </Modal>
  );
}
