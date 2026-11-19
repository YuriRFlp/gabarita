import { makePerformance } from '#factories/topic-map';
import { describe, expect, it } from 'vitest';
import { computeMastery } from './mastery';

describe('computeMastery — CA-5: topic without answers in the last 60 days', () => {
  it('is no_answers with value 0 when there is no performance row', () => {
    expect(computeMastery(undefined, null)).toEqual({ kind: 'no_answers', value: 0 });
  });

  it('stays no_answers with value 0 even when an average retention is given', () => {
    expect(computeMastery(undefined, 0.9)).toEqual({ kind: 'no_answers', value: 0 });
  });

  it('treats a row with zero answers as no_answers instead of dividing by zero', () => {
    expect(computeMastery(makePerformance('redes', 0, 0), 0.9)).toEqual({
      kind: 'no_answers',
      value: 0,
    });
  });
});

describe('computeMastery — CA-6: answers and cards', () => {
  it('is 0.5 × firm correct rate + 0.5 × average retention', () => {
    const mastery = computeMastery(makePerformance('redes', 10, 6), 0.8);

    expect(mastery).toMatchObject({
      kind: 'measured',
      answered: 10,
      firmCorrect: 6,
      firmCorrectRate: 0.6,
      averageRetention: 0.8,
    });
    expect(mastery.value).toBeCloseTo(0.7, 12);
  });

  it('is measured with firm correct rate 0 when no answer was firmly correct', () => {
    const mastery = computeMastery(makePerformance('redes', 10, 0), 0.8);

    expect(mastery).toMatchObject({ kind: 'measured', firmCorrectRate: 0 });
    expect(mastery.value).toBeCloseTo(0.4, 12);
  });
});

describe('computeMastery — CA-7: answers without cards (P-3)', () => {
  it('equals the firm correct rate when the average retention is missing', () => {
    expect(computeMastery(makePerformance('redes', 10, 6), null)).toEqual({
      kind: 'measured',
      value: 0.6,
      answered: 10,
      firmCorrect: 6,
      firmCorrectRate: 0.6,
      averageRetention: null,
    });
  });

  it('reaches 1 without a 50% cap when every answer was firmly correct and there are no cards', () => {
    expect(computeMastery(makePerformance('redes', 4, 4), null).value).toBe(1);
  });

  it('counts an average retention of 0 in the formula instead of treating it as missing', () => {
    const mastery = computeMastery(makePerformance('redes', 10, 6), 0);

    expect(mastery).toMatchObject({ kind: 'measured', averageRetention: 0 });
    expect(mastery.value).toBeCloseTo(0.3, 12);
  });

  it('is measured with value 0 when there are answers, none firmly correct, and no cards', () => {
    expect(computeMastery(makePerformance('redes', 3, 0), null)).toMatchObject({
      kind: 'measured',
      value: 0,
    });
  });
});
