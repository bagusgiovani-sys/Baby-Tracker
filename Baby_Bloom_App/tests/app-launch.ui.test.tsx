import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { AppLaunch, INTRO_DURATION_MS } from '../src/components/app-launch';
import { translate as mockTranslate } from '../src/lib/i18n';
let mockReady = true;
jest.mock('../src/lib/store', () => ({
  useStore: () => ({
    authReady: mockReady,
    t: (key: Parameters<typeof mockTranslate>[1]) => mockTranslate('en', key),
  }),
}));
beforeEach(() => {
  jest.useFakeTimers();
  mockReady = true;
});
afterEach(() => {
  jest.useRealTimers();
});

test('startup greeting finishes once and does not replay on route content changes', () => {
  const screen = render(
    <AppLaunch>
      <Text>first route</Text>
    </AppLaunch>,
  );
  expect(screen.getByRole('progressbar', { name: 'Hi, Mom!' })).toBeBusy();
  expect(screen.queryByText('first route')).toBeNull();
  act(() => {
    jest.advanceTimersByTime(INTRO_DURATION_MS - 1);
  });
  expect(screen.queryByText('first route')).toBeNull();
  act(() => {
    jest.advanceTimersByTime(1);
  });
  expect(screen.getByText('first route')).toBeTruthy();
  screen.rerender(
    <AppLaunch>
      <Text>second route</Text>
    </AppLaunch>,
  );
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(screen.getByText('second route')).toBeTruthy();
});

test('splash remains while authentication is restoring, then opens the app without another intro delay', () => {
  mockReady = false;
  const screen = render(
    <AppLaunch>
      <Text>ready app</Text>
    </AppLaunch>,
  );
  act(() => {
    jest.advanceTimersByTime(INTRO_DURATION_MS + 500);
  });
  expect(screen.queryByText('ready app')).toBeNull();
  mockReady = true;
  screen.rerender(
    <AppLaunch>
      <Text>ready app</Text>
    </AppLaunch>,
  );
  expect(screen.getByText('ready app')).toBeTruthy();
});
