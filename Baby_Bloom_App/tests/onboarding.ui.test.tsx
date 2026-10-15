import React from 'react';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import Onboarding from '../src/features/onboarding-screen';
import { translate as mockTranslate, type TextKey } from '../src/lib/i18n';

const mockAddBaby = jest.fn();
let mockOnline = true;
jest.mock('../src/lib/store', () => ({
  useStore: () => ({
    ready: true,
    session: { user: { id: 'synthetic-caregiver' } },
    baby: null,
    online: mockOnline,
    error: null,
    t: (key: TextKey) => mockTranslate('id-ID', key),
    addBaby: mockAddBaby,
  }),
}));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), canGoBack: () => false },
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));

beforeEach(() => {
  mockOnline = true;
  mockAddBaby.mockReset().mockResolvedValue(undefined);
  jest.mocked(router.replace).mockClear();
});

function validForm() {
  const app = render(<Onboarding />);
  fireEvent.changeText(app.getByLabelText(mockTranslate('id-ID', 'nickname')), 'Synthetic Baby');
  fireEvent.changeText(app.getByLabelText(mockTranslate('id-ID', 'birth_date')), '2026-01-01');
  fireEvent.press(app.getByRole('checkbox'));
  return app;
}

test('create profile sends validated input once and enters Home after saving', async () => {
  const app = validForm();
  await act(async () => fireEvent.press(app.getByRole('button', { name: 'Buat profil bayi' })));
  expect(mockAddBaby).toHaveBeenCalledTimes(1);
  expect(mockAddBaby).toHaveBeenCalledWith(
    expect.objectContaining({
      nickname: 'Synthetic Baby',
      date_of_birth: '2026-01-01',
      guardian_confirmed: true,
      gestation_weeks: null,
      gestation_days: null,
    }),
  );
  expect(router.replace).toHaveBeenCalledWith('/home');
});

test('invalid fields are summarized beside the create button with the required date format', async () => {
  const app = render(<Onboarding />);
  fireEvent.changeText(app.getByLabelText(mockTranslate('id-ID', 'birth_date')), '01/01/2026');
  await act(async () => fireEvent.press(app.getByRole('button', { name: 'Buat profil bayi' })));
  const summary = app.getByTestId('onboarding-errors');
  expect(within(summary).getByText(/Nama panggilan:/)).toBeTruthy();
  expect(within(summary).getByText(/YYYY-MM-DD.*2026-01-31/)).toBeTruthy();
  expect(within(summary).getByText(mockTranslate('id-ID', 'consent_required'))).toBeTruthy();
  expect(mockAddBaby).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

test('pending save has visible feedback and repeated presses cannot create duplicates', async () => {
  let finish!: () => void;
  mockAddBaby.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
  const app = validForm();
  const button = app.getByRole('button', { name: 'Buat profil bayi' });
  await act(async () => {
    fireEvent.press(button);
    fireEvent.press(button);
  });
  expect(mockAddBaby).toHaveBeenCalledTimes(1);
  expect(app.getByRole('button', { name: 'Membuat profil bayi…' })).toBeDisabled();
  expect(router.replace).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(router.replace).toHaveBeenCalledWith('/home');
});

test('failed saves preserve entered fields, allow retry, and do not navigate', async () => {
  mockAddBaby.mockRejectedValueOnce(new Error('unauthorized'));
  const app = validForm();
  await act(async () => fireEvent.press(app.getByRole('button', { name: 'Buat profil bayi' })));
  expect(app.getByRole('alert')).toHaveTextContent(mockTranslate('id-ID', 'unauthorized'));
  expect(app.getByLabelText(mockTranslate('id-ID', 'nickname'))).toHaveDisplayValue(
    'Synthetic Baby',
  );
  expect(router.replace).not.toHaveBeenCalled();
  await act(async () => fireEvent.press(app.getByRole('button', { name: 'Buat profil bayi' })));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
});

test('offline creation gives feedback without sending a request', async () => {
  mockOnline = false;
  const app = validForm();
  await act(async () => fireEvent.press(app.getByRole('button', { name: 'Buat profil bayi' })));
  expect(app.getByRole('alert')).toHaveTextContent(
    mockTranslate('id-ID', 'profile_online_required'),
  );
  expect(mockAddBaby).not.toHaveBeenCalled();
});

test('a future birth date explains the blocked save beside the button', async () => {
  const app = validForm();
  fireEvent.changeText(app.getByLabelText(mockTranslate('id-ID', 'birth_date')), '2999-01-01');
  await act(async () => fireEvent.press(app.getByRole('button', { name: 'Buat profil bayi' })));
  expect(
    within(app.getByTestId('onboarding-errors')).getByText(
      /Tanggal lahir tidak boleh di masa depan/,
    ),
  ).toBeTruthy();
  expect(mockAddBaby).not.toHaveBeenCalled();
});
