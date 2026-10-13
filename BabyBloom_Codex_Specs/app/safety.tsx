import { Linking } from 'react-native';
import { Button, Card, Copy, Screen } from '../src/components/ui';
import { useStore } from '../src/lib/store';
import { clinicalContent } from '../src/domain/features';
export default function Safety() {
    const { t } = useStore();
    return <Screen title={t('safety')} back><Card><Copy>{t('disclaimer')}</Copy><Copy>{t('safety_body')}</Copy></Card><Card><Copy>{t('safe_sleep')}</Copy><Copy muted>{t('review_pending')}</Copy><Button title={t('safe_sleep_source')} secondary onPress={() => { void Linking.openURL(clinicalContent.source); }}/></Card></Screen>;
}
