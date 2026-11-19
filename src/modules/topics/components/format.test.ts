import { describe, expect, it } from 'vitest';
import { bubbleFillFor, formatPercent, shortCourt } from './format';

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
