import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { DailyCheckin } from '../src/features/daily-checkin';
import { JournalForm } from '../src/features/journal-form';
const mockSave = jest.fn();
let mockJournalReady = true;
jest.mock('../src/lib/store', () => ({
  useStore: () => ({
    t: (key: string) => key,
    baby: { id: '80000000-0000-4000-8000-000000000001', role: 'owner', timezone: 'Asia/Jakarta' },
    events: [],
    journalReady: mockJournalReady,
    save: mockSave,
    error: null,
  }),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => '80000000-0000-4000-8000-000000000002',
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async () => '1234567812345678123456781234567812345678123456781234567812345678',
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => {},
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
beforeEach(() => {
  mockSave.mockReset().mockResolvedValue(undefined);
  mockJournalReady = true;
});
test('check-in forward/back controls retain answers, skipped fields remain unanswered and submit once', async () => {
  const app = render(<DailyCheckin />);
  fireEvent.press(app.getByRole('radio', { name: 'different' }));
  fireEvent.press(app.getByRole('button', { name: 'next_card' }));
  fireEvent.press(app.getByRole('radio', { name: 'less' }));
  fireEvent.press(app.getByRole('button', { name: 'previous_card' }));
  expect(app.getByRole('radio', { name: 'different' })).toBeSelected();
  for (let i = 0; i < 5; i++) fireEvent.press(app.getByRole('button', { name: 'next_card' }));
  fireEvent.press(app.getByRole('button', { name: 'finish_checkin' }));
  fireEvent.press(app.getByRole('button', { name: 'finish_checkin' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  const event = mockSave.mock.calls[0][0];
  expect(event.detail).toMatchObject({
    overall: 'different',
    feeding_vs_usual: 'less',
    new_symptoms: 'not_answered',
    wet_diapers_vs_usual: 'not_answered',
    sleep_concern: 'not_answered',
  });
});
test('journal rejects over-consumption and saves explicit units and nutrition source', async () => {
  const app = render(<JournalForm kind="meal" />);
  fireEvent.changeText(app.getByLabelText('food_name'), 'Synthetic oats');
  fireEvent.changeText(app.getByLabelText('portion_offered'), '10');
  fireEvent.changeText(app.getByLabelText('portion_consumed'), '20');
  fireEvent.press(app.getByRole('button', { name: 'save' }));
  await waitFor(() => expect(app.getByText('consumed_exceeds_offered')).toBeTruthy());
  expect(mockSave).not.toHaveBeenCalled();
  fireEvent.changeText(app.getByLabelText('portion_consumed'), '8');
  fireEvent.press(app.getByRole('button', { name: 'nutrition' }));
  fireEvent.changeText(app.getByLabelText('nutrition_source'), 'Synthetic label');
  fireEvent.changeText(app.getByLabelText('calories_kcal'), '30');
  fireEvent.press(app.getByRole('button', { name: 'save' }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  expect(mockSave.mock.calls[0][0].detail).toMatchObject({
    portion_unit: 'g',
    portion_consumed: 8,
    nutrition: { source: 'Synthetic label', calories_kcal: 30, protein_g: null },
  });
});
test('new journals show missing migration and cannot save into an old backend', () => {
  mockJournalReady = false;
  const app = render(<JournalForm kind="measurement" />);
  expect(app.getByText('backend_update_required')).toBeTruthy();
  expect(app.getByRole('button', { name: 'save' })).toBeDisabled();
});
