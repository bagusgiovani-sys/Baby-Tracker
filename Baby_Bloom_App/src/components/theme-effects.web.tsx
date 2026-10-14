import { useEffect } from 'react';
import type { ThemeEffectsProps } from './theme-effects';
export function ThemeEffects({ palette }: ThemeEffectsProps) {
  useEffect(() => {
    for (const [key, value] of Object.entries(palette.color))
      document.documentElement.style.setProperty(`--bb-${key}`, value);
    document.documentElement.style.setProperty('--bb-glow', palette.glow);
    document.documentElement.style.colorScheme = palette.dark ? 'dark' : 'light';
  }, [palette]);
  return null;
}
