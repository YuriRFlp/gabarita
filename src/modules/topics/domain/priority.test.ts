import { makeExam, makeIncidence } from '#factories/topic-map';
import { describe, expect, it } from 'vitest';
import { computeTopicPriority } from './priority';

const TOPIC = 'pdpj_stack';

const FULL_WEIGHT_EXAMS = [
  makeExam({ id: 'trt3', court: 'TRT-3 (MG)', targetWeight: 0.28 }),
  makeExam({ id: 'trf6', court: 'TRF-6 (MG)', targetWeight: 0.18 }),
  makeExam({ id: 'tjmg', court: 'TJMG', targetWeight: 0.14 }),
  makeExam({ id: 'trt1', court: 'TRT-1 (RJ)', targetWeight: 0.05 }),
  makeExam({ id: 'trt2', court: 'TRT-2 (SP)', targetWeight: 0.05 }),
  makeExam({ id: 'trt15', court: 'TRT-15 (Campinas)', targetWeight: 0.05 }),
  makeExam({ id: 'trf2', court: 'TRF-2 (RJ/ES)', targetWeight: 0.05 }),
  makeExam({ id: 'trt4', court: 'TRT-4 (RS)', targetWeight: 0.04 }),
  makeExam({ id: 'trt12', court: 'TRT-12 (SC)', targetWeight: 0.04 }),
  makeExam({ id: 'trf4', court: 'TRF-4 (RS/SC/PR)', targetWeight: 0.04 }),
  makeExam({ id: 'tjsp', court: 'TJSP', targetWeight: 0.025 }),
  makeExam({ id: 'tjrj', court: 'TJRJ', targetWeight: 0.025 }),
  makeExam({ id: 'tjrs', court: 'TJRS', targetWeight: 0.015 }),
  makeExam({ id: 'tjsc', court: 'TJSC', targetWeight: 0.015 }),
];

function fullIncidences(topicId: string) {
  return FULL_WEIGHT_EXAMS.map((exam) => makeIncidence(topicId, exam.id, 1));
}

describe('computeTopicPriority — CA-2: integer arithmetic', () => {
  it('is exactly 1 when the topic has incidence 1 in every active exam and the weights sum to 1', () => {
    const result = computeTopicPriority(TOPIC, FULL_WEIGHT_EXAMS, fullIncidences(TOPIC));

    expect(result.priority).toBe(1);
  });

  it('makes four topics with full incidence tie exactly', () => {
    const topicIds = ['pdpj_stack', 'devops_cicd', 'arquitetura', 'portugues'];
    const incidences = topicIds.flatMap(fullIncidences);

    const priorities = topicIds.map(
      (id) => computeTopicPriority(id, FULL_WEIGHT_EXAMS, incidences).priority,
    );

    expect(new Set(priorities)).toEqual(new Set([1]));
  });

  it('avoids the floating-point residue of a naive sum of the same weights', () => {
    const naive = FULL_WEIGHT_EXAMS.reduce((sum, exam) => sum + exam.targetWeight, 0);
    const result = computeTopicPriority(TOPIC, FULL_WEIGHT_EXAMS, fullIncidences(TOPIC));

    expect(naive).not.toBe(1);
    expect(result.priority).toBe(1);
  });

  it('weights a partial incidence by one half', () => {
    const exams = [makeExam({ id: 'tjmg', targetWeight: 0.14 })];

    const result = computeTopicPriority(TOPIC, exams, [makeIncidence(TOPIC, 'tjmg', 0.5)]);

    expect(result.priority).toBe(0.07);
    expect(result.contributions[0]?.contribution).toBe(0.07);
  });
});

