import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import SignIn from '../app/(auth)/sign-in';
import Callback from '../app/auth/callback';
import { translate as mockTranslate, type TextKey } from '../src/lib/i18n';
const mockComplete = jest.fn();
const mockExchange = jest.fn().mockResolvedValue({ error: null });
jest.mock('../src/lib/store', () => ({
  useStore: () => ({ completeSignIn: mockComplete, t: (key: TextKey) => mockTranslate('en', key) }),
}));
jest.mock('../src/lib/supabase', () => ({
  supabase: { auth: { exchangeCodeForSession: () => mockExchange() } },
}));
jest.mock('../src/features/email-auth', () => {
  const { Button } = require('react-native');
  return {
    EmailAuthForm: ({ onVerified }: { onVerified: () => void }) => (
      <Button title="Synthetic verified sign-in" onPress={onVerified} />
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
  mockExchange.mockClear();
  jest.mocked(router.replace).mockClear();
});

test('successful email-code verification enters Home after updating startup state', () => {
  const app = render(<SignIn />);
  expect(router.replace).not.toHaveBeenCalled();
  fireEvent.press(app.getByText('Synthetic verified sign-in'));
  expect(mockComplete).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith('/home');
});

test('successful email-link callback enters Home once', async () => {
  render(<Callback />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
  expect(mockComplete).toHaveBeenCalledTimes(1);
  expect(mockExchange).toHaveBeenCalledTimes(1);
});
