import { s1Map, s1Overrides } from '#factories/exam-weights';
import { seedPriorities, seedTopicMapSource } from '#factories/seed-topic-map';
import { makeExam, makeIncidence } from '#factories/topic-map';
import { describe, expect, it } from 'vitest';
import {
  TOTAL_WEIGHT_UNITS,
  applyExamWeights,
  buildExamWeightsSettings,
  isDefaultWeightSet,
  rebalanceWeights,
  toWeightUnits,
  validateWeightSet,
  weightsFingerprint,
} from './exam-weights';
import { computeTopicPriority, sortExams } from './priority';
import type { Exam } from './topic-map-types';

const S1_ORDER = [
  'trt2',
  'trt3',
  'trf6',
  'tjmg',
  'trf2',
  'trt1',
  'trt15',
  'trf4',
  'trt4',
  'trt12',
  'tjrj',
  'tjsp',
  'tjrs',
  'tjsc',
];

function unitsOf(exams: ReadonlyArray<Exam>): Map<string, number> {
  return new Map(exams.map((exam) => [exam.id, toWeightUnits(exam.targetWeight)]));
}

function sum(set: ReadonlyMap<string, number>): number {
  return [...set.values()].reduce((total, units) => total + units, 0);
}

describe('toWeightUnits', () => {
  it.each([
    [0, 0],
    [1, 1000],
    [0.28, 280],
    [0.015, 15],
    [0.177, 177],
  ])('turns the weight %s into %s thousandths', (weight, units) => {
    expect(toWeightUnits(weight)).toBe(units);
  });

  it('absorbs the floating-point residue of a 3-decimal weight', () => {
    expect(toWeightUnits(0.1 + 0.2)).toBe(300);
  });

  it('defines the total as 1000 thousandths', () => {
    expect(TOTAL_WEIGHT_UNITS).toBe(1000);
  });
});

describe('applyExamWeights — CA-1: default weights', () => {
  it('returns the exams unchanged in default mode when there is no override', () => {
    const { exams } = seedTopicMapSource();

    const result = applyExamWeights(exams, []);

    expect(result.exams).toEqual(exams);
    expect(result.summary).toEqual({
      mode: 'default',
      activeTotal: 1000,
      unweightedExamIds: [],
      fingerprint: null,
    });
  });

  it('keeps the priority of the 38 topics equal to the seed JSON', () => {
    const { exams, incidences } = seedTopicMapSource();

    const effective = applyExamWeights(exams, []).exams;

    for (const { topicId, priority } of seedPriorities()) {
      expect(computeTopicPriority(topicId, effective, incidences).priority).toBeCloseTo(
        priority,
        9,
      );
    }
  });
});

describe('applyExamWeights — CA-2: set S1', () => {
  const { exams, incidences } = seedTopicMapSource();
  const result = applyExamWeights(exams, s1Overrides());

  function priorityOf(topicId: string): number {
    return computeTopicPriority(topicId, result.exams, incidences).priority;
  }

  it('switches to custom mode with an active total of 1000', () => {
    expect(result.summary).toEqual({
      mode: 'custom',
      activeTotal: 1000,
      unweightedExamIds: [],
      fingerprint: expect.any(String),
    });
  });

  it.each([
    ['legislacao_mg', 0.088],
    ['redes', 0.757],
    ['monitoramento', 0.708],
    ['projetos', 0.334],
  ])('gives %s the priority %s', (topicId, priority) => {
    expect(priorityOf(topicId)).toBeCloseTo(priority, 12);
  });

  it('keeps pdpj_stack exactly 1', () => {
    expect(priorityOf('pdpj_stack')).toBe(1);
  });

  it('orders the exams by the effective weights, TRT-2 first', () => {
    expect(sortExams(result.exams).map((exam) => exam.id)).toEqual(S1_ORDER);
  });

  it('sets targetWeight to the override and keeps the other exam fields', () => {
    const trt2 = result.exams.find((exam) => exam.id === 'trt2');

    expect(trt2).toEqual({ ...exams.find((exam) => exam.id === 'trt2'), targetWeight: 0.4 });
  });
});

