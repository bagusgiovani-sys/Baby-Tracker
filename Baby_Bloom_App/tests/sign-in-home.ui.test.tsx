import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import SignIn from '../app/(auth)/sign-in';
import Callback from '../app/auth/callback';
import { translate as mockTranslate, type TextKey } from '../src/lib/i18n';
const mockComplete = jest.fn();
const mockExchange = jest.fn();
jest.mock('../src/lib/store', () => ({
  useStore: () => ({ completeSignIn: mockComplete, t: (key: TextKey) => mockTranslate('en', key) }),
}));
jest.mock('../src/lib/supabase', () => ({
  supabase: { auth: { exchangeCodeForSession: () => mockExchange() } },
}));
jest.mock('../src/features/email-auth', () => {
  const { Button } = require('react-native');
  return {
    EmailAuthForm: ({ onVerified, recovery }: { onVerified: () => void; recovery?: boolean }) => (
      <Button
        title={recovery ? 'Synthetic save password' : 'Synthetic verified sign-in'}
        onPress={onVerified}
      />
    ),
  };
});
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => ({ code: 'synthetic-code' }),
  useFocusEffect: () => {},
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
beforeEach(() => {
  mockComplete.mockClear();
  mockExchange
    .mockReset()
    .mockResolvedValue({ data: { session: {}, redirectType: null }, error: null });
  jest.mocked(router.replace).mockClear();
});

test('successful password sign-in enters Home after updating startup state', () => {
  const app = render(<SignIn />);
  expect(router.replace).not.toHaveBeenCalled();
  fireEvent.press(app.getByText('Synthetic verified sign-in'));
  expect(mockComplete).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith('/home');
});

test('successful registration confirmation enters Home once', async () => {
  render(<Callback />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
  expect(mockComplete).toHaveBeenCalledTimes(1);
  expect(mockExchange).toHaveBeenCalledTimes(1);
});

test('recovery callback waits for password update before entering Home', async () => {
  mockExchange.mockResolvedValue({
    data: { session: {}, redirectType: 'PASSWORD_RECOVERY' },
    error: null,
  });
  const app = render(<Callback />);
  await waitFor(() => expect(app.getByText('Synthetic save password')).toBeTruthy());
  expect(router.replace).not.toHaveBeenCalled();
  expect(mockComplete).not.toHaveBeenCalled();
  fireEvent.press(app.getByText('Synthetic save password'));
  expect(router.replace).toHaveBeenCalledWith('/home');
});

test('failed callback never renders password update or enters Home', async () => {
  mockExchange.mockResolvedValue({ data: { session: null }, error: { code: 'invalid_grant' } });
  const app = render(<Callback />);
  await waitFor(() =>
    expect(app.getByText(mockTranslate('en', 'auth_callback_failed'))).toBeTruthy(),
  );
  expect(app.queryByText('Synthetic save password')).toBeNull();
  expect(router.replace).not.toHaveBeenCalled();
});
