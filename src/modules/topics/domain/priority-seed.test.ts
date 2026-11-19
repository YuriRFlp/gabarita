import { seedPriorities, seedTopicMapSource } from '#factories/seed-topic-map';
import { describe, expect, it } from 'vitest';
import { computeTopicPriority } from './priority';

const { exams, incidences } = seedTopicMapSource();
const expected = seedPriorities();

describe('computeTopicPriority — CA-1: matches the priority field of the seed JSON v0.2', () => {
  it('reads the 14 active exams with weights, the 532 incidences and the 38 topics', () => {
    expect(exams).toHaveLength(14);
    expect(exams.every((exam) => exam.active && Number.isFinite(exam.targetWeight))).toBe(true);
    expect(incidences).toHaveLength(532);
    expect(expected).toHaveLength(38);
  });

  it.each(expected.map(({ topicId, priority }) => [topicId, priority] as const))(
    'gives %s the priority %s',
    (topicId, priority) => {
      expect(computeTopicPriority(topicId, exams, incidences).priority).toBeCloseTo(priority, 9);
    },
  );

  it('gives seg_aplicacoes exactly 0.8325', () => {
    expect(computeTopicPriority('seg_aplicacoes', exams, incidences).priority).toBe(0.8325);
  });

  it('gives arquitetura_computadores exactly 0.065', () => {
    expect(computeTopicPriority('arquitetura_computadores', exams, incidences).priority).toBe(
      0.065,
    );
  });
});
