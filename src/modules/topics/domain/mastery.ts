import type { TopicPerformance } from './topic-map-types';

export type Mastery =
  | { kind: 'no_answers'; value: 0 }
  | {
      kind: 'measured';
      /** 0 to 1. */
      value: number;
      answered: number;
      firmCorrect: number;
      /** firmCorrect / answered. */
      firmCorrectRate: number;
      /** null = no cards: value = firmCorrectRate (P-3). */
      averageRetention: number | null;
    };

/**
 * docs/04 § Domínio: 0.5 × firm correct rate + 0.5 × average retention. A topic without answers in
 * the last 60 days has mastery 0; with answers and no cards, the missing retention is left out
 * instead of counted as 0 or 1.
 */
export function computeMastery(
  performance: TopicPerformance | undefined,
  averageRetention: number | null,
): Mastery {
  if (performance === undefined || performance.answered <= 0) {
    return { kind: 'no_answers', value: 0 };
  }

  const firmCorrectRate = performance.firmCorrect / performance.answered;
  const value =
    averageRetention === null ? firmCorrectRate : 0.5 * firmCorrectRate + 0.5 * averageRetention;

  return {
    kind: 'measured',
    value,
    answered: performance.answered,
    firmCorrect: performance.firmCorrect,
    firmCorrectRate,
    averageRetention,
  };
}
