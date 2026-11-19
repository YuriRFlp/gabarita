import {
  makeExam,
  makeIncidence,
  makePerformance,
  makeSource,
  makeSubtopic,
  makeTopic,
} from '#factories/topic-map';
import { seedTopicMapSource } from '#factories/seed-topic-map';
import { describe, expect, it } from 'vitest';
import { buildTopicDetail, buildTopicMap, type TopicMapQuery } from './topic-map';

const DEFAULT_QUERY: TopicMapQuery = {
  view: 'list',
  category: 'all',
  profile: 'all',
  sort: 'urgency',
};

function query(overrides: Partial<TopicMapQuery> = {}): TopicMapQuery {
  return { ...DEFAULT_QUERY, ...overrides };
}

function ids(map: ReturnType<typeof buildTopicMap>): string[] {
  return map.entries.map((entry) => entry.topic.id);
}

const INFRA_TOPICS = [
  'seg_infra',
  'nuvem_virtualizacao',
  'redes',
  'sist_operacionais',
  'monitoramento',
  'storage_backup',
  'arquitetura_computadores',
];

describe('buildTopicMap — CA-9: sorting by urgency and priority', () => {
  const exam = makeExam({ id: 'trt3', targetWeight: 0.5 });

  function sourceWithPriorities() {
    return makeSource({
      exams: [exam],
      topics: [
        makeTopic({ id: 'low', sortOrder: 1 }),
        makeTopic({ id: 'high', sortOrder: 2 }),
        makeTopic({ id: 'mid', sortOrder: 3 }),
      ],
      incidences: [makeIncidence('high', 'trt3', 1), makeIncidence('mid', 'trt3', 0.5)],
    });
  }

  it('sorts by priority in descending order', () => {
    expect(ids(buildTopicMap(sourceWithPriorities(), query({ sort: 'priority' })))).toEqual([
      'high',
      'mid',
      'low',
    ]);
  });

  it('sorts by urgency in descending order, taking mastery into account', () => {
    const source = {
      ...sourceWithPriorities(),
      performance: [makePerformance('high', 10, 9)],
    };

    const map = buildTopicMap(source, query({ sort: 'urgency' }));

    expect(ids(map)).toEqual(['mid', 'high', 'low']);
    expect(map.entries.map((entry) => entry.urgency)).toEqual([0.25, expect.any(Number), 0]);
    expect(map.entries[1]?.urgency).toBeCloseTo(0.05, 12);
  });

  it('gives the same order for urgency and priority when there are no answers', () => {
    const source = sourceWithPriorities();

    expect(ids(buildTopicMap(source, query({ sort: 'urgency' })))).toEqual(
      ids(buildTopicMap(source, query({ sort: 'priority' }))),
    );
  });

  it.each(['urgency', 'priority'] as const)(
    'breaks %s ties by sortOrder ascending, then by id',
    (sort) => {
      const source = makeSource({
        exams: [exam],
        topics: [
          makeTopic({ id: 'c', sortOrder: 2 }),
          makeTopic({ id: 'b', sortOrder: 1 }),
          makeTopic({ id: 'a', sortOrder: 2 }),
        ],
        incidences: ['a', 'b', 'c'].map((id) => makeIncidence(id, 'trt3', 1)),
      });

      expect(ids(buildTopicMap(source, query({ sort })))).toEqual(['b', 'a', 'c']);
    },
  );

  it('ties topics of the seed with priority exactly 1 and orders them by sortOrder', () => {
    const map = buildTopicMap(seedTopicMapSource(), query({ sort: 'priority' }));

    expect(ids(map).slice(0, 4)).toEqual(['pdpj_stack', 'devops_cicd', 'arquitetura', 'portugues']);
    expect(map.entries.slice(0, 4).map((entry) => entry.priority.priority)).toEqual([1, 1, 1, 1]);
  });
});

describe('buildTopicMap — CA-9: sorting by name', () => {
  it('sorts alphabetically in pt-BR, ignoring accents and case', () => {
    const source = makeSource({
      topics: [
        makeTopic({ id: 'z', name: 'Zebra' }),
        makeTopic({ id: 'e', name: 'ética' }),
        makeTopic({ id: 'a', name: 'Árvore' }),
        makeTopic({ id: 'b', name: 'banco' }),
      ],
    });

    expect(ids(buildTopicMap(source, query({ sort: 'name' })))).toEqual(['a', 'b', 'e', 'z']);
  });

  it('breaks name ties (same letters, different accent or case) by sortOrder, then by id', () => {
    const source = makeSource({
      topics: [
        makeTopic({ id: 'y', name: 'Redes', sortOrder: 5 }),
        makeTopic({ id: 'x', name: 'rédes', sortOrder: 5 }),
        makeTopic({ id: 'w', name: 'REDES', sortOrder: 1 }),
      ],
    });

    expect(ids(buildTopicMap(source, query({ sort: 'name' })))).toEqual(['w', 'x', 'y']);
  });
});

