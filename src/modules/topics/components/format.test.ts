import { describe, expect, it } from 'vitest';
import { bubbleFillFor, formatPercent, formatScore, formatWeight, shortCourt } from './format';

describe('formatScore', () => {
  it('uses two decimals with a comma', () => {
    expect(formatScore(0.89)).toBe('0,89');
    expect(formatScore(1)).toBe('1,00');
    expect(formatScore(0.07)).toBe('0,07');
    expect(formatScore(0)).toBe('0,00');
  });
});

describe('formatWeight', () => {
  it('keeps up to three decimals without trailing zeros', () => {
    expect(formatWeight(0.28)).toBe('0,28');
    expect(formatWeight(0.025)).toBe('0,025');
    expect(formatWeight(0.015)).toBe('0,015');
    expect(formatWeight(1)).toBe('1');
  });
});

describe('formatPercent', () => {
  it('rounds to a whole percentage', () => {
    expect(formatPercent(0.7)).toMatch(/^70\s?%$/);
    expect(formatPercent(0)).toMatch(/^0\s?%$/);
    expect(formatPercent(0.666)).toMatch(/^67\s?%$/);
  });

  it('clamps out-of-range values', () => {
    expect(formatPercent(1.4)).toMatch(/^100\s?%$/);
    expect(formatPercent(-1)).toMatch(/^0\s?%$/);
  });
});

describe('shortCourt', () => {
  it('drops the parenthesized detail', () => {
    expect(shortCourt('TRT-3 (MG)')).toBe('TRT-3');
    expect(shortCourt('TRF-4 (RS/SC/PR)')).toBe('TRF-4');
  });

  it('keeps a court with no parentheses', () => {
    expect(shortCourt('TJMG')).toBe('TJMG');
  });
});

describe('bubbleFillFor', () => {
  it('maps the incidence scale to bubble fills', () => {
    expect(bubbleFillFor(1)).toBe('filled');
    expect(bubbleFillFor(0.5)).toBe('half');
    expect(bubbleFillFor(0)).toBe('empty');
  });
});
