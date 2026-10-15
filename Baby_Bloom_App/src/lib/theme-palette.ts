export const themeIds = ['neon', 'unicorn', 'candy'] as const;
export type ThemeId = (typeof themeIds)[number];
export const themeGeometry = {
  radius: { card: 24, button: 14, input: 12 },
  space: { sm: 8, md: 16, lg: 24, xl: 32 },
};
export const palettes = {
  neon: {
    color: {
      canvas: '#060A08',
      paper: '#101713',
      ink: '#EDF5EF',
      muted: '#9AADA0',
      brand: '#ADFF70',
      accentInk: '#ADFF70',
      onBrand: '#101B0B',
      border: '#283A2D',
      mint: '#17291B',
      peach: '#1B2516',
      blue: '#142923',
      warning: '#FFCA80',
      elevated: '#16201A',
    },
    dark: true,
    glow: '173,255,112',
    swatches: ['#060A08', '#17291B', '#ADFF70', '#EDF5EF'],
  },
  unicorn: {
    color: {
      canvas: '#FFF5FD',
      paper: '#FFFFFF',
      ink: '#372348',
      muted: '#756080',
      brand: '#9333EA',
      accentInk: '#9333EA',
      onBrand: '#FFFFFF',
      border: '#E7D6F6',
      mint: '#F8DDF0',
      peach: '#EEE5FF',
      blue: '#E3F1FF',
      warning: '#9B4B0F',
      elevated: '#F3E9FF',
    },
    dark: false,
    glow: '147,51,234',
    swatches: ['#F9A8D4', '#A78BFA', '#93C5FD', '#FFFFFF'],
  },
  candy: {
    color: {
      canvas: '#B9E6FF',
      paper: '#A2DAFF',
      ink: '#20375B',
      muted: '#344C70',
      brand: '#FF8FCB',
      accentInk: '#21457A',
      onBrand: '#4C2240',
      border: '#6AAED9',
      mint: '#FFC9E7',
      peach: '#FFE1F0',
      blue: '#6DC5FF',
      warning: '#783410',
      elevated: '#79CAFF',
    },
    dark: false,
    glow: '73,179,255',
    swatches: ['#FF8FCB', '#6DC5FF', '#A2DAFF', '#FFC9E7'],
  },
} satisfies Record<
  ThemeId,
  { color: Record<string, string>; dark: boolean; glow: string; swatches: string[] }
>;
export type Appearance = { version: 1; theme: ThemeId; chosen: true; tutorialSeen: boolean };
export function parseAppearance(value: string | null): Appearance | null {
  try {
    const parsed: unknown = value ? JSON.parse(value) : null;
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Record<string, unknown>;
    return p.version === 1 &&
      p.chosen === true &&
      (p.theme === 'neon' || p.theme === 'unicorn' || p.theme === 'candy') &&
      typeof p.tutorialSeen === 'boolean'
      ? { version: 1, theme: p.theme, chosen: true, tutorialSeen: p.tutorialSeen }
      : null;
  } catch {
    return null;
  }
}
