import type { Exam, Incidence, IncidenceValue } from './topic-map-types';

export type PriorityContribution = {
  exam: Exam;
  /** 0 when there is no row in incidences. */
  incidence: IncidenceValue;
  /** targetWeight × incidence; 0 when not counted. */
  contribution: number;
  /** false for inactive exams. */
  counted: boolean;
};

export type TopicPriority = {
  topicId: string;
  /** 0 to 1 when the active weights sum to 1. */
  priority: number;
  /** Weight descending, then court in numeric collation. */
  contributions: ReadonlyArray<PriorityContribution>;
};

// Integer units: weights have at most 3 decimals and incidences are multiples of 0.5, so
// thousandths × halves sums exactly and a single division keeps ties exact and 1 exactly 1.
const WEIGHT_SCALE = 1000;
const INCIDENCE_SCALE = 2;
const PRODUCT_SCALE = WEIGHT_SCALE * INCIDENCE_SCALE;

const courtCollator = new Intl.Collator('pt-BR', { numeric: true });

function compareExams(a: Exam, b: Exam): number {
  return (
    b.targetWeight - a.targetWeight ||
    courtCollator.compare(a.court, b.court) ||
    Number(a.id > b.id) - Number(a.id < b.id)
  );
}

/** Matrix column and contribution order: weight descending, then court ("TRT-2" before "TRT-15"). */
export function sortExams(exams: ReadonlyArray<Exam>): Exam[] {
  return [...exams].sort(compareExams);
}

function scaledProduct(exam: Exam, incidence: IncidenceValue): number {
  return Math.round(exam.targetWeight * WEIGHT_SCALE) * Math.round(incidence * INCIDENCE_SCALE);
}

/**
 * docs/04 § Prioridade: Σ target weight × incidence over the active exams. Summed as integers
 * (weight in thousandths × incidence in halves) so that ties are exact and 1 is exactly 1.
 */
export function computeTopicPriority(
  topicId: string,
  exams: ReadonlyArray<Exam>,
  incidences: ReadonlyArray<Incidence>,
): TopicPriority {
  const incidenceByExam = new Map<string, IncidenceValue>();
  for (const incidence of incidences) {
    if (incidence.topicId === topicId) incidenceByExam.set(incidence.examId, incidence.value);
  }

  let scaledTotal = 0;
  const contributions = sortExams(exams).map((exam): PriorityContribution => {
    const incidence = incidenceByExam.get(exam.id) ?? 0;
    const scaled = exam.active ? scaledProduct(exam, incidence) : 0;
    scaledTotal += scaled;
    return { exam, incidence, contribution: scaled / PRODUCT_SCALE, counted: exam.active };
  });

  return { topicId, priority: scaledTotal / PRODUCT_SCALE, contributions };
}
