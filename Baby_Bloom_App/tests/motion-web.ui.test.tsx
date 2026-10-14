import React, { useEffect, useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeartMark, MotionPage, MotionSurface, SkeletonBlock } from '../src/components/motion.web';

const mockSet = jest.fn();
const mockStart = jest.fn().mockResolvedValue(undefined);
const mockControls = { set: mockSet, start: mockStart, stop: jest.fn() };
let mockVisible = true;
jest.mock('framer-motion', () => {
  const React = require('react');
  const elements = new Map();
  return {
    useInView: () => mockVisible,
    useAnimationControls: () => mockControls,
    motion: new Proxy(
      {},
      {
        get: (_target, tag) => {
          if (!elements.has(tag))
            elements.set(
              tag,
              React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
                React.createElement(tag, { ...props, ref }),
              ),
            );
          return elements.get(tag);
        },
      },
    ),
  };
});
let tree: ReactTestRenderer;
beforeEach(() => {
  mockVisible = true;
  mockSet.mockClear();
  mockStart.mockClear();
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
});

test('replaying page and section entrances preserves unsubmitted input and does not remount children', () => {
  const mounted = jest.fn();
  const unmounted = jest.fn();
  function Input() {
    const [value, setValue] = useState('');
    useEffect(() => {
      mounted();
      return unmounted;
    }, []);
    return <input value={value} onChange={(event) => setValue(event.target.value)} />;
  }
  const page = (cycle: number) => (
    <MotionPage cycle={cycle}>
      <MotionSurface>
        <Input />
      </MotionSurface>
    </MotionPage>
  );
  act(() => {
    tree = create(page(1));
  });
  act(() => {
    tree.root.findByType('input').props.onChange({ target: { value: 'unsaved draft' } });
  });
  mockStart.mockClear();
  act(() => tree.update(page(2)));
  expect(tree.root.findByType('input').props.value).toBe('unsaved draft');
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
  expect(mockStart).toHaveBeenCalledTimes(2);
});

test('below-fold sections wait until entering the viewport', () => {
  mockVisible = false;
  act(() => {
    tree = create(
      <MotionSurface>
        <div>section</div>
      </MotionSurface>,
    );
  });
  expect(mockStart).not.toHaveBeenCalled();
  mockVisible = true;
  act(() =>
    tree.update(
      <MotionSurface>
        <div>section</div>
      </MotionSurface>,
    ),
  );
  expect(mockStart).toHaveBeenCalledTimes(1);
});

test('skeleton shimmer is always animated and remains decorative', () => {
  act(() => {
    tree = create(
      <MotionSurface>
        <SkeletonBlock />
      </MotionSurface>,
    );
  });
  expect(mockStart).toHaveBeenCalled();
  const skeleton = tree.root.findByProps({ 'data-motion': 'skeleton' });
  expect(skeleton.props['aria-hidden']).toBe('true');
  expect(skeleton.children).toHaveLength(1);
});

test('heart animation is decorative and continuously pulses', () => {
  act(() => {
    tree = create(<HeartMark />);
  });
  expect(tree.root.findByProps({ 'data-motion': 'care-heart' }).props['aria-hidden']).toBe('true');
  expect(tree.root.findByType('g').props.animate.scale).toHaveLength(5);
  expect(tree.root.findByType('g').props.transition.repeat).toBe(Infinity);
});