describe('buildTopicMap — CA-9: deterministic order', () => {
  it.each(['urgency', 'priority', 'name'] as const)(
    'gives the same %s order on repeated runs and for any input order',
    (sort) => {
      const source = seedTopicMapSource();
      const reversed = { ...source, topics: [...source.topics].reverse() };

      const first = ids(buildTopicMap(source, query({ sort })));

      expect(ids(buildTopicMap(source, query({ sort })))).toEqual(first);
      expect(ids(buildTopicMap(reversed, query({ sort })))).toEqual(first);
    },
  );

  it('does not mutate the source topics', () => {
    const source = seedTopicMapSource();
    const before = source.topics.map((topic) => topic.id);

    buildTopicMap(source, query({ sort: 'name' }));

    expect(source.topics.map((topic) => topic.id)).toEqual(before);
  });
});

describe('buildTopicMap — CA-10: filters and summary', () => {
  it('shows only the 10 general topics with category=general', () => {
    const map = buildTopicMap(seedTopicMapSource(), query({ category: 'general' }));

    expect(map.entries).toHaveLength(10);
    expect(map.entries.every((entry) => entry.topic.category === 'general')).toBe(true);
  });

  it('shows only the 28 specific topics with category=specific', () => {
    const map = buildTopicMap(seedTopicMapSource(), query({ category: 'specific' }));

    expect(map.entries).toHaveLength(28);
    expect(map.entries.every((entry) => entry.topic.category === 'specific')).toBe(true);
  });

  it('shows only the 7 specific topics with the infra profile, leaving general topics out', () => {
    const map = buildTopicMap(seedTopicMapSource(), query({ profile: 'infra' }));

    expect([...ids(map)].sort()).toEqual([...INFRA_TOPICS].sort());
  });

  it('results in an empty list for category=general&profile=infra', () => {
    const map = buildTopicMap(
      seedTopicMapSource(),
      query({ category: 'general', profile: 'infra' }),
    );

    expect(map.entries).toEqual([]);
    expect(map.totals).toMatchObject({ topics: 38, shown: 0 });
  });

  it('does not filter with category=all and profile=all', () => {
    expect(buildTopicMap(seedTopicMapSource(), DEFAULT_QUERY).entries).toHaveLength(38);
  });

  it('summarizes the seed: 38 topics, 218 subtopics, 14 exams, shown after the filter', () => {
    const map = buildTopicMap(seedTopicMapSource(), query({ category: 'general' }));

    expect(map.totals).toEqual({ topics: 38, subtopics: 218, exams: 14, shown: 10, measured: 0 });
  });

  it('counts measured topics over the whole taxonomy, regardless of the filter', () => {
    const source = makeSource({
      topics: [
        makeTopic({ id: 'redes', category: 'specific', profile: 'infra' }),
        makeTopic({ id: 'portugues', category: 'general', profile: null }),
      ],
      performance: [makePerformance('redes', 5, 3)],
    });

    const map = buildTopicMap(source, query({ category: 'general' }));

    expect(map.totals).toMatchObject({ shown: 1, measured: 1 });
  });

  it('echoes the query it received', () => {
    const received = query({ view: 'matrix', sort: 'name', profile: 'common' });

    expect(buildTopicMap(seedTopicMapSource(), received).query).toEqual(received);
  });
});

