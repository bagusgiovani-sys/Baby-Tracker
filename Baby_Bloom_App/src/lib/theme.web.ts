import { palettes, themeGeometry } from './theme-palette';
import { useAppearance } from './theme-state';
const color = Object.fromEntries(
  Object.entries(palettes.neon.color).map(([key, value]) => [key, `var(--bb-${key},${value})`]),
) as Record<keyof typeof palettes.neon.color, string>;
export const theme = { color, ...themeGeometry };
export type AppTheme = typeof theme;
export function useTheme(): AppTheme {
  useAppearance();
  return theme;
}
