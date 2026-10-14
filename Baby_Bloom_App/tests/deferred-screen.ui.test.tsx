import React, { lazy } from 'react';
import { Text, View } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { DeferredScreen } from '../src/components/deferred-screen';
jest.mock('../src/lib/store', () => ({
  useStore: () => ({ t: (key: string) => key, error: null }),
}));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, useFocusEffect: jest.fn() }));
jest.mock('../src/components/ui', () => {
  const actual = jest.requireActual('../src/components/ui');
  const React = require('react');
  const { View } = require('react-native');
  return {
    ...actual,
    Screen: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

test('lazy module is not requested until its screen is rendered; an accessible skeleton covers loading', async () => {
  let resolve!: (value: { default: React.ComponentType }) => void;
  const request = jest.fn(
    () =>
      new Promise<{ default: React.ComponentType }>((done) => {
        resolve = done;
      }),
  );
  const LazyScreen = lazy(request);
  expect(request).not.toHaveBeenCalled();
  const screen = render(
    <DeferredScreen form>
      <LazyScreen />
    </DeferredScreen>,
  );
  await act(async () => {});
  expect(request).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('progressbar', { name: 'loading' })).toBeBusy();
  expect(screen.queryByText('loaded form')).toBeNull();
  await act(async () => {
    resolve({
      default: () => (
        <View>
          <Text>loaded form</Text>
        </View>
      ),
    });
  });
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(screen.getByText('loaded form')).toBeTruthy();
});

test('failed module downloads provide translated recovery instead of endless loading', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const LazyScreen = lazy(() => Promise.reject(new Error('synthetic chunk failure')));
    const screen = render(
      <DeferredScreen>
        <LazyScreen />
      </DeferredScreen>,
    );
    await act(async () => {});
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('screen_load_failed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'retry' })).toBeTruthy();
  } finally {
    consoleError.mockRestore();
  }
});
