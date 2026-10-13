import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useStore } from '../../../src/lib/store';
import { theme } from '../../../src/lib/theme';
const icons = { today: '◉', history: '≡', growth: '↗', development: '❋', health: '♡' };
export default function TabsLayout() {
    const { t } = useStore();
    return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.color.brand, tabBarInactiveTintColor: theme.color.muted, tabBarStyle: { backgroundColor: theme.color.canvas, minHeight: 64, borderTopColor: theme.color.border }, tabBarLabelStyle: { fontSize: 11 } }}>{(Object.keys(icons) as (keyof typeof icons)[]).map(name => <Tabs.Screen key={name} name={name} options={{ title: t(name), tabBarAccessibilityLabel: t(name), tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 23 }}>{icons[name]}</Text> }}/>)}</Tabs>;
}
