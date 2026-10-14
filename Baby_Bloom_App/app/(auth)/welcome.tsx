import { router } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { Button, Card, Copy, Eyebrow, Heading, Screen, styles } from '../../src/components/ui';
import { CareIcon, HeartMark, MotionSurface } from '../../src/components/motion';
import { useStore } from '../../src/lib/store';
import { useTheme } from '../../src/lib/theme';

export default function Welcome() {
  const theme = useTheme();
  const { t } = useStore();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const features = [
    { label: 'feeding' as const, body: 'feature_feeding' as const },
    { label: 'diaper' as const, body: 'feature_diaper' as const },
    { label: 'sleep' as const, body: 'feature_sleep' as const },
  ];
  return (
    <Screen showStoreError={false}>
      <View style={{ gap: 36 }}>
        <View
          style={{
            flexDirection: wide ? 'row' : 'column',
            gap: 32,
            alignItems: 'center',
            paddingVertical: wide ? 28 : 8,
          }}
        >
          <View
            style={{ flex: wide ? 1.35 : undefined, width: wide ? undefined : '100%', gap: 24 }}
          >
            <View style={[styles.row, { alignItems: 'center', justifyContent: 'space-between' }]}>
              <Eyebrow>{t('connected_diary')}</Eyebrow>
            </View>
            <MotionSurface delay={0.1}>
              <View>
                <Heading
                  style={{
                    fontSize: wide ? 68 : 43,
                    lineHeight: wide ? 76 : 51,
                    letterSpacing: -2.4,
                  }}
                >
                  {t('welcome_lead')}
                </Heading>
                <Heading
                  style={{
                    fontSize: wide ? 68 : 43,
                    lineHeight: wide ? 76 : 51,
                    letterSpacing: -2.4,
                    color: theme.color.brand,
                  }}
                >
                  {t('welcome_accent')}
                </Heading>
              </View>
            </MotionSurface>
            <MotionSurface delay={0.2}>
              <Copy muted style={{ fontSize: 18, lineHeight: 29, maxWidth: 540 }}>
                {t('intro')}
              </Copy>
            </MotionSurface>
            <View style={{ width: '100%', maxWidth: 300 }}>
              <Button title={`${t('get_started')}  ↗`} onPress={() => router.push('/sign-in')} />
            </View>
            <Copy muted style={{ fontSize: 13 }}>
              {t('auth_title')} · {t('version')}
            </Copy>
          </View>
          <View style={{ flex: wide ? 0.85 : undefined, alignItems: 'center', gap: 8 }}>
            <MotionSurface delay={0.15}>
              <HeartMark size={wide ? 350 : 250} />
            </MotionSurface>
            <Eyebrow>{t('tagline')}</Eyebrow>
          </View>
        </View>
        <View style={[styles.row, { gap: 16 }]}>
          {features.map((feature, index) => (
            <View key={feature.label} style={{ flexGrow: 1, flexBasis: 260 }}>
              <Card delay={index * 0.08}>
                <View
                  style={[styles.row, { alignItems: 'center', justifyContent: 'space-between' }]}
                >
                  <CareIcon kind={feature.label} size={34} />
                  <Eyebrow>{String(index + 1).padStart(2, '0')}</Eyebrow>
                </View>
                <Heading style={{ fontSize: 22, lineHeight: 30 }}>{t(feature.label)}</Heading>
                <Copy muted>{t(feature.body)}</Copy>
              </Card>
            </View>
          ))}
        </View>
        <MotionSurface delay={0.1}>
          <View
            style={{
              gap: 18,
              paddingTop: 12,
              paddingBottom: 16,
              borderTopWidth: 1,
              borderTopColor: theme.color.border,
            }}
          >
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flex: 1, minWidth: 230, gap: 6 }}>
                <Eyebrow>{t('feature_offline')}</Eyebrow>
                <Copy muted style={{ fontSize: 14 }}>
                  {t('feature_offline_body')}
                </Copy>
              </View>
              <Button
                compact
                title={t('safety')}
                secondary
                onPress={() => router.push('/safety')}
              />
            </View>
            <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>
              {t('disclaimer')}
            </Copy>
          </View>
        </MotionSurface>
      </View>
    </Screen>
  );
}
