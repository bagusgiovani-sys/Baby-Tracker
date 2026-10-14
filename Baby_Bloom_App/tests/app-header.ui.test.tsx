import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AppHeader } from '../src/components/app-header';
import { translate as mockTranslate, type Locale } from '../src/lib/i18n';
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/lib/store', () => {
  const React = require('react');
  return {
    useStore: () => {
      const [locale, setLocale] = React.useState('id-ID');
      return {
        locale,
        setLocale,
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
});
