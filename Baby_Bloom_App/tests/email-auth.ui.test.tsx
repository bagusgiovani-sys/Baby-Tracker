import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { EmailAuthForm } from '../src/features/email-auth';
import { translate as mockTranslate } from '../src/lib/i18n';

const mockSend = jest.fn();
const mockVerify = jest.fn();
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSend(...args),
      verifyOtp: (...args: unknown[]) => mockVerify(...args),
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
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-14T08:00:00Z'));
  mockSend.mockReset().mockResolvedValue({ error: null });
  mockVerify.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => {
  jest.useRealTimers();
});
async function requestEmail() {
  fireEvent.changeText(screen.getByLabelText('Email'), ' parent@example.com ');
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Send sign-in email' }));
  });
}
test('one email flow explicitly supports account creation and verification; duplicate sends cannot bypass cooldown', async () => {
  render(<EmailAuthForm />);
  expect(screen.getByText(/same email flow signs you in or creates your account/)).toBeTruthy();
  await requestEmail();
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledWith(
    expect.objectContaining({
      email: 'parent@example.com',
      options: expect.objectContaining({ shouldCreateUser: true }),
    }),
  );
  expect(screen.getByRole('button', { name: 'Resend available in 60s' })).toBeDisabled();
  act(() => {
    jest.advanceTimersByTime(60000);
  });
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Resend email / code' }));
  });
  expect(mockSend).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Sign-in email resent. Use the latest email.')).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Code from your email'), '123456');
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  });
  expect(mockVerify).toHaveBeenCalledWith({
    email: 'parent@example.com',
    token: '123456',
    type: 'email',
  });
});

test('navigation after sign-in occurs only after successful code verification', async () => {
  const verified = jest.fn();
  render(<EmailAuthForm onVerified={verified} />);
  await requestEmail();
  expect(verified).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Code from your email'), '123456');
  mockVerify.mockResolvedValueOnce({ error: { code: 'otp_expired' } });
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  });
  expect(verified).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  });
  expect(verified).toHaveBeenCalledTimes(1);
});
test('failed resend preserves the entered code and permits retry instead of falsely reporting delivery', async () => {
  render(<EmailAuthForm />);
  await requestEmail();
  fireEvent.changeText(screen.getByLabelText('Code from your email'), '654321');
  act(() => {
    jest.advanceTimersByTime(60000);
  });
  mockSend.mockResolvedValueOnce({ error: { status: 503, code: 'unexpected_failure' } });
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Resend email / code' }));
  });
  expect(screen.getByLabelText('Code from your email')).toHaveDisplayValue('654321');
  expect(screen.getByRole('alert')).toHaveTextContent(/The email could not be sent/);
  expect(screen.queryByText('Sign-in email resent. Use the latest email.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Resend email / code' })).toBeEnabled();
});
test('change email unlocks the address without bypassing the sending cooldown', async () => {
  render(<EmailAuthForm />);
  await requestEmail();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Change email address' }));
  });
  expect(screen.getByLabelText('Email').props.editable).toBe(true);
  expect(screen.queryByLabelText('Code from your email')).toBeNull();
  expect(screen.getByRole('button', { name: 'Send sign-in email' })).toBeDisabled();
  fireEvent.changeText(screen.getByLabelText('Email'), 'another@example.com');
  act(() => {
    jest.advanceTimersByTime(60000);
  });
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Send sign-in email' }));
  });
  expect(mockSend).toHaveBeenLastCalledWith(
    expect.objectContaining({ email: 'another@example.com' }),
  );
});
test('invalid emails never request delivery and server rate limits receive a bounded actionable message', async () => {
  render(<EmailAuthForm />);
  fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Send sign-in email' }));
  });
  expect(mockSend).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
  mockSend.mockResolvedValueOnce({ error: { status: 429, code: 'over_email_send_rate_limit' } });
  await requestEmail();
  expect(screen.getByRole('alert')).toHaveTextContent(/Too many email requests/);
  expect(screen.queryByLabelText('Code from your email')).toBeNull();
  expect(screen.getByRole('button', { name: 'Send sign-in email' })).toBeDisabled();
});
test('in-flight requests block another send and an empty code cannot reach verification', async () => {
  let resolveSend!: (value: { error: null }) => void;
  mockSend.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveSend = resolve;
      }),
  );
  render(<EmailAuthForm />);
  fireEvent.changeText(screen.getByLabelText('Email'), 'parent@example.com');
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Send sign-in email' }));
  });
  expect(screen.getByRole('button', { name: 'Sending email…' })).toBeDisabled();
  expect(mockSend).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolveSend({ error: null });
  });
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  });
  expect(mockVerify).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(/This code is invalid or expired/);
});
