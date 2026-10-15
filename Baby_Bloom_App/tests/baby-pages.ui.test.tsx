import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import Home from '../src/features/home-screen';
import Profile from '../src/features/profile-screen';
import type { Baby, SavedEvent } from '../src/domain/events';
import { translate as mockTranslate, type TextKey } from '../src/lib/i18n';

const mockBaby: Baby = {
  id: 'synthetic-baby',
  nickname: 'Synthetic Baby',
  date_of_birth: '2026-01-01',
  timezone: 'Asia/Jakarta',
  gestation_weeks: 32,
  gestation_days: 0,
  growth_reference_sex: 'female',
  role: 'owner',
};
const mockSelectBaby = jest.fn();
let mockEvents: SavedEvent[] = [];
let mockRole: Baby['role'] = 'owner';
jest.mock('../src/lib/store', () => ({
  useStore: () => ({
    baby: { ...mockBaby, role: mockRole },
    babies: [mockBaby],
    events: mockEvents,
    online: true,
    locale: 'en',
    selectBaby: mockSelectBaby,
    t: (key: TextKey) => mockTranslate('en', key),
    error: null,
  }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), canGoBack: () => false },
  useFocusEffect: () => {},
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-03-10T12:00:00Z'));
  mockEvents = [];
  mockRole = 'owner';
  jest.mocked(router.push).mockClear();
  mockSelectBaby.mockClear();
});
afterEach(() => jest.useRealTimers());

test('empty home offers real profile/measurement actions and displays unknowns without health reassurance', () => {
  const app = render(<Home />);
  expect(app.getByText('Synthetic Baby')).toBeTruthy();
  expect(app.getByText('Start with one measurement')).toBeTruthy();
  expect(app.getByText('Not assessed')).toBeTruthy();
  expect(app.getAllByText('Not recorded').length).toBeGreaterThan(3);
  fireEvent.press(app.getByRole('button', { name: 'View baby profile' }));
  expect(router.push).toHaveBeenLastCalledWith('/profile');
  fireEvent.press(app.getByRole('button', { name: 'Record a measurement' }));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/log/[kind]',
    params: { kind: 'measurement' },
  });
});

test('profile renders stored birth context and viewer cannot record a measurement', () => {
  mockRole = 'viewer';
  const app = render(<Profile />);
  expect(app.getByText('January 1, 2026')).toBeTruthy();
  expect(app.getByText('Asia/Jakarta')).toBeTruthy();
  expect(app.getByText('32 weeks')).toBeTruthy();
  expect(app.getByText('Read-only access')).toBeTruthy();
  expect(app.getByRole('button', { name: 'Record a measurement' })).toBeDisabled();
  fireEvent.press(app.getByRole('radio', { name: 'Synthetic Baby' }));
  expect(mockSelectBaby).toHaveBeenCalledWith(mockBaby.id);
});

test('home distinguishes a lower pending measurement from an underweight diagnosis', () => {
  const measure = (value: number, at: string): SavedEvent => ({
    id: at,
    baby_id: mockBaby.id,
    event_type: 'measurement',
    occurred_at: at,
    ended_at: null,
    detail: { weight_kg: value, length_cm: null, head_cm: null },
    note: null,
    recorded_by: 'synthetic',
    deleted_at: null,
    server_version: 0,
    sync_status: 'queued',
  });
  mockEvents = [measure(4, '2026-03-01T12:00:00Z'), measure(3.8, '2026-03-09T12:00:00Z')];
  const app = render(<Home />);
  expect(app.getByText('-0.2 kg')).toBeTruthy();
  expect(app.getByText('Recorded weight is lower than the previous measurement.')).toBeTruthy();
  expect(app.getByText('Saved on this device; not synced yet')).toBeTruthy();
  expect(app.getByText('Not assessed')).toBeTruthy();
});
