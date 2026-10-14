import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import Index from '../app/index';
import Welcome from '../app/(auth)/welcome';
import AppLayout from '../app/(app)/_layout';
import Today from '../app/(app)/(tabs)/today';
import { translate, type TextKey } from '../src/lib/i18n';
import type { Baby } from '../src/domain/events';

const mockRetry = jest.fn().mockResolvedValue(undefined);
const mockBaby: Baby = {
  id: 'a0000000-0000-4000-8000-000000000001',
  nickname: 'Synthetic Baby',
  date_of_birth: '2026-01-01',
  timezone: 'Asia/Jakarta',
  gestation_weeks: null,
  gestation_days: null,
  growth_reference_sex: null,
  role: 'owner',
};
let mockState = {
  ready: true,
  authReady: true,
  profilesReady: true,
  session: null as null | { access_token: string; user: { id: string } },
  baby: null as Baby | null,
  error: null as TextKey | null,
  busy: false,
  online: true,
  journalReady: true,
  events: [],
  syncErrors: {},
  locale: 'en' as const,
  hour12: false,
  t: (key: TextKey) => translate('en', key),
  retry: mockRetry,
};
jest.mock('../src/lib/store', () => ({ useStore: () => mockState }));
jest.mock('../src/features/screen-loaders', () => ({ loadLogScreen: async () => ({}) }));
jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    router: { push: jest.fn(), replace: jest.fn(), canGoBack: () => false },
    Redirect: ({ href }: { href: string }) => <Text>Redirect: {href}</Text>,
    Stack: () => <Text>Protected diary</Text>,
    useFocusEffect: () => {},
  };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
beforeEach(() => {
  mockState = {
    ...mockState,
    ready: true,
    profilesReady: true,
    session: null,
    baby: null,
    error: null,
    busy: false,
  };
  mockRetry.mockClear();
  jest.mocked(router.push).mockClear();
  jest.mocked(router.replace).mockClear();
});

test('opening the root always reaches Welcome, including a restored session or startup error', () => {
  for (const session of [null, { access_token: 'synthetic', user: { id: 'synthetic' } }]) {
    mockState.session = session;
    mockState.error = 'error';
    const app = render(<Index />);
    expect(app.getByText('Redirect: /welcome')).toBeTruthy();
    expect(app.queryByText('Redirect: /today')).toBeNull();
    app.unmount();
  }
});

test('Welcome signs out visitors into email sign-in and offers returning caregivers an explicit Continue', () => {
  const app = render(<Welcome />);
  fireEvent.press(app.getByRole('button', { name: /Get started/ }));
  expect(router.push).toHaveBeenLastCalledWith('/sign-in');
  mockState.session = { access_token: 'synthetic', user: { id: 'synthetic' } };
  mockState.error = 'error';
  app.rerender(<Welcome />);
  expect(app.queryByText(translate('en', 'error'))).toBeNull();
  fireEvent.press(app.getByRole('button', { name: /Continue to my diary/ }));
  expect(router.push).toHaveBeenLastCalledWith('/today');
});

test('protected routes redirect signed-out visitors and wait for initial profiles before onboarding', () => {
  const app = render(<AppLayout />);
  expect(app.getByText('Redirect: /welcome')).toBeTruthy();
  mockState.session = { access_token: 'synthetic', user: { id: 'synthetic' } };
  mockState.profilesReady = false;
  app.rerender(<AppLayout />);
  expect(app.getByRole('progressbar')).toBeBusy();
  expect(app.queryByText('Redirect: /onboarding')).toBeNull();
  mockState.profilesReady = true;
  app.rerender(<AppLayout />);
  expect(app.getByText('Redirect: /onboarding')).toBeTruthy();
  mockState.baby = mockBaby;
  app.rerender(<AppLayout />);
  expect(app.getByText('Protected diary')).toBeTruthy();
});

test('failed profile startup offers real Retry and Welcome recovery without logging out or clearing records', () => {
  mockState.session = { access_token: 'synthetic', user: { id: 'synthetic' } };
  mockState.profilesReady = false;
  mockState.error = 'error';
  const app = render(<AppLayout />);
  expect(app.getByText('Your diary could not open')).toBeTruthy();
  fireEvent.press(app.getByRole('button', { name: 'Try again' }));
  expect(mockRetry).toHaveBeenCalledTimes(1);
  fireEvent.press(app.getByRole('button', { name: 'Back to Welcome' }));
  expect(router.replace).toHaveBeenCalledWith('/welcome');
  expect(mockState.session).not.toBeNull();
});

test('Today renders an authenticated empty diary, including the daily check-in and reports controls', () => {
  mockState.session = { access_token: 'synthetic', user: { id: 'synthetic' } };
  mockState.baby = mockBaby;
  const app = render(<Today />);
  expect(app.getByText('Synthetic Baby')).toBeTruthy();
  expect(app.getByRole('button', { name: translate('en', 'reports') })).toBeTruthy();
  expect(app.getByRole('button', { name: translate('en', 'next_card') })).toBeTruthy();
});
