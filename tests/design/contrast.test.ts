import { describe, expect, it } from 'vitest';
import { readTokens } from '../../scripts/generate-tokens-css';

const TEXT = 4.5;
const NON_TEXT = 3;
const THEMES = ['light', 'dark'] as const;

type Pair = { usage: string; foreground: string; background: string; minimum: number };

// Pairs introduced by direction A "Folha de prova" (SPEC-004 § 5.5, ADR-010).
const PAIRS: ReadonlyArray<Pair> = [
  { usage: 'current rail item text', foreground: 'ink-strong', background: 'ink-light', minimum: TEXT },
  { usage: 'current rail item bubble', foreground: 'ink', background: 'ink-light', minimum: NON_TEXT },
  { usage: 'eyebrow and rail numbers', foreground: 'graphite-soft', background: 'paper', minimum: TEXT },
  { usage: 'rule', foreground: 'rule', background: 'paper', minimum: NON_TEXT },
  { usage: 'filled and half bubble', foreground: 'ink', background: 'paper', minimum: NON_TEXT },
  { usage: 'empty bubble', foreground: 'control-border', background: 'paper', minimum: NON_TEXT },
  { usage: 'rail item text', foreground: 'graphite', background: 'paper', minimum: TEXT },
  { usage: 'rail item on hover', foreground: 'graphite', background: 'paper-2', minimum: TEXT },
  { usage: 'focus ring on the current rail item', foreground: 'ink', background: 'ink-light', minimum: NON_TEXT },
  { usage: 'current filter option', foreground: 'on-ink', background: 'ink', minimum: TEXT },
  { usage: 'info notice text', foreground: 'graphite', background: 'ink-light', minimum: TEXT },
  { usage: 'info notice icon and border', foreground: 'ink', background: 'ink-light', minimum: NON_TEXT },
  { usage: 'phase tag', foreground: 'paper', background: 'graphite', minimum: TEXT },
  { usage: 'tag', foreground: 'graphite', background: 'paper', minimum: TEXT },
  { usage: 'mastery "Sem respostas"', foreground: 'graphite-soft', background: 'paper', minimum: TEXT },
  { usage: 'priority bar', foreground: 'ink', background: 'paper', minimum: NON_TEXT },
  { usage: 'login promise over the sheet texture', foreground: 'graphite', background: 'grid-light', minimum: TEXT },
  { usage: 'login eyebrow over the sheet texture', foreground: 'graphite-soft', background: 'grid-light', minimum: TEXT },
  { usage: 'timing marks over the sheet texture', foreground: 'rule', background: 'grid-light', minimum: NON_TEXT },
];

function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Not a #rrggbb color: ${hex}`);
  const [red, green, blue] = match.slice(1).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

/** WCAG 2.x contrast ratio, from 1 to 21. */
function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

const colors = new Map(readTokens().color.tokens.map((token) => [token.name, token.value]));

function color(name: string, theme: (typeof THEMES)[number]): string {
  const value = colors.get(name);
  if (!value) throw new Error(`Unknown color token: ${name}`);
  return value[theme];
}

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for the same color', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#22309a', '#22309a')).toBe(1);
  });

  it('does not depend on which color is the foreground', () => {
    expect(contrastRatio('#5b5d68', '#fcfcfa')).toBe(contrastRatio('#fcfcfa', '#5b5d68'));
  });
});

describe('rule token', () => {
  it.each(THEMES)('equals graphite in the %s theme', (theme) => {
    expect(color('rule', theme)).toBe(color('graphite', theme));
  });
});

describe.each(THEMES)('direction A color pairs in the %s theme', (theme) => {
  it.each(PAIRS)('$usage: $foreground on $background reaches $minimum:1', (pair) => {
    const ratio = contrastRatio(color(pair.foreground, theme), color(pair.background, theme));
    expect(ratio).toBeGreaterThanOrEqual(pair.minimum);
  });
});
