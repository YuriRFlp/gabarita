import {
  computeMastery,
  computeTopicPriority,
  computeUrgency,
  type Exam,
  type Incidence,
  type IncidenceValue,
  type Topic,
  type TopicMapEntry,
  type TopicPerformance,
} from '../domain';

export const EXAMS: ReadonlyArray<Exam> = [
  {
    id: 'trt3',
    court: 'TRT-3 (MG)',
    year: 2022,
    examBoardName: 'Fumarc',
    targetWeight: 0.28,
    active: true,
  },
  {
    id: 'tjmg',
    court: 'TJMG',
    year: 2022,
    examBoardName: 'Consulplan',
    targetWeight: 0.14,
    active: true,
  },
  {
    id: 'trf4',
    court: 'TRF-4 (RS/SC/PR)',
    year: 2023,
    examBoardName: 'Cebraspe',
    targetWeight: 0.025,
    active: true,
  },
];

export function makeEntry(options: {
  id?: string;
  name?: string;
  profile?: Topic['profile'];
  phase?: Topic['phase'];
  subtopics?: string[];
  incidences?: ReadonlyArray<IncidenceValue>;
  performance?: Omit<TopicPerformance, 'topicId'>;
  exams?: ReadonlyArray<Exam>;
}): TopicMapEntry {
  const id = options.id ?? 'pdpj_stack';
  const exams = options.exams ?? EXAMS;
  const values = options.incidences ?? [1, 1, 1];
  const incidences: Incidence[] = exams.map((exam, index) => ({
    examId: exam.id,
    topicId: id,
    value: values[index] ?? 0,
  }));
  const topic: Topic = {
    id,
    name: options.name ?? 'Stack da PDPJ-Br',
    category: options.profile === null ? 'general' : 'specific',
    profile: options.profile === undefined ? 'systems' : options.profile,
    phase: options.phase ?? 'pre_notice',
    sortOrder: 1,
    subtopics: (options.subtopics ?? ['Java', 'Spring Boot']).map((name, index) => ({
      id: `${id}_${index}`,
      name,
      sortOrder: index + 1,
    })),
  };
  const priority = computeTopicPriority(id, exams, incidences);
  const mastery = computeMastery(
    options.performance ? { topicId: id, ...options.performance } : undefined,
    null,
  );
  return { topic, priority, mastery, urgency: computeUrgency(priority.priority, mastery.value) };
}
