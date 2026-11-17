import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  TOKENS_CSS_PATH,
  generateTokensCss,
  readTokens,
  tokensSchema,
  type DesignTokens,
} from './generate-tokens-css';

const TOKENS: DesignTokens = {
  color: { tokens: [{ name: 'paper', value: { light: '#fff', dark: '#000' } }] },
  type: { families: { text: '"Atkinson Hyperlegible", Verdana, sans-serif' } },
  spacing: { tokens: [{ name: 'space-1', value: '4px' }] },
  radius: { tokens: [{ name: 'radius-sm', value: '6px' }] },
  shadow: {
    tokens: [{ name: 'focus-shadow', value: { light: '0 0 0 3px #111', dark: '0 0 0 3px #eee' } }],
  },
};

describe('generateTokensCss', () => {
  const css = generateTokensCss(TOKENS);

  it('defines the light theme colors on :root', () => {
    expect(css).toMatch(/:root \{[^}]*--paper: #fff;/);
  });

  it('defines the dark theme forced by data-theme', () => {
    expect(css).toMatch(/:root\[data-theme="dark"\] \{[^}]*color-scheme: dark;[^}]*--paper: #000;/);
  });

  it('applies the system dark theme only when there is no data-theme', () => {
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme\]\) \{[^}]*--paper: #000;/,
    );
  });

  it('generates a focus shadow per theme', () => {
    expect(css).toContain('--focus-shadow: 0 0 0 3px #111;');
    expect(css).toContain('--focus-shadow: 0 0 0 3px #eee;');
  });

  it('generates spacing, radii and font families with the next/font face first', () => {
    expect(css).toContain('--space-1: 4px;');
    expect(css).toContain('--radius-sm: 6px;');
    expect(css).toContain(
      '--font-text: var(--font-face-text, "Atkinson Hyperlegible"), Verdana, sans-serif;',
    );
  });
});

describe('design/tokens.json', () => {
  it('passes schema validation', () => {
    expect(() => readTokens()).not.toThrow();
  });

  it('rejects a color token without a dark theme value', () => {
    const invalid = { ...TOKENS, color: { tokens: [{ name: 'paper', value: { light: '#fff' } }] } };
    expect(tokensSchema.safeParse(invalid).success).toBe(false);
  });

  it('matches the committed tokens.css (run npm run tokens)', () => {
    expect(readFileSync(TOKENS_CSS_PATH, 'utf8')).toBe(generateTokensCss(readTokens()));
  });
});
