import { palettes, themeGeometry } from './theme-palette';
import { useAppearance } from './theme-state';
export const theme = { color: palettes.neon.color, ...themeGeometry };
export type AppTheme = typeof theme;
export function useTheme(): AppTheme {
  const { themeId } = useAppearance();
  return { color: palettes[themeId].color, ...themeGeometry };
}
