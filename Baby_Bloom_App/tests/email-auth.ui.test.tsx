import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { EmailAuthForm } from '../src/features/email-auth';
import { translate as mockTranslate } from '../src/lib/i18n';
const mockLogin = jest.fn();
const mockSignup = jest.fn();
const mockReset = jest.fn();
const mockUpdate = jest.fn();
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockLogin(...args),
      signUp: (...args: unknown[]) => mockSignup(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockReset(...args),
      updateUser: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));
jest.mock('../src/lib/store', () => ({
  useStore: () => ({
    t: (key: Parameters<typeof mockTranslate>[1]) => mockTranslate('en', key),
    error: null,
  }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
beforeEach(() => {
  mockLogin.mockReset().mockResolvedValue({ data: { session: {} }, error: null });
  mockSignup.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  mockReset.mockReset().mockResolvedValue({ error: null });
  mockUpdate.mockReset().mockResolvedValue({ error: null });
});
const email = () => fireEvent.changeText(screen.getByLabelText('Email'), ' parent@example.com ');
const password = () =>
  fireEvent.changeText(screen.getByLabelText('Password'), ' synthetic password ');
async function press(name: string) {
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name }));
  });
}

test('password login calls password API directly, preserves password whitespace, and enters only with a session', async () => {
  const verified = jest.fn();
  render(<EmailAuthForm onVerified={verified} />);
  expect(screen.queryByLabelText('Code from your email')).toBeNull();
  email();
  password();
  expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  mockLogin.mockResolvedValueOnce({
    data: { session: null },
    error: { code: 'invalid_credentials' },
  });
  await press('Sign in');
  expect(verified).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(/Incorrect email or password/);
  await press('Sign in');
  expect(mockLogin).toHaveBeenLastCalledWith({
    email: 'parent@example.com',
    password: ' synthetic password ',
  });
  expect(verified).toHaveBeenCalledTimes(1);
  expect(mockSignup).not.toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();
});
test('registration validates matching strong-enough passwords and waits for required email confirmation', async () => {
  const verified = jest.fn();
  render(<EmailAuthForm onVerified={verified} />);
  await press('New here? Create an account');
  email();
  fireEvent.changeText(screen.getByLabelText('Password'), 'short');
  await press('Create account');
  expect(mockSignup).not.toHaveBeenCalled();
  password();
  await press('Create account');
  expect(screen.getByRole('alert')).toHaveTextContent(/Both passwords must match/);
  fireEvent.changeText(screen.getByLabelText('Confirm password'), ' synthetic password ');
  await press('Create account');
  expect(mockSignup).toHaveBeenCalledWith(
    expect.objectContaining({
      email: 'parent@example.com',
      password: ' synthetic password ',
      options: { emailRedirectTo: 'babybloom://auth/callback' },
    }),
  );
  expect(verified).not.toHaveBeenCalled();
  expect(screen.getByText(/Check your email to confirm registration/)).toBeTruthy();
  expect(screen.getByLabelText('Password')).toHaveDisplayValue('');
});
test('registration enters immediately when backend returns an authenticated session', async () => {
  mockSignup.mockResolvedValue({ data: { session: {} }, error: null });
  const verified = jest.fn();
  render(<EmailAuthForm onVerified={verified} />);
  await press('New here? Create an account');
  email();
  password();
  fireEvent.changeText(screen.getByLabelText('Confirm password'), ' synthetic password ');
  await press('Create account');
  expect(verified).toHaveBeenCalledTimes(1);
});
test('recovery requests do not sign in and give neutral delivery feedback', async () => {
  const verified = jest.fn();
  render(<EmailAuthForm onVerified={verified} />);
  await press('Forgot password?');
  email();
  await press('Send recovery email');
  expect(mockReset).toHaveBeenCalledWith('parent@example.com', {
    redirectTo: 'babybloom://auth/callback',
  });
  expect(screen.getByText(/If the account can be recovered/)).toBeTruthy();
  expect(verified).not.toHaveBeenCalled();
  expect(mockLogin).not.toHaveBeenCalled();
});
test('recovery updates password and waits for success before continuing', async () => {
  const verified = jest.fn();
  render(<EmailAuthForm recovery onVerified={verified} />);
  password();
  fireEvent.changeText(screen.getByLabelText('Confirm password'), ' synthetic password ');
  mockUpdate.mockResolvedValueOnce({ error: { code: 'weak_password' } });
  await press('Save password and continue');
  expect(verified).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(/too weak/);
  await press('Save password and continue');
  expect(mockUpdate).toHaveBeenLastCalledWith({ password: ' synthetic password ' });
  expect(verified).toHaveBeenCalledTimes(1);
});
test('validation, server rate limits and thrown network failures never report success', async () => {
  render(<EmailAuthForm />);
  await press('Sign in');
  expect(mockLogin).not.toHaveBeenCalled();
  email();
  await press('Sign in');
  expect(mockLogin).not.toHaveBeenCalled();
  password();
  mockLogin.mockResolvedValueOnce({ data: {}, error: { status: 429 } });
  await press('Sign in');
  expect(screen.getByRole('alert')).toHaveTextContent(/Too many attempts/);
  mockLogin.mockRejectedValueOnce(new Error('network'));
  await press('Sign in');
  expect(screen.getByRole('alert')).toHaveTextContent(/request did not succeed/);
});
test('synchronous duplicate submit guard prevents two login requests', async () => {
  let finish!: (value: unknown) => void;
  mockLogin.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(<EmailAuthForm />);
  email();
  password();
  const button = screen.getByRole('button', { name: 'Sign in' });
  act(() => {
    fireEvent.press(button);
    fireEvent.press(button);
  });
  expect(mockLogin).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();
  await act(async () => {
    finish({ data: { session: {} }, error: null });
  });
});
