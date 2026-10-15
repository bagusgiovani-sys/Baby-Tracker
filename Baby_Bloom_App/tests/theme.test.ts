import { test } from 'node:test';
import assert from 'node:assert/strict';
import { palettes } from '../src/lib/theme-palette.ts';

function luminance(hex: string): number {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}

test('Candy Princess text stays readable on blue and pink surfaces with bright button fills', () => {
  const color = palettes.candy.color;
  const pairs = [
    ['onBrand', 'brand'] as const,
    ...(['canvas', 'paper', 'mint', 'peach', 'blue', 'elevated'] as const).flatMap((background) =>
      (['ink', 'muted', 'accentInk', 'warning'] as const).map(
        (foreground) => [foreground, background] as const,
      ),
    ),
  ];
  for (const [foreground, background] of pairs) {
    const a = luminance(color[foreground]);
    const b = luminance(color[background]);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    assert.ok(ratio >= 4.5, `${foreground}/${background} contrast: ${ratio.toFixed(2)}`);
  }
});
