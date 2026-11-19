import { describe, expect, it } from 'vitest';
import { formatShare } from './format';

describe('formatShare', () => {
  it.each([
    [0.98, '98%'],
    [0.89, '89%'],
    [0.28, '28%'],
    [0.07, '7%'],
    [0.025, '2,5%'],
    [0.015, '1,5%'],
    [0.0125, '1,3%'],
    [0.6675, '66,8%'],
    [1, '100%'],
    [0, '0%'],
  ])('formats %s as "%s"', (value, text) => {
    expect(formatShare(value).replace(/\s/g, '')).toBe(text);
  });
});
