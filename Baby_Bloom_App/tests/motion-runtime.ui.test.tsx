/** @jest-environment jsdom */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HeartMark, MotionPage, MotionSurface } from '../src/components/motion.web';
import { FetusMark } from '../src/components/fetus-mark.web';
import { LaunchTransition } from '../src/components/launch-motion.web';
import { LanguageTransition } from '../src/components/language-transition.web';
jest.mock('../src/components/fetus-mark', () =>
  jest.requireActual('../src/components/fetus-mark.web'),
);

// Use the actual Framer Motion engine; only browser APIs absent from jsdom
// are supplied here. This validates playback, not browser appearance.
let root: Root;
let host: HTMLDivElement;
let systemReduced = false;
const mediaListeners = new Set<() => void>();
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      get matches() {
        return query.includes('prefers-reduced-motion') && systemReduced;
      },
      media: query,
      addListener() {},
      removeListener() {},
      addEventListener(_name: string, listener: () => void) {
        mediaListeners.add(listener);
      },
      removeEventListener(_name: string, listener: () => void) {
        mediaListeners.delete(listener);
      },
    }),
  });
  class Observer {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ target, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: Observer });
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true,
  });
});
beforeEach(() => {
  systemReduced = false;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

test('motion remains on with device reduction and previously saved reduced preference', async () => {
  systemReduced = true;
  localStorage.setItem('babybloom.motion', 'reduced');
  await act(async () => root.render(<HeartMark />));
  await frameAfter(120);
  const heart = host.querySelector('g')!;
  const moving = heart.style.transform;
  await frameAfter(250);
  expect(heart.style.transform).not.toBe(moving);
  await act(async () => {
    systemReduced = false;
    mediaListeners.forEach((listener) => listener());
  });
  await frameAfter(130);
  const restarted = heart.style.transform;
  await frameAfter(210);
  expect(heart.style.transform).not.toBe(restarted);
  localStorage.clear();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function frameAfter(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

test('language changes animate translated content without replacing focused draft inputs', async () => {
  const screen = (locale: string) => (
    <LanguageTransition locale={locale}>
      <label htmlFor="synthetic-draft">{locale === 'en' ? 'Email' : 'Surel'}</label>
      <input id="synthetic-draft" defaultValue="" />
    </LanguageTransition>
  );
  await act(async () => root.render(screen('en')));
  const surface = host.firstElementChild as HTMLElement;
  const input = host.querySelector('input')!;
  input.value = 'synthetic draft';
  input.focus();
  input.setSelectionRange(3, 7);
  await act(async () => root.render(screen('id-ID')));
  expect(host.querySelector('label')!.textContent).toBe('Surel');
  expect(Number(surface.style.opacity)).toBeLessThan(1);
  await frameAfter(80);
  expect(Number(surface.style.opacity)).toBeGreaterThan(0.2);
  expect(Number(surface.style.opacity)).toBeLessThan(1);
  await frameAfter(400);
  expect(Number(surface.style.opacity)).toBeCloseTo(1);
  expect(host.querySelector('input')).toBe(input);
  expect(input.value).toBe('synthetic draft');
  expect(document.activeElement).toBe(input);
  expect(input.selectionStart).toBe(3);
  expect(input.selectionEnd).toBe(7);
  await act(async () => root.render(screen('en')));
  await frameAfter(40);
  await act(async () => root.render(screen('id-ID')));
  await frameAfter(450);
  expect(host.querySelector('label')!.textContent).toBe('Surel');
  expect(Number(surface.style.opacity)).toBeCloseTo(1);
  expect(host.querySelector('input')).toBe(input);
});

test('the real Framer engine changes the heart transform over successive frames', async () => {
  await act(async () => root.render(<HeartMark />));
  const heart = host.querySelector('g')!;
  await frameAfter(120);
  const first = heart.style.transform;
  await frameAfter(280);
  const second = heart.style.transform;
  expect(first).not.toBe('');
  expect(second).not.toBe(first);
});

test('the real Framer engine completes page and viewport entrances', async () => {
  await act(async () =>
    root.render(
      <MotionPage cycle={1}>
        <MotionSurface>
          <input defaultValue="draft" />
        </MotionSurface>
      </MotionPage>,
    ),
  );
  const page = host.firstElementChild as HTMLElement;
  expect(Number(page.style.opacity)).toBeLessThan(1);
  await frameAfter(700);
  expect(Number(page.style.opacity)).toBeCloseTo(1);
  const section = page.firstElementChild as HTMLElement;
  expect(Number(section.style.opacity)).toBeCloseTo(1);
  expect(host.querySelector('input')!.value).toBe('draft');
});

test('fetus artwork pulses with the actual engine even when the device reduces motion', async () => {
  systemReduced = true;
  await act(async () => root.render(<FetusMark />));
  const fetus = host.querySelector<SVGGElement>('[data-fetus-body]')!;
  await frameAfter(100);
  const first = fetus.style.transform;
  await frameAfter(260);
  expect(fetus.style.transform).not.toBe(first);
});

test('web splash exits before mounting the app and does not return on content updates', async () => {
  const intro = (visible: boolean, text: string) => (
    <LaunchTransition
      visible={visible}
      greeting="Hi, Mom!"
      subtitle="Every little moment, together."
    >
      <input defaultValue={text} />
    </LaunchTransition>
  );
  await act(async () => root.render(intro(true, 'draft')));
  expect(host.querySelector('[data-motion="launch-splash"]')?.getAttribute('aria-label')).toBe(
    'Hi, Mom!',
  );
  expect(host.querySelector('input')).toBeNull();
  await act(async () => root.render(intro(false, 'draft')));
  await frameAfter(800);
  expect(host.querySelector('[data-motion="launch-splash"]')).toBeNull();
  const input = host.querySelector('input')!;
  expect(input.value).toBe('draft');
  input.value = 'unsaved input';
  await act(async () => root.render(intro(false, 'updated route')));
  expect(host.querySelector('[data-motion="launch-splash"]')).toBeNull();
  expect(host.querySelector('input')!.value).toBe('unsaved input');
});
