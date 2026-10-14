import React from 'react';
import { fireEvent, render, userEvent } from '@testing-library/react-native';
import { Button, Choice, ConfirmAction, Feedback } from '../src/components/ui';
import { TimestampField } from '../src/components/timestamp-field';
jest.mock('../src/lib/store', () => ({
  useStore: () => ({ t: (key: string) => key, error: null }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
test('optional observations remain unanswered until a caregiver selects an observation', () => {
  const change = jest.fn();
  const screen = render(
    <Choice
      label="Blood seen?"
      value={null}
      choices={[
        { value: null, label: 'Not entered' },
        { value: 'no', label: 'No' },
        { value: 'unsure', label: 'Unsure' },
      ]}
      onChange={change}
    />,
  );
  expect(screen.getByRole('radio', { name: 'Not entered' })).toBeSelected();
  expect(change).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('radio', { name: 'No' }));
  expect(change).toHaveBeenCalledWith('no');
});
test('delete requires an explicit second action and cancel preserves the entry', () => {
  const remove = jest.fn();
  const screen = render(
    <ConfirmAction
      title="Delete"
      description="Delete this entry?"
      cancel="Cancel"
      onConfirm={remove}
    />,
  );
  fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
  expect(remove).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(remove).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
  fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
  expect(remove).toHaveBeenCalledTimes(1);
});
test('disabled save cannot submit and validation is announced', async () => {
  const user = userEvent.setup();
  const save = jest.fn();
  const screen = render(
    <>
      <Button title="Save" disabled onPress={save} />
      <Feedback message="Check the end time" />
    </>,
  );
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Save' }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Check the end time');
});

test('timestamp editing preserves incomplete input and responds to an external reset', () => {
  const change = jest.fn();
  const screen = render(
    <TimestampField label="Start" value="2026-10-14T03:00:00.000Z" onChange={change} />,
  );
  fireEvent.changeText(screen.getByLabelText('Start · date'), '2026-10-');
  expect(change).toHaveBeenLastCalledWith('invalid');
  screen.rerender(<TimestampField label="Start" value="invalid" onChange={change} />);
  expect(screen.getByLabelText('Start · date')).toHaveDisplayValue('2026-10-');
  screen.rerender(
    <TimestampField label="Start" value="2026-10-15T04:30:00.000Z" onChange={change} />,
  );
  expect(screen.getByLabelText('Start · date')).toHaveDisplayValue('2026-10-15');
  expect(screen.getByLabelText('Start · time')).toHaveDisplayValue('11:30');
});
