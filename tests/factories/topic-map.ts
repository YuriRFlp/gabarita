import type {
  Exam,
  Incidence,
  IncidenceValue,
  Subtopic,
  Topic,
  TopicMapSource,
  TopicPerformance,
} from '../../src/modules/topics/domain/index.ts';

let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

export function makeSubtopic(overrides: Partial<Subtopic> = {}): Subtopic {
  return { id: nextId('subtopic'), name: 'Subtopic', sortOrder: 1, ...overrides };
}

export function makeTopic(overrides: Partial<Topic> = {}): Topic {
  const id = overrides.id ?? nextId('topic');
  return {
    id,
    name: `Topic ${id}`,
    category: 'specific',
    profile: 'systems',
    phase: 'pre_notice',
    sortOrder: 1,
    subtopics: [],
    ...overrides,
  };
}

export function makeExam(overrides: Partial<Exam> = {}): Exam {
  const id = overrides.id ?? nextId('exam');
  return {
    id,
    court: `Court ${id}`,
    year: 2025,
    examBoardName: 'Board',
    targetWeight: 0.1,
    active: true,
    ...overrides,
  };
}

export function makeIncidence(
  topicId: string,
  examId: string,
  value: IncidenceValue = 1,
): Incidence {
  return { topicId, examId, value };
}

export function makePerformance(
  topicId: string,
  answered: number,
  firmCorrect: number,
): TopicPerformance {
  return { topicId, answered, firmCorrect };
}

export function makeSource(overrides: Partial<TopicMapSource> = {}): TopicMapSource {
  return {
    topics: [],
    exams: [],
    incidences: [],
    performance: [],
    weightOverrides: [],
    ...overrides,
  };
}