describe('applyExamWeights — CA-3: incomplete sets, inactive exams, no normalization', () => {
  it('gives an active exam without a row weight 0 and lists it as unweighted', () => {
    const exams = [
      makeExam({ id: 'trt3', targetWeight: 0.6 }),
      makeExam({ id: 'trt2', targetWeight: 0.4 }),
    ];

    const result = applyExamWeights(exams, [{ examId: 'trt3', weight: 0.7 }]);

    expect(result.exams.find((exam) => exam.id === 'trt2')?.targetWeight).toBe(0);
    expect(result.summary).toEqual({
      mode: 'custom',
      activeTotal: 700,
      unweightedExamIds: ['trt2'],
      fingerprint: expect.any(String),
    });
  });

  it('leaves an override of an inactive exam out of the active total and uncounted', () => {
    const exams = [
      makeExam({ id: 'trt3', targetWeight: 1 }),
      makeExam({ id: 'old', targetWeight: 0, active: false }),
    ];

    const result = applyExamWeights(exams, [
      { examId: 'trt3', weight: 1 },
      { examId: 'old', weight: 0.3 },
    ]);
    const priority = computeTopicPriority('t', result.exams, [
      makeIncidence('t', 'trt3', 1),
      makeIncidence('t', 'old', 1),
    ]);

    expect(result.summary.activeTotal).toBe(1000);
    expect(priority.priority).toBe(1);
    expect(priority.contributions.find((c) => c.exam.id === 'old')).toMatchObject({
      counted: false,
      contribution: 0,
    });
  });

  it('does not list an inactive exam without a row as unweighted', () => {
    const exams = [
      makeExam({ id: 'trt3', targetWeight: 1 }),
      makeExam({ id: 'old', targetWeight: 0.2, active: false }),
    ];

    const result = applyExamWeights(exams, [{ examId: 'trt3', weight: 1 }]);

    expect(result.summary.unweightedExamIds).toEqual([]);
  });

  it('does not normalize: active overrides summing 720 give a full-incidence topic 0.72', () => {
    const exams = [
      makeExam({ id: 'a', targetWeight: 0.5 }),
      makeExam({ id: 'b', targetWeight: 0.5 }),
    ];
    const result = applyExamWeights(exams, [
      { examId: 'a', weight: 0.42 },
      { examId: 'b', weight: 0.3 },
    ]);

    const priority = computeTopicPriority('t', result.exams, [
      makeIncidence('t', 'a', 1),
      makeIncidence('t', 'b', 1),
    ]);

    expect(result.summary.activeTotal).toBe(720);
    expect(priority.priority).toBe(0.72);
  });

  it('ignores an override of an exam that is not in the list', () => {
    const exams = [makeExam({ id: 'trt3', targetWeight: 1 })];

    const result = applyExamWeights(exams, [
      { examId: 'trt3', weight: 1 },
      { examId: 'gone', weight: 0.5 },
    ]);

    expect(result.exams.map((exam) => exam.id)).toEqual(['trt3']);
    expect(result.summary.activeTotal).toBe(1000);
  });

  it('does not mutate the exams it receives', () => {
    const exams = [makeExam({ id: 'trt3', targetWeight: 0.28 })];

    applyExamWeights(exams, [{ examId: 'trt3', weight: 1 }]);

    expect(exams[0]?.targetWeight).toBe(0.28);
  });
});

describe('validateWeightSet — CA-4', () => {
  const ACTIVE = ['trt3', 'trt2', 'tjmg'];

  it('accepts a set of every active exam summing 1000', () => {
    const input = new Map([
      ['trt3', 500],
      ['trt2', 400],
      ['tjmg', 100],
    ]);

    expect(validateWeightSet(ACTIVE, input)).toEqual({ ok: true, value: input });
  });

  it('accepts weight 0 and a single exam with 1000', () => {
    const input = new Map([
      ['trt3', 0],
      ['trt2', 1000],
      ['tjmg', 0],
    ]);

    expect(validateWeightSet(ACTIVE, input)).toEqual({ ok: true, value: input });
  });

  it('rejects a sum of 1350 with the total', () => {
    const input = new Map([
      ['trt3', 280],
      ['trt2', 400],
      ['tjmg', 670],
    ]);

    expect(validateWeightSet(ACTIVE, input)).toEqual({
      ok: false,
      error: { kind: 'sum_not_total', total: 1350 },
    });
  });

  it('rejects a sum of 999, one thousandth short', () => {
    const input = new Map([
      ['trt3', 500],
      ['trt2', 400],
      ['tjmg', 99],
    ]);

    expect(validateWeightSet(ACTIVE, input)).toEqual({
      ok: false,
      error: { kind: 'sum_not_total', total: 999 },
    });
  });

  it('rejects a set without an active exam', () => {
    const input = new Map([
      ['trt3', 600],
      ['trt2', 400],
    ]);

    expect(validateWeightSet(ACTIVE, input)).toEqual({
      ok: false,
      error: { kind: 'missing_exam', examId: 'tjmg' },
    });
  });

  it('rejects an id that is not an active exam (unknown or inactive)', () => {
    const input = new Map([
      ['trt3', 500],
      ['trt2', 400],
      ['tjmg', 100],
      ['old', 0],
    ]);

    expect(validateWeightSet(ACTIVE, input)).toEqual({
      ok: false,
      error: { kind: 'unknown_exam', examId: 'old' },
    });
  });
});