describe('computeTopicPriority — CA-3: inactive exams and missing incidences', () => {
  it('does not count an inactive exam but still lists it with contribution 0', () => {
    const exams = [
      makeExam({ id: 'trt3', targetWeight: 0.28, active: false }),
      makeExam({ id: 'trf6', targetWeight: 0.18 }),
    ];
    const incidences = [makeIncidence(TOPIC, 'trt3', 1), makeIncidence(TOPIC, 'trf6', 1)];

    const result = computeTopicPriority(TOPIC, exams, incidences);

    expect(result.priority).toBe(0.18);
    expect(result.contributions.find((c) => c.exam.id === 'trt3')).toMatchObject({
      incidence: 1,
      contribution: 0,
      counted: false,
    });
  });

  it('marks active exams as counted', () => {
    const exams = [makeExam({ id: 'trf6', targetWeight: 0.18 })];

    const result = computeTopicPriority(TOPIC, exams, [makeIncidence(TOPIC, 'trf6', 1)]);

    expect(result.contributions[0]?.counted).toBe(true);
  });

  it('treats a topic × exam pair without an incidence row as incidence 0', () => {
    const exams = [makeExam({ id: 'trt3', targetWeight: 0.28 }), makeExam({ id: 'trf6' })];

    const result = computeTopicPriority(TOPIC, exams, [makeIncidence(TOPIC, 'trt3', 1)]);

    expect(result.priority).toBe(0.28);
    expect(result.contributions.find((c) => c.exam.id === 'trf6')).toMatchObject({
      incidence: 0,
      contribution: 0,
      counted: true,
    });
  });

  it('ignores incidences of other topics', () => {
    const exams = [makeExam({ id: 'trt3', targetWeight: 0.28 })];

    const result = computeTopicPriority(TOPIC, exams, [makeIncidence('redes', 'trt3', 1)]);

    expect(result.priority).toBe(0);
  });

  it('is 0 when no exam is active', () => {
    const exams = FULL_WEIGHT_EXAMS.map((exam) => ({ ...exam, active: false }));

    const result = computeTopicPriority(TOPIC, exams, fullIncidences(TOPIC));

    expect(result.priority).toBe(0);
    expect(result.contributions).toHaveLength(14);
  });

  it('is 0 when there are no incidences', () => {
    const result = computeTopicPriority(TOPIC, FULL_WEIGHT_EXAMS, []);

    expect(result.priority).toBe(0);
  });

  it('is 0 with no contributions when there are no exams', () => {
    const result = computeTopicPriority(TOPIC, [], []);

    expect(result).toEqual({ topicId: TOPIC, priority: 0, contributions: [] });
  });
});

describe('computeTopicPriority — CA-4: contribution order and sum', () => {
  it('orders contributions by weight descending and ties by court in numeric order', () => {
    const shuffled = [...FULL_WEIGHT_EXAMS].reverse();

    const result = computeTopicPriority(TOPIC, shuffled, fullIncidences(TOPIC));

    expect(result.contributions.map((c) => c.exam.court)).toEqual([
      'TRT-3 (MG)',
      'TRF-6 (MG)',
      'TJMG',
      'TRF-2 (RJ/ES)',
      'TRT-1 (RJ)',
      'TRT-2 (SP)',
      'TRT-15 (Campinas)',
      'TRF-4 (RS/SC/PR)',
      'TRT-4 (RS)',
      'TRT-12 (SC)',
      'TJRJ',
      'TJSP',
      'TJRS',
      'TJSC',
    ]);
  });

  it('places TRT-2 before TRT-15 when they have the same weight', () => {
    const exams = [
      makeExam({ id: 'trt15', court: 'TRT-15 (Campinas)', targetWeight: 0.05 }),
      makeExam({ id: 'trt2', court: 'TRT-2 (SP)', targetWeight: 0.05 }),
    ];

    const result = computeTopicPriority(TOPIC, exams, []);

    expect(result.contributions.map((c) => c.exam.id)).toEqual(['trt2', 'trt15']);
  });

  it('breaks a tie of weight and court by exam id, so the order is stable', () => {
    const exams = [
      makeExam({ id: 'b', court: 'TJSP', targetWeight: 0.025 }),
      makeExam({ id: 'a', court: 'TJSP', targetWeight: 0.025 }),
    ];

    const forward = computeTopicPriority(TOPIC, exams, []);
    const backward = computeTopicPriority(TOPIC, [...exams].reverse(), []);

    expect(forward.contributions.map((c) => c.exam.id)).toEqual(['a', 'b']);
    expect(backward.contributions.map((c) => c.exam.id)).toEqual(['a', 'b']);
  });

  it('makes the sum of counted contributions equal to the priority', () => {
    const exams = FULL_WEIGHT_EXAMS.map((exam, index) => ({ ...exam, active: index !== 1 }));
    const incidences = FULL_WEIGHT_EXAMS.map((exam, index) =>
      makeIncidence(TOPIC, exam.id, index % 3 === 0 ? 1 : index % 3 === 1 ? 0.5 : 0),
    );

    const result = computeTopicPriority(TOPIC, exams, incidences);
    const counted = result.contributions
      .filter((c) => c.counted)
      .reduce((sum, c) => sum + c.contribution, 0);

    expect(counted).toBeCloseTo(result.priority, 12);
  });

  it('does not mutate the exams it receives', () => {
    const exams = [...FULL_WEIGHT_EXAMS].reverse();
    const before = exams.map((exam) => exam.id);

    computeTopicPriority(TOPIC, exams, []);

    expect(exams.map((exam) => exam.id)).toEqual(before);
  });
});