describe('buildTopicMap — entries', () => {
  it('joins priority, mastery and urgency for each topic', () => {
    const source = makeSource({
      topics: [makeTopic({ id: 'redes' })],
      exams: [makeExam({ id: 'trt3', targetWeight: 0.28 })],
      incidences: [makeIncidence('redes', 'trt3', 1)],
      performance: [makePerformance('redes', 10, 6)],
    });

    const [entry] = buildTopicMap(source, DEFAULT_QUERY).entries;

    expect(entry?.priority.priority).toBe(0.28);
    expect(entry?.mastery).toMatchObject({ kind: 'measured', value: 0.6, averageRetention: null });
    expect(entry?.urgency).toBeCloseTo(0.28 * 0.4, 12);
  });

  it('gives a topic without a performance row mastery no_answers and urgency equal to priority', () => {
    const source = makeSource({
      topics: [makeTopic({ id: 'redes' })],
      exams: [makeExam({ id: 'trt3', targetWeight: 0.28 })],
      incidences: [makeIncidence('redes', 'trt3', 1)],
      performance: [makePerformance('other_topic', 10, 6)],
    });

    const [entry] = buildTopicMap(source, DEFAULT_QUERY).entries;

    expect(entry?.mastery).toEqual({ kind: 'no_answers', value: 0 });
    expect(entry?.urgency).toBe(0.28);
  });

  it('ignores performance rows of topics outside the taxonomy when counting measured', () => {
    const source = makeSource({
      topics: [makeTopic({ id: 'redes' })],
      performance: [makePerformance('unknown', 3, 1)],
    });

    expect(buildTopicMap(source, DEFAULT_QUERY).totals.measured).toBe(0);
  });

  it('lists exams in the matrix column order, the same as the contributions', () => {
    const source = makeSource({
      topics: [makeTopic({ id: 'redes' })],
      exams: [
        makeExam({ id: 'trt15', court: 'TRT-15 (Campinas)', targetWeight: 0.05 }),
        makeExam({ id: 'tjsc', court: 'TJSC', targetWeight: 0.015 }),
        makeExam({ id: 'trt3', court: 'TRT-3 (MG)', targetWeight: 0.28 }),
        makeExam({ id: 'trt2', court: 'TRT-2 (SP)', targetWeight: 0.05 }),
      ],
    });

    const map = buildTopicMap(source, DEFAULT_QUERY);

    expect(map.exams.map((exam) => exam.id)).toEqual(['trt3', 'trt2', 'trt15', 'tjsc']);
    expect(map.entries[0]?.priority.contributions.map((c) => c.exam.id)).toEqual(
      map.exams.map((exam) => exam.id),
    );
  });

  it('returns subtopics ordered by sortOrder', () => {
    const source = makeSource({
      topics: [
        makeTopic({
          id: 'redes',
          subtopics: [
            makeSubtopic({ id: 's3', sortOrder: 3 }),
            makeSubtopic({ id: 's1', sortOrder: 1 }),
            makeSubtopic({ id: 's2', sortOrder: 2 }),
          ],
        }),
      ],
    });

    const [entry] = buildTopicMap(source, DEFAULT_QUERY).entries;

    expect(entry?.topic.subtopics.map((subtopic) => subtopic.id)).toEqual(['s1', 's2', 's3']);
  });

  it('breaks a subtopic sortOrder tie by id', () => {
    const source = makeSource({
      topics: [
        makeTopic({
          id: 'redes',
          subtopics: [
            makeSubtopic({ id: 'b', sortOrder: 1 }),
            makeSubtopic({ id: 'a', sortOrder: 1 }),
          ],
        }),
      ],
    });

    const [entry] = buildTopicMap(source, DEFAULT_QUERY).entries;

    expect(entry?.topic.subtopics.map((subtopic) => subtopic.id)).toEqual(['a', 'b']);
  });

  it('returns an empty map with zero totals for an empty taxonomy', () => {
    const map = buildTopicMap(makeSource(), DEFAULT_QUERY);

    expect(map.entries).toEqual([]);
    expect(map.exams).toEqual([]);
    expect(map.totals).toEqual({ topics: 0, subtopics: 0, exams: 0, shown: 0, measured: 0 });
  });
});

describe('buildTopicDetail', () => {
  it('returns the entry of an existing topic with its priority and contributions', () => {
    const entry = buildTopicDetail(seedTopicMapSource(), 'seg_infra');

    expect(entry?.topic.id).toBe('seg_infra');
    expect(entry?.priority.priority).toBeCloseTo(0.685, 12);
    expect(entry?.priority.contributions).toHaveLength(14);
    expect(entry?.priority.contributions.find((c) => c.exam.id === 'tjmg')).toMatchObject({
      incidence: 0.5,
      contribution: 0.07,
    });
    expect(entry?.mastery).toEqual({ kind: 'no_answers', value: 0 });
  });

  it('lists the 12 subtopics of pdpj_stack in seed order', () => {
    const entry = buildTopicDetail(seedTopicMapSource(), 'pdpj_stack');

    expect(entry?.topic.subtopics).toHaveLength(12);
    expect(entry?.topic.subtopics[0]?.name).toBe('Java');
    expect(entry?.topic.subtopics[11]?.name).toBe('Kubernetes/Rancher');
  });

  it('includes the mastery of the topic', () => {
    const source = { ...seedTopicMapSource(), performance: [makePerformance('redes', 4, 4)] };

    expect(buildTopicDetail(source, 'redes')?.mastery).toMatchObject({
      kind: 'measured',
      value: 1,
    });
  });

  it('returns null for a topic that does not exist', () => {
    expect(buildTopicDetail(seedTopicMapSource(), 'nao_existe')).toBeNull();
  });
});