describe('rebalanceWeights — CA-5: set S1', () => {
  const activeExams = seedTopicMapSource().exams;

  it('keeps TRT-2 at 400 and rebalances the others into exactly S1', () => {
    const input = unitsOf(activeExams).set('trt2', 400);

    const result = rebalanceWeights(activeExams, input);

    expect(result).toEqual({ ok: true, value: s1Map() });
  });

  it('always sums exactly 1000', () => {
    const input = unitsOf(activeExams).set('trt2', 400);

    const result = rebalanceWeights(activeExams, input);

    expect(result.ok && sum(result.value)).toBe(1000);
  });

  it('returns the input when nothing changed and the sum is already 1000', () => {
    const input = unitsOf(activeExams);

    expect(rebalanceWeights(activeExams, input)).toEqual({ ok: true, value: input });
  });
});

describe('rebalanceWeights — CA-6: largest remainder ties', () => {
  const activeExams = [
    makeExam({ id: 'a', court: 'TJA', targetWeight: 0.1 }),
    makeExam({ id: 'trt15', court: 'TRT-15 (Campinas)', targetWeight: 0.3 }),
    makeExam({ id: 'trt2', court: 'TRT-2 (SP)', targetWeight: 0.3 }),
    makeExam({ id: 'trt1', court: 'TRT-1 (RJ)', targetWeight: 0.3 }),
  ];
  const input = new Map([
    ['a', 0],
    ['trt15', 300],
    ['trt2', 300],
    ['trt1', 300],
  ]);

  it('gives the leftover thousandth to the first exam in sortExams order over the current weights', () => {
    const result = rebalanceWeights(activeExams, input);

    expect(result).toEqual({
      ok: true,
      value: new Map([
        ['a', 0],
        ['trt15', 333],
        ['trt2', 333],
        ['trt1', 334],
      ]),
    });
  });

  it('gives the same result on repeated runs and with the exams in another order', () => {
    const first = rebalanceWeights(activeExams, input);

    expect(rebalanceWeights(activeExams, input)).toEqual(first);
    expect(rebalanceWeights([...activeExams].reverse(), input)).toEqual(first);
  });

  it('breaks ties among the leftover thousandths after the larger remainders', () => {
    const exams = [
      makeExam({ id: 'x', court: 'TRT-9', targetWeight: 0.5 }),
      makeExam({ id: 'p', court: 'TRT-1', targetWeight: 0.2 }),
      makeExam({ id: 'q', court: 'TRT-2', targetWeight: 0.2 }),
      makeExam({ id: 'r', court: 'TRT-3', targetWeight: 0.1 }),
    ];
    // x locked at 499: rest 501 over 500 → p, q 200.4 (remainder 200), r 100.2 (remainder 100).
    const changed = new Map([
      ['x', 499],
      ['p', 200],
      ['q', 200],
      ['r', 100],
    ]);

    const result = rebalanceWeights(exams, changed);

    expect(result).toEqual({
      ok: true,
      value: new Map([
        ['x', 499],
        ['p', 201],
        ['q', 200],
        ['r', 100],
      ]),
    });
  });
});

