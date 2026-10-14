import type { palettes } from '../lib/theme-palette';
export type ThemeEffectsProps = { palette: (typeof palettes)[keyof typeof palettes] };
export function ThemeEffects(_props: ThemeEffectsProps) {
  return null;
}
