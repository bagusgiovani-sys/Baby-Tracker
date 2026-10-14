import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { StoreProvider } from '../src/lib/store';
import { useTheme } from '../src/lib/theme';
import { palettes } from '../src/lib/theme-palette';
import { useAppearance, ThemeProvider } from '../src/lib/theme-state';
import { ThemeGate } from '../src/components/theme-picker';
import { AppHeader } from '../src/components/app-header';
import { AppLaunch } from '../src/components/app-launch';
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemeProvider>
          <RootChrome />
        </ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
function RootChrome() {
  const theme = useTheme();
  const { themeId } = useAppearance();
  return (
    <>
      <StatusBar style={palettes[themeId].dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
        <AppHeader />
        <View style={{ flex: 1 }}>
          <AppLaunch>
            <ThemeGate>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade_from_bottom',
                  contentStyle: { backgroundColor: theme.color.canvas },
                }}
              />
            </ThemeGate>
          </AppLaunch>
        </View>
      </View>
    </>
  );
}
