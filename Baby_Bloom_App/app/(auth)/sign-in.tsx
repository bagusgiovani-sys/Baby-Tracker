import { router } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { Card, Copy, Eyebrow, Heading, Screen } from '../../src/components/ui';
import { HeartMark } from '../../src/components/motion';
import { EmailAuthForm } from '../../src/features/email-auth';
import { useStore } from '../../src/lib/store';
import { useTheme } from '../../src/lib/theme';

export default function SignIn() {
  const theme = useTheme();
  const { t, completeSignIn } = useStore();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  return (
    <Screen back showStoreError={false}>
      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          gap: wide ? 64 : 28,
          paddingVertical: wide ? 24 : 0,
          alignItems: wide ? 'center' : 'stretch',
        }}
      >
        <View style={{ flex: wide ? 1 : undefined, gap: 20 }}>
          <Eyebrow>{t('connected_diary')}</Eyebrow>
          <View>
            <Heading
              style={{ fontSize: wide ? 60 : 38, lineHeight: wide ? 68 : 46, letterSpacing: -1.8 }}
            >
              {t('auth_lead')}
            </Heading>
            <Heading
              style={{
                fontSize: wide ? 60 : 38,
                lineHeight: wide ? 68 : 46,
                letterSpacing: -1.8,
                color: theme.color.brand,
              }}
            >
              {t('auth_accent')}
            </Heading>
          </View>
          <Copy muted>{t('intro')}</Copy>
          {wide && (
            <View style={{ alignItems: 'flex-start' }}>
              <HeartMark size={290} />
            </View>
          )}
        </View>
        <View
          style={{
            flex: wide ? 1 : undefined,
            width: '100%',
            maxWidth: wide ? 500 : undefined,
            gap: 18,
          }}
        >
          <Card>
            <Eyebrow>{t('app')}</Eyebrow>
            <Heading style={{ fontSize: 28, lineHeight: 36 }}>{t('auth_title')}</Heading>
            <View style={{ height: 1, backgroundColor: theme.color.border, marginVertical: 6 }} />
            <EmailAuthForm
              onVerified={() => {
                completeSignIn();
                router.replace('/today');
              }}
            />
          </Card>
          <Copy muted style={{ fontSize: 12, lineHeight: 19 }}>
            {t('privacy')}
          </Copy>
        </View>
      </View>
    </Screen>
  );
}
