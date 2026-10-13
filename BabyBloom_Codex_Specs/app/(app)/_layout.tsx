import { Redirect, Stack } from 'expo-router';
import { useStore } from '../../src/lib/store';
import { Loading, Screen, Copy } from '../../src/components/ui';
export default function AppLayout() {
    const { ready, session, baby, busy, error, t } = useStore();
    if (!ready || (busy && !baby))
        return <Loading />;
    if (!session)
        return <Redirect href="/welcome"/>;
    if (error && !baby)
        return <Screen><Copy>{t(error)}</Copy></Screen>;
    if (!baby)
        return <Redirect href="/onboarding"/>;
    return <Stack screenOptions={{ headerShown: false }}/>;
}
