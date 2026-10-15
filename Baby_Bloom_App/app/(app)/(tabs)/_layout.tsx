import { Tabs } from 'expo-router';
import { CareIcon } from '../../../src/components/motion';
import { useStore } from '../../../src/lib/store';
import { useTheme } from '../../../src/lib/theme';
const icons = ['today', 'history', 'growth', 'development', 'health'] as const;
export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useStore();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        animation: 'fade',
        tabBarActiveTintColor: theme.color.accentInk,
        tabBarInactiveTintColor: theme.color.muted,
        tabBarStyle: {
          backgroundColor: theme.color.paper,
          minHeight: 76,
          paddingTop: 8,
          paddingBottom: 8,
          borderTopColor: theme.color.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
        tabBarActiveBackgroundColor: theme.color.mint,
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 4 },
      }}
    >
      {icons.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(name),
            tabBarAccessibilityLabel: t(name),
            tabBarIcon: ({ color, focused }) => (
              <CareIcon
                kind={name}
                color={typeof color === 'string' ? color : theme.color.accentInk}
                size={24}
                active={focused}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
