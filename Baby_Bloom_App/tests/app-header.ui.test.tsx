import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AppHeader } from '../src/components/app-header';
import { router } from 'expo-router';
import { translate as mockTranslate, type Locale } from '../src/lib/i18n';
let mockSignedIn = false;
beforeEach(() => {
  mockSignedIn = false;
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  usePathname: () => '/welcome',
}));
jest.mock('../src/lib/store', () => {
  const React = require('react');
  return {
    useStore: () => {
      const [locale, setLocale] = React.useState('id-ID');
      return {
        locale,
        setLocale,
        session: mockSignedIn ? { user: { id: 'synthetic' } } : null,
        baby: mockSignedIn ? { id: 'synthetic-baby' } : null,
        t: (key: Parameters<typeof mockTranslate>[1]) => mockTranslate(locale as Locale, key),
      };
    },
  };
});

test('shared header exposes both languages and switches the selected locale in either direction', () => {
  const screen = render(<AppHeader />);
  expect(screen.getByRole('radio', { name: 'Bahasa' })).toBeSelected();
  fireEvent.press(screen.getByRole('radio', { name: 'English' }));
  expect(screen.getByRole('radio', { name: 'English' })).toBeSelected();
  expect(screen.getByRole('radio', { name: 'Bahasa' })).not.toBeSelected();
  fireEvent.press(screen.getByRole('radio', { name: 'Bahasa' }));
  expect(screen.getByRole('radio', { name: 'Bahasa' })).toBeSelected();
  expect(screen.getAllByRole('radio')).toHaveLength(2);
  expect(screen.getByText('Eng')).toBeTruthy();
  expect(screen.getByText('IND')).toBeTruthy();
});

test('hamburger exposes Settings in the shared header and closes after navigation', () => {
  const screen = render(<AppHeader />);
  expect(screen.queryByRole('button', { name: 'Pengaturan' })).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Buka menu' }));
  expect(screen.getByTestId('header-menu')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Pengaturan' }));
  expect(router.push).toHaveBeenLastCalledWith('/settings');
  expect(screen.queryByTestId('header-menu')).toBeNull();
});

test('header menu can be dismissed without navigating and logo returns to Welcome', () => {
  const screen = render(<AppHeader />);
  fireEvent.press(screen.getByRole('button', { name: 'Buka menu' }));
  fireEvent.press(screen.getByRole('button', { name: 'Tutup menu dengan menekan di luar' }));
  expect(screen.queryByTestId('header-menu')).toBeNull();
  fireEvent.press(screen.getByRole('link', { name: 'Beranda' }));
  expect(router.push).toHaveBeenLastCalledWith('/welcome');
});

test('signed-in header opens the home dashboard and exposes the baby profile', () => {
  mockSignedIn = true;
  const screen = render(<AppHeader />);
  fireEvent.press(screen.getByRole('link', { name: 'Beranda' }));
  expect(router.push).toHaveBeenLastCalledWith('/home');
  fireEvent.press(screen.getByRole('button', { name: 'Buka menu' }));
  fireEvent.press(screen.getByRole('button', { name: 'Profil bayi' }));
  expect(router.push).toHaveBeenLastCalledWith('/profile');
  expect(screen.queryByTestId('header-menu')).toBeNull();
});
