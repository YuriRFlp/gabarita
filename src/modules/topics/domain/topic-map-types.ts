import type { ExamWeightOverride } from './exam-weights';

export const TOPIC_CATEGORIES = ['specific', 'general'] as const;
export const TOPIC_PROFILES = ['systems', 'infra', 'common'] as const;
export const STUDY_PHASES = ['pre_notice', 'post_notice'] as const;
export const INCIDENCE_VALUES = [0, 0.5, 1] as const;

export type TopicCategory = (typeof TOPIC_CATEGORIES)[number];
export type TopicProfile = (typeof TOPIC_PROFILES)[number];
export type StudyPhase = (typeof STUDY_PHASES)[number];
export type IncidenceValue = (typeof INCIDENCE_VALUES)[number];

export type Subtopic = { id: string; name: string; sortOrder: number };

export type Topic = {
  id: string;
  name: string;
  category: TopicCategory;
  profile: TopicProfile | null;
  phase: StudyPhase;
  sortOrder: number;
  subtopics: ReadonlyArray<Subtopic>;
};

export type Exam = {
  id: string;
  /** Court as stored, e.g. "TRT-3 (MG)". */
  court: string;
  year: number;
  examBoardName: string;
  /** 0 to 1 with at most 3 decimals (numeric(4,3) in the database). */
  targetWeight: number;
  active: boolean;
};

export type Incidence = { examId: string; topicId: string; value: IncidenceValue };

/** One row of v_topic_performance for the current user (last 60 days). */
export type TopicPerformance = { topicId: string; answered: number; firmCorrect: number };

export type TopicMapSource = {
  topics: ReadonlyArray<Topic>;
  /** targetWeight = seed default. */
  exams: ReadonlyArray<Exam>;
  incidences: ReadonlyArray<Incidence>;
  performance: ReadonlyArray<TopicPerformance>;
  /** The user's exam_weights rows; empty = default weights (ADR-011). */
  weightOverrides: ReadonlyArray<ExamWeightOverride>;
};
