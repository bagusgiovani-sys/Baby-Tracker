import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Card, Copy, Heading, Screen } from '../../src/components/ui';
import { useStore } from '../../src/lib/store';
import { theme } from '../../src/lib/theme';
export default function Welcome() {
  const { t, locale, setLocale } = useStore();
  return (
    <Screen>
      <View style={{ width: '100%', maxWidth: 680, alignSelf: 'center', gap: 24 }}>
        <Card tint={theme.color.mint}>
          <Copy muted>{t('tagline')}</Copy>
          <Heading>{t('welcome')}</Heading>
          <Copy>{t('intro')}</Copy>
          <Button title={t('sign_in')} onPress={() => router.push('/sign-in')} />
        </Card>
        <Button
          title={t(locale === 'id-ID' ? 'english' : 'indonesian')}
          secondary
          onPress={() => setLocale(locale === 'id-ID' ? 'en' : 'id-ID')}
        />
        <Copy muted>{t('disclaimer')}</Copy>
        <Button title={t('safety')} secondary onPress={() => router.push('/safety')} />
      </View>
    </Screen>
  );
}