describe('rebalanceWeights — CA-7: errors and limits', () => {
  const activeExams = [
    makeExam({ id: 'trt3', court: 'TRT-3', targetWeight: 0.5 }),
    makeExam({ id: 'trt2', court: 'TRT-2', targetWeight: 0.3 }),
    makeExam({ id: 'tjmg', court: 'TJMG', targetWeight: 0.2 }),
  ];

  it('rejects changed weights that already sum more than 1000', () => {
    const input = new Map([
      ['trt3', 950],
      ['trt2', 400],
      ['tjmg', 200],
    ]);

    expect(rebalanceWeights(activeExams, input)).toEqual({
      ok: false,
      error: { kind: 'locked_exceeds_total', lockedTotal: 1350 },
    });
  });

  it('gives the unchanged exams 0 when the changed weights sum exactly 1000', () => {
    const input = new Map([
      ['trt3', 600],
      ['trt2', 400],
      ['tjmg', 200],
    ]);

    expect(rebalanceWeights(activeExams, input)).toEqual({
      ok: true,
      value: new Map([
        ['trt3', 600],
        ['trt2', 400],
        ['tjmg', 0],
      ]),
    });
  });

  it('accepts every exam changed when the changed weights sum exactly 1000', () => {
    const input = new Map([
      ['trt3', 100],
      ['trt2', 100],
      ['tjmg', 800],
    ]);

    expect(rebalanceWeights(activeExams, input)).toEqual({ ok: true, value: input });
  });

  it('cannot rebalance when every exam changed and the sum is below 1000', () => {
    const input = new Map([
      ['trt3', 100],
      ['trt2', 100],
      ['tjmg', 100],
    ]);

    expect(rebalanceWeights(activeExams, input)).toEqual({
      ok: false,
      error: { kind: 'nothing_to_rebalance' },
    });
  });

  it('cannot rebalance when every unchanged exam weighs 0', () => {
    const exams = [
      makeExam({ id: 'trt3', targetWeight: 1 }),
      makeExam({ id: 'trt2', targetWeight: 0 }),
    ];
    const input = new Map([
      ['trt3', 400],
      ['trt2', 0],
    ]);

    expect(rebalanceWeights(exams, input)).toEqual({
      ok: false,
      error: { kind: 'nothing_to_rebalance' },
    });
  });

  it('rejects an input without an active exam', () => {
    const input = new Map([
      ['trt3', 500],
      ['trt2', 300],
    ]);

    expect(rebalanceWeights(activeExams, input)).toEqual({
      ok: false,
      error: { kind: 'missing_exam', examId: 'tjmg' },
    });
  });

  it('rejects an id that is not an active exam', () => {
    const input = new Map([
      ['trt3', 500],
      ['trt2', 300],
      ['tjmg', 200],
      ['nope', 0],
    ]);

    expect(rebalanceWeights(activeExams, input)).toEqual({
      ok: false,
      error: { kind: 'unknown_exam', examId: 'nope' },
    });
  });

  it('treats an inactive exam as unknown', () => {
    const exams = [...activeExams, makeExam({ id: 'old', targetWeight: 0, active: false })];
    const input = new Map([
      ['trt3', 500],
      ['trt2', 300],
      ['tjmg', 200],
      ['old', 0],
    ]);

    expect(rebalanceWeights(exams, input)).toEqual({
      ok: false,
      error: { kind: 'unknown_exam', examId: 'old' },
    });
  });

  it('scales the unchanged exams up when the current active total is below 1000', () => {
    const exams = [
      makeExam({ id: 'trt3', court: 'TRT-3', targetWeight: 0.36 }),
      makeExam({ id: 'trt2', court: 'TRT-2', targetWeight: 0.36 }),
    ];
    const input = new Map([
      ['trt3', 360],
      ['trt2', 360],
    ]);

    expect(rebalanceWeights(exams, input)).toEqual({
      ok: true,
      value: new Map([
        ['trt3', 500],
        ['trt2', 500],
      ]),
    });
  });
});

describe('isDefaultWeightSet — CA-8', () => {
  const exams = [
    makeExam({ id: 'trt3', targetWeight: 0.6 }),
    makeExam({ id: 'trt2', targetWeight: 0.4 }),
    makeExam({ id: 'old', targetWeight: 0.2, active: false }),
  ];

  it('is true for a set equal to the defaults of the active exams', () => {
    const set = new Map([
      ['trt3', 600],
      ['trt2', 400],
    ]);

    expect(isDefaultWeightSet(exams, set)).toBe(true);
  });

  it('is true for the 14 seed defaults', () => {
    const seed = seedTopicMapSource().exams;

    expect(isDefaultWeightSet(seed, unitsOf(seed))).toBe(true);
  });

  it('is false when one thousandth differs', () => {
    const set = new Map([
      ['trt3', 599],
      ['trt2', 401],
    ]);

    expect(isDefaultWeightSet(exams, set)).toBe(false);
  });

  it('is false when an active exam is missing', () => {
    expect(isDefaultWeightSet(exams, new Map([['trt3', 600]]))).toBe(false);
  });

  it('is false when the set has an exam that is not active', () => {
    const set = new Map([
      ['trt3', 600],
      ['trt2', 400],
      ['old', 200],
    ]);

    expect(isDefaultWeightSet(exams, set)).toBe(false);
  });
});

