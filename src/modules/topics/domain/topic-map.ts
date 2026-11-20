import { applyExamWeights, type ExamWeightsSummary } from './exam-weights';
import { computeMastery, type Mastery } from './mastery';
import { computeTopicPriority, sortExams, type TopicPriority } from './priority';
import type {
  Exam,
  Topic,
  TopicCategory,
  TopicMapSource,
  TopicPerformance,
  TopicProfile,
} from './topic-map-types';
import { computeUrgency } from './urgency';

export const TOPIC_MAP_VIEWS = ['list', 'matrix'] as const;
export const TOPIC_MAP_SORTS = ['urgency', 'priority', 'name'] as const;

export type TopicMapView = (typeof TOPIC_MAP_VIEWS)[number];
export type TopicMapSort = (typeof TOPIC_MAP_SORTS)[number];

export type TopicMapQuery = {
  view: TopicMapView;
  category: TopicCategory | 'all';
  profile: TopicProfile | 'all';
  sort: TopicMapSort;
};

export type TopicMapEntry = {
  topic: Topic;
  priority: TopicPriority;
  mastery: Mastery;
  urgency: number;
};

export type TopicMap = {
  query: TopicMapQuery;
  /** Filtered and sorted. */
  entries: ReadonlyArray<TopicMapEntry>;
  /** Matrix column order, the same as the contributions. */
  exams: ReadonlyArray<Exam>;
  /** topics, subtopics, exams and measured count the whole taxonomy; shown counts the entries. */
  totals: { topics: number; subtopics: number; exams: number; shown: number; measured: number };
  weights: ExamWeightsSummary;
};

export type TopicDetail = TopicMapEntry & { weights: ExamWeightsSummary };

const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

function compareIds(a: string, b: string): number {
  return Number(a > b) - Number(a < b);
}

function compareSortOrder(a: TopicMapEntry, b: TopicMapEntry): number {
  return a.topic.sortOrder - b.topic.sortOrder || compareIds(a.topic.id, b.topic.id);
}

const COMPARATORS: Record<TopicMapSort, (a: TopicMapEntry, b: TopicMapEntry) => number> = {
  urgency: (a, b) => b.urgency - a.urgency || compareSortOrder(a, b),
  priority: (a, b) => b.priority.priority - a.priority.priority || compareSortOrder(a, b),
  name: (a, b) => nameCollator.compare(a.topic.name, b.topic.name) || compareSortOrder(a, b),
};

function buildEntry(
  topic: Topic,
  source: TopicMapSource,
  exams: ReadonlyArray<Exam>,
  performance: TopicPerformance | undefined,
): TopicMapEntry {
  const priority = computeTopicPriority(topic.id, exams, source.incidences);
  // Average retention is not computed until module 3 (SPEC-004 P-4).
  const mastery = computeMastery(performance, null);
  const subtopics = [...topic.subtopics].sort(
    (a, b) => a.sortOrder - b.sortOrder || compareIds(a.id, b.id),
  );
  return {
    topic: { ...topic, subtopics },
    priority,
    mastery,
    urgency: computeUrgency(priority.priority, mastery.value),
  };
}

function performanceByTopic(source: TopicMapSource): Map<string, TopicPerformance> {
  return new Map(source.performance.map((row) => [row.topicId, row]));
}

function matchesQuery(topic: Topic, query: TopicMapQuery): boolean {
  return (
    (query.category === 'all' || topic.category === query.category) &&
    (query.profile === 'all' || topic.profile === query.profile)
  );
}

export function buildTopicMap(source: TopicMapSource, query: TopicMapQuery): TopicMap {
  const weights = applyExamWeights(source.exams, source.weightOverrides);
  const performance = performanceByTopic(source);
  const all = source.topics.map((topic) =>
    buildEntry(topic, source, weights.exams, performance.get(topic.id)),
  );
  const entries = all
    .filter((entry) => matchesQuery(entry.topic, query))
    .sort(COMPARATORS[query.sort]);

  return {
    query,
    entries,
    exams: sortExams(weights.exams),
    totals: {
      topics: source.topics.length,
      subtopics: source.topics.reduce((sum, topic) => sum + topic.subtopics.length, 0),
      exams: source.exams.length,
      shown: entries.length,
      measured: all.filter((entry) => entry.mastery.kind === 'measured').length,
    },
    weights: weights.summary,
  };
}

export function buildTopicDetail(source: TopicMapSource, topicId: string): TopicDetail | null {
  const topic = source.topics.find((candidate) => candidate.id === topicId);
  if (topic === undefined) return null;
  const weights = applyExamWeights(source.exams, source.weightOverrides);
  const entry = buildEntry(topic, source, weights.exams, performanceByTopic(source).get(topicId));
  return { ...entry, weights: weights.summary };
}
