import React from 'react';
import { Text, Pressable } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { StoreProvider, useStore } from '../src/lib/store';
import type { Baby, BabyInput } from '../src/domain/events';

const mockSession = { access_token: 'synthetic', user: { id: 'synthetic-caregiver' } };
const mockOpenLocal = jest.fn();
const mockListBabies = jest.fn();
const mockCreateBaby = jest.fn();
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
  createBaby: (input: BabyInput) => mockCreateBaby(input),
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
      <Text>{store.signInVerified ? 'sign-in verified' : 'sign-in pending'}</Text>
      <Text>{store.error ?? 'no error'}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Verified sign-in"
        onPress={store.completeSignIn}
      >
        <Text>Verified sign-in</Text>
      </Pressable>
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
  mockCreateBaby.mockReset();
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

test('verified sign-in reopens failed diary storage and keeps its completion callback stable', async () => {
  mockOpenLocal.mockRejectedValueOnce(new Error('storage_in_use'));
  const completions: (() => void)[] = [];
  function CompletionProbe() {
    completions.push(useStore().completeSignIn);
    return <Probe />;
  }
  const app = render(
    <StoreProvider>
      <CompletionProbe />
    </StoreProvider>,
  );
  await waitFor(() => expect(app.getByText('storage_in_use')).toBeTruthy());
  expect(app.getByText('sign-in pending')).toBeTruthy();
  fireEvent.press(app.getByRole('button', { name: 'Verified sign-in' }));
  await waitFor(() => expect(app.getByText('profiles ready')).toBeTruthy());
  expect(app.getByText('sign-in verified')).toBeTruthy();
  expect(app.getByText('no error')).toBeTruthy();
  expect(mockOpenLocal).toHaveBeenCalledTimes(2);
  expect(new Set(completions).size).toBe(1);
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

test('creating a baby completes and selects it while background profile refresh is still pending', async () => {
  const input: BabyInput = {
    nickname: 'Synthetic Baby',
    date_of_birth: '2026-01-01',
    timezone: 'Asia/Jakarta',
    gestation_weeks: null,
    gestation_days: null,
    growth_reference_sex: null,
    guardian_confirmed: true,
    policy_version: '2026-10-draft',
  };
  const baby: Baby = { ...input, id: 'synthetic-baby', role: 'owner' };
  mockCreateBaby.mockResolvedValue(baby);
  const completed = jest.fn();
  function CreationProbe() {
    const store = useStore();
    return (
      <>
        <Probe />
        <Text>{store.baby?.nickname ?? 'no selected baby'}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create"
          onPress={() => void store.addBaby(input).then(completed)}
        >
          <Text>Create</Text>
        </Pressable>
      </>
    );
  }
  const app = render(
    <StoreProvider>
      <CreationProbe />
    </StoreProvider>,
  );
  await waitFor(() => expect(app.getByText('profiles ready')).toBeTruthy());
  let finishRefresh!: (babies: Baby[]) => void;
  mockListBabies.mockImplementation(
    () => new Promise<Baby[]>((resolve) => (finishRefresh = resolve)),
  );
  await act(async () => fireEvent.press(app.getByRole('button', { name: 'Create' })));
  await waitFor(() => expect(completed).toHaveBeenCalledTimes(1));
  expect(app.getByText('Synthetic Baby')).toBeTruthy();
  expect(mockBabies).toEqual([baby]);
  expect(mockCreateBaby).toHaveBeenCalledTimes(1);
  await act(async () => finishRefresh([baby]));
});
