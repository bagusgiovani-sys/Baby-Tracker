import React from 'react';
import { Text, Pressable } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { StoreProvider, useStore } from '../src/lib/store';
import type { Baby } from '../src/domain/events';

const mockSession = { access_token: 'synthetic', user: { id: 'synthetic-caregiver' } };
const mockOpenLocal = jest.fn();
const mockListBabies = jest.fn();
let mockOnline = true;
let mockBabies: Baby[] = [];
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: mockSession }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      startAutoRefresh: () => {},
      stopAutoRefresh: () => {},
    },
    rpc: async () => ({ data: 3, error: null }),
  },
}));
jest.mock('expo-network', () => ({
  useNetworkState: () => ({ isConnected: mockOnline, isInternetReachable: mockOnline }),
}));
jest.mock('../src/lib/preferences', () => ({
  readPreferences: async () => null,
  writePreferences: async () => {},
}));
jest.mock('../src/data/local/open', () => ({ openLocal: () => mockOpenLocal() }));
jest.mock('../src/data/remote/supabase', () => ({
  listBabies: () => mockListBabies(),
  remote: {},
  pullEvents: async () => null,
}));
jest.mock('../src/data/sync/worker', () => ({
  SyncWorker: class {
    async run() {}
  },
}));
jest.mock('../src/data/local/repository', () => ({
  LocalRepository: class {
    ownerId: string;
    constructor(_driver: unknown, ownerId: string) {
      this.ownerId = ownerId;
    }
    async initialize() {}
    async babies() {
      return mockBabies;
    }
    async setBabies(value: Baby[]) {
      mockBabies = value;
    }
    async events() {
      return [];
    }
    async pending() {
      return [];
    }
    async pullCursor() {
      return null;
    }
    async retry() {}
  },
}));
function Probe() {
  const store = useStore();
  return (
    <>
      <Text>{store.authReady ? 'auth ready' : 'auth pending'}</Text>
      <Text>{store.ready ? 'storage ready' : 'storage pending'}</Text>
      <Text>{store.profilesReady ? 'profiles ready' : 'profiles pending'}</Text>
      <Text>{store.error ?? 'no error'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry"
        onPress={() => void store.retry()}
      >
        <Text>Retry</Text>
      </Pressable>
    </>
  );
}
beforeEach(() => {
  mockOnline = true;
  mockBabies = [];
  mockOpenLocal.mockReset().mockResolvedValue({});
  mockListBabies.mockReset().mockResolvedValue([]);
});

test('restored auth opens public startup without waiting for encrypted diary initialization', async () => {
  let finish!: (value: unknown) => void;
  mockOpenLocal.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const app = render(
    <StoreProvider>
      <Probe />
    </StoreProvider>,
  );
  await waitFor(() => expect(app.getByText('auth ready')).toBeTruthy());
  expect(app.getByText('storage pending')).toBeTruthy();
  expect(app.getByText('profiles pending')).toBeTruthy();
  await act(async () => {
    finish({});
  });
  await waitFor(() => expect(app.getByText('profiles ready')).toBeTruthy());
});

test('initial profile fetch stays pending until the server confirms an empty profile list', async () => {
  let finish!: (value: Baby[]) => void;
  mockListBabies.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const app = render(
    <StoreProvider>
      <Probe />
    </StoreProvider>,
  );
  await waitFor(() => expect(mockListBabies).toHaveBeenCalled());
  expect(app.getByText('profiles pending')).toBeTruthy();
  await act(async () => {
    finish([]);
  });
  await waitFor(() => expect(app.getByText('profiles ready')).toBeTruthy());
});

test('a failed encrypted store can actually be reopened by Retry', async () => {
  mockOpenLocal.mockRejectedValueOnce(new Error('Synthetic transient storage failure'));
  const app = render(
    <StoreProvider>
      <Probe />
    </StoreProvider>,
  );
  await waitFor(() => expect(app.getByText('storage_error')).toBeTruthy());
  fireEvent.press(app.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(app.getByText('profiles ready')).toBeTruthy());
  expect(mockOpenLocal).toHaveBeenCalledTimes(2);
  expect(app.getByText('no error')).toBeTruthy();
});

test('a failed profile request can be retried and does not masquerade as an account with no baby', async () => {
  mockListBabies.mockRejectedValueOnce(new Error('error'));
  const app = render(
    <StoreProvider>
      <Probe />
    </StoreProvider>,
  );
  await waitFor(() => expect(app.getByText('error')).toBeTruthy());
  expect(app.getByText('profiles pending')).toBeTruthy();
  fireEvent.press(app.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(app.getByText('profiles ready')).toBeTruthy());
  expect(app.getByText('no error')).toBeTruthy();
});

test('offline startup without a cached profile shows recovery instead of claiming onboarding is ready', async () => {
  mockOnline = false;
  const app = render(
    <StoreProvider>
      <Probe />
    </StoreProvider>,
  );
  await waitFor(() => expect(app.getByText('offline_profile_unavailable')).toBeTruthy());
  expect(app.getByText('profiles pending')).toBeTruthy();
  expect(mockListBabies).not.toHaveBeenCalled();
});
