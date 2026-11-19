import { readFileSync } from 'node:fs';
import {
  INCIDENCE_VALUES,
  type IncidenceValue,
  type TopicMapSource,
  type TopicProfile,
  type StudyPhase,
} from '../../src/modules/topics/domain/index.ts';

type SeedTopic = {
  id: string;
  name: string;
  profile?: TopicProfile;
  phase: StudyPhase;
  subtopics: ReadonlyArray<string>;
  priority: number;
  incidence: Record<string, number>;
};
type SeedJson = {
  meta: { target_weights: Record<string, number> };
  exams: ReadonlyArray<{ id: string; court: string; year: number; exam_board: string }>;
  taxonomy: { specific: ReadonlyArray<SeedTopic>; general: ReadonlyArray<SeedTopic> };
};

const SEED_URL = new URL('../../data/seed/court_it_taxonomy_v0.2.json', import.meta.url);

function readSeed(): SeedJson {
  return JSON.parse(readFileSync(SEED_URL, 'utf8'));
}

function toIncidenceValue(value: number): IncidenceValue {
  const match = INCIDENCE_VALUES.find((allowed) => allowed === value);
  if (match === undefined) throw new Error(`Unexpected incidence ${value} in the seed JSON.`);
  return match;
}

/** The priority field of each topic in the seed JSON, the reference for CA-1. */
export function seedPriorities(): Array<{ topicId: string; priority: number }> {
  const { taxonomy } = readSeed();
  return [...taxonomy.specific, ...taxonomy.general].map((topic) => ({
    topicId: topic.id,
    priority: topic.priority,
  }));
}

/** Topic map source as generate_seed.py loads it: every exam active, no answers. */
export function seedTopicMapSource(): TopicMapSource {
  const seed = readSeed();
  const categorized = [
    ...seed.taxonomy.specific.map((topic) => ({ topic, category: 'specific' as const })),
    ...seed.taxonomy.general.map((topic) => ({ topic, category: 'general' as const })),
  ];
  return {
    topics: categorized.map(({ topic, category }, index) => ({
      id: topic.id,
      name: topic.name,
      category,
      profile: topic.profile ?? null,
      phase: topic.phase,
      sortOrder: index + 1,
      subtopics: topic.subtopics.map((name, position) => ({
        id: `${topic.id}_${position + 1}`,
        name,
        sortOrder: position + 1,
      })),
    })),
    exams: seed.exams.map((exam) => ({
      id: exam.id,
      court: exam.court,
      year: exam.year,
      examBoardName: exam.exam_board,
      targetWeight: seed.meta.target_weights[exam.id] ?? Number.NaN,
      active: true,
    })),
    incidences: categorized.flatMap(({ topic }) =>
      Object.entries(topic.incidence).map(([examId, value]) => ({
        examId,
        topicId: topic.id,
        value: toIncidenceValue(value),
      })),
    ),
    performance: [],
  };
}
