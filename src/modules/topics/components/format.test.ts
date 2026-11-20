import { describe, expect, it } from 'vitest';
import {
  bubbleFillFor,
  formatPercent,
  formatPoints,
  formatWeightUnits,
  shortCourt,
} from './format';

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

describe('formatWeightUnits', () => {
  it('shows thousandths as a pt-BR number with at most one decimal', () => {
    expect(formatWeightUnits(400)).toBe('40');
    expect(formatWeightUnits(177)).toBe('17,7');
    expect(formatWeightUnits(25)).toBe('2,5');
    expect(formatWeightUnits(0)).toBe('0');
    expect(formatWeightUnits(1000)).toBe('100');
  });
});

describe('formatPoints', () => {
  it('uses the singular up to one point', () => {
    expect(formatPoints(10)).toBe('1 ponto');
    expect(formatPoints(5)).toBe('0,5 ponto');
  });

  it('uses the plural above one point and ignores the sign', () => {
    expect(formatPoints(350)).toBe('35 pontos');
    expect(formatPoints(-30)).toBe('3 pontos');
    expect(formatPoints(15)).toBe('1,5 pontos');
  });
});
