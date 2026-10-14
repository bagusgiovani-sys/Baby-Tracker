import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/lib/theme-state';
import { ThemeGate } from '../src/components/theme-picker';
import { AppHeader } from '../src/components/app-header';
const mockRead = jest.fn();
const mockWrite = jest.fn();
jest.mock('../src/lib/appearance-storage', () => ({
  readAppearance: () => mockRead(),
  writeAppearance: (value: string) => mockWrite(value),
}));
jest.mock('../src/lib/store', () => ({
  useStore: () => ({ t: (key: string) => key, locale: 'en', setLocale: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
function App() {
  return (
    <ThemeProvider>
      <AppHeader />
      <ThemeGate>
        <Text>Actual screen</Text>
      </ThemeGate>
    </ThemeProvider>
  );
}
beforeEach(() => {
  mockRead.mockReset().mockResolvedValue(null);
  mockWrite.mockReset().mockResolvedValue(undefined);
});
test('first visit chooses cards, teaches header button, persists preference and skips onboarding after reload', async () => {
  const app = render(<App />);
  await waitFor(() => expect(app.getByText('choose_theme')).toBeTruthy());
  fireEvent.press(app.getByRole('radio', { name: 'theme_unicorn' }));
  fireEvent.press(app.getByRole('button', { name: 'continue' }));
  expect(app.getByText('theme_tutorial_body')).toBeTruthy();
  expect(app.getByText('Actual screen')).toBeTruthy();
  fireEvent.press(app.getByRole('button', { name: 'got_it' }));
  await waitFor(() => expect(mockWrite).toHaveBeenCalled());
  const saved = mockWrite.mock.calls.at(-1)![0];
  expect(JSON.parse(saved)).toMatchObject({ theme: 'unicorn', chosen: true, tutorialSeen: true });
  app.unmount();
  mockRead.mockResolvedValue(saved);
  const reloaded = render(<App />);
  await waitFor(() => expect(reloaded.getByText('Actual screen')).toBeTruthy());
  expect(reloaded.queryByText('choose_theme')).toBeNull();
  expect(reloaded.queryByText('theme_tutorial_body')).toBeNull();
  fireEvent.press(reloaded.getByRole('button', { name: 'theme_button' }));
  fireEvent.press(reloaded.getByRole('radio', { name: 'theme_neon' }));
  fireEvent.press(reloaded.getByRole('button', { name: 'cancel' }));
  await act(async () => {});
  expect(JSON.parse(mockWrite.mock.calls.at(-1)![0]).theme).toBe('unicorn');
  fireEvent.press(reloaded.getByRole('button', { name: 'theme_button' }));
  expect(reloaded.getByRole('radio', { name: 'theme_unicorn' })).toBeSelected();
  fireEvent.press(reloaded.getByRole('radio', { name: 'theme_neon' }));
  fireEvent.press(reloaded.getByRole('button', { name: 'apply_theme' }));
  await waitFor(() => expect(JSON.parse(mockWrite.mock.calls.at(-1)![0]).theme).toBe('neon'));
});
test('storage failure keeps theme choice usable and reports that first-visit persistence could fail', async () => {
  mockWrite.mockRejectedValue(new Error('Synthetic unavailable storage'));
  const app = render(<App />);
  await waitFor(() => expect(app.getByText('choose_theme')).toBeTruthy());
  fireEvent.press(app.getByRole('button', { name: 'continue' }));
  await waitFor(() => expect(app.getByText('theme_storage_error')).toBeTruthy());
});