describe('buildExamWeightsSettings', () => {
  it('lists the active exams by default weight with weight equal to the default in default mode', () => {
    const exams = seedTopicMapSource().exams;

    const settings = buildExamWeightsSettings(exams, []);

    expect(settings.active.map((row) => row.exam.id)).toEqual(
      sortExams(exams).map((exam) => exam.id),
    );
    expect(settings.active[0]).toEqual({
      exam: exams.find((exam) => exam.id === 'trt3'),
      defaultWeight: 0.28,
      weight: 0.28,
    });
    expect(settings.inactive).toEqual([]);
    expect(settings.summary).toEqual({
      mode: 'default',
      activeTotal: 1000,
      unweightedExamIds: [],
      fingerprint: null,
    });
  });

  it('keeps the default-weight order with S1 and shows the effective weights', () => {
    const exams = seedTopicMapSource().exams;

    const settings = buildExamWeightsSettings(exams, s1Overrides());

    expect(settings.active.map((row) => row.exam.id)).toEqual(
      sortExams(exams).map((exam) => exam.id),
    );
    expect(settings.active.find((row) => row.exam.id === 'trt2')).toMatchObject({
      defaultWeight: 0.05,
      weight: 0.4,
    });
    expect(settings.summary.mode).toBe('custom');
  });

  it('gives an active exam without a row in custom mode weight null (CA-26)', () => {
    const exams = [
      makeExam({ id: 'trt3', targetWeight: 0.6 }),
      makeExam({ id: 'trtx', targetWeight: 0.4 }),
    ];

    const settings = buildExamWeightsSettings(exams, [{ examId: 'trt3', weight: 1 }]);

    expect(settings.active.find((row) => row.exam.id === 'trtx')).toMatchObject({
      defaultWeight: 0.4,
      weight: null,
    });
    expect(settings.summary.unweightedExamIds).toEqual(['trtx']);
  });

  it('lists inactive exams apart and out of the active total (CA-27)', () => {
    const old = makeExam({ id: 'old', targetWeight: 0.3, active: false });
    const exams = [makeExam({ id: 'trt3', targetWeight: 1 }), old];

    const settings = buildExamWeightsSettings(exams, []);

    expect(settings.active.map((row) => row.exam.id)).toEqual(['trt3']);
    expect(settings.inactive).toEqual([old]);
    expect(settings.summary.activeTotal).toBe(1000);
  });

  it('returns empty lists for no exams', () => {
    expect(buildExamWeightsSettings([], [])).toEqual({
      active: [],
      inactive: [],
      summary: { mode: 'default', activeTotal: 0, unweightedExamIds: [], fingerprint: null },
    });
  });
});

describe('weightsFingerprint', () => {
  const base = [
    { examId: 'trt3', weight: 0.6 },
    { examId: 'trt2', weight: 0.4 },
  ];

  it('is deterministic and short', () => {
    expect(weightsFingerprint(base)).toBe(weightsFingerprint(base));
    expect(weightsFingerprint(base)).toMatch(/^[0-9a-z]{1,7}$/);
  });

  it('does not depend on the input order', () => {
    expect(weightsFingerprint([...base].reverse())).toBe(weightsFingerprint(base));
  });

  it('changes when any weight changes', () => {
    const changed = [base[0]!, { examId: 'trt2', weight: 0.401 }];
    expect(weightsFingerprint(changed)).not.toBe(weightsFingerprint(base));
  });

  it('changes when an exam is added, removed or swapped', () => {
    const fingerprints = [
      weightsFingerprint(base),
      weightsFingerprint([base[0]!]),
      weightsFingerprint([...base, { examId: 'trf6', weight: 0 }]),
      weightsFingerprint([base[0]!, { examId: 'trf6', weight: 0.4 }]),
    ];
    expect(new Set(fingerprints).size).toBe(fingerprints.length);
  });

  it('ignores float noise below the thousandth', () => {
    const noisy = [
      { examId: 'trt3', weight: 0.6000000001 },
      { examId: 'trt2', weight: 0.3999999999 },
    ];
    expect(weightsFingerprint(noisy)).toBe(weightsFingerprint(base));
  });

  it('is exposed by the summary only in custom mode, and follows the saved set', () => {
    const exams = [
      makeExam({ id: 'trt3', targetWeight: 0.6 }),
      makeExam({ id: 'trt2', targetWeight: 0.4 }),
    ];
    expect(applyExamWeights(exams, []).summary.fingerprint).toBeNull();
    const saved = applyExamWeights(exams, base).summary.fingerprint;
    expect(saved).toBe(weightsFingerprint(base));
    const edited = applyExamWeights(exams, [
      { examId: 'trt3', weight: 0.5 },
      { examId: 'trt2', weight: 0.5 },
    ]).summary.fingerprint;
    expect(edited).not.toBe(saved);
  });
});
