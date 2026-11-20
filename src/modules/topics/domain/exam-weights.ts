import { sortExams } from './priority';
import type { Exam } from './topic-map-types';

/** Integer thousandths: 1000 = 100%, 1 = 0.1 percentage point. */
export type WeightUnits = number;
export const TOTAL_WEIGHT_UNITS = 1000;

/** One row of exam_weights for the current user. weight is 0..1 with at most 3 decimals. */
export type ExamWeightOverride = { examId: string; weight: number };
export type ExamWeightsMode = 'default' | 'custom';
export type ExamWeightsSummary = {
  /** custom = the user has at least one override. */
  mode: ExamWeightsMode;
  /** Sum of the effective weights of active exams. */
  activeTotal: WeightUnits;
  /** Active exams without a row in custom mode (they count as 0). */
  unweightedExamIds: ReadonlyArray<string>;
  /** weightsFingerprint of the overrides; null in default mode (nothing to dismiss). */
  fingerprint: string | null;
};

export type WeightSetError =
  | { kind: 'missing_exam'; examId: string }
  | { kind: 'unknown_exam'; examId: string }
  | { kind: 'sum_not_total'; total: WeightUnits };

export type RebalanceError =
  | Exclude<WeightSetError, { kind: 'sum_not_total' }>
  | { kind: 'locked_exceeds_total'; lockedTotal: WeightUnits }
  | { kind: 'nothing_to_rebalance' };

type WeightSetResult<E> =
  { ok: true; value: ReadonlyMap<string, WeightUnits> } | { ok: false; error: E };

/** null = no weight (CA-26). */
export type ExamWeightRow = { exam: Exam; defaultWeight: number; weight: number | null };
export type ExamWeightsSettings = {
  /** Ordered by default weight (sortExams over the defaults), so rows do not jump after saving. */
  active: ReadonlyArray<ExamWeightRow>;
  inactive: ReadonlyArray<Exam>;
  summary: ExamWeightsSummary;
};

export function toWeightUnits(weight: number): WeightUnits {
  return Math.round(weight * TOTAL_WEIGHT_UNITS);
}

/**
 * Short, stable identity of a set of overrides (FNV-1a 32 bits over the sorted "examId:units"
 * pairs, in base36). Lets a dismissed notice stay closed until the weights change (SPEC-005 CA-35).
 */
export function weightsFingerprint(overrides: ReadonlyArray<ExamWeightOverride>): string {
  const canonical = overrides
    .map((override) => `${override.examId}:${toWeightUnits(override.weight)}`)
    .sort()
    .join('|');
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function fromWeightUnits(units: WeightUnits): number {
  return units / TOTAL_WEIGHT_UNITS;
}

function sumUnits(values: Iterable<WeightUnits>): WeightUnits {
  let total = 0;
  for (const units of values) total += units;
  return total;
}

/**
 * ADR-011: the seed weight is the default; with any override, the user's set replaces it and an
 * active exam without a row weighs 0. Returns exams with targetWeight set to the effective weight.
 */
export function applyExamWeights(
  exams: ReadonlyArray<Exam>,
  overrides: ReadonlyArray<ExamWeightOverride>,
): { exams: Exam[]; summary: ExamWeightsSummary } {
  const mode: ExamWeightsMode = overrides.length > 0 ? 'custom' : 'default';
  const overrideUnits = new Map(
    overrides.map((override) => [override.examId, toWeightUnits(override.weight)]),
  );

  const effective = exams.map((exam): Exam => {
    if (mode === 'default') return { ...exam };
    return { ...exam, targetWeight: fromWeightUnits(overrideUnits.get(exam.id) ?? 0) };
  });
  const active = effective.filter((exam) => exam.active);
  const unweightedExamIds =
    mode === 'custom'
      ? sortExams(exams.filter((exam) => exam.active && !overrideUnits.has(exam.id))).map(
          (exam) => exam.id,
        )
      : [];

  return {
    exams: effective,
    summary: {
      mode,
      activeTotal: sumUnits(active.map((exam) => toWeightUnits(exam.targetWeight))),
      unweightedExamIds,
      fingerprint: mode === 'custom' ? weightsFingerprint(overrides) : null,
    },
  };
}

function checkMembership(
  activeExamIds: ReadonlyArray<string>,
  input: ReadonlyMap<string, WeightUnits>,
): Exclude<WeightSetError, { kind: 'sum_not_total' }> | null {
  const active = new Set(activeExamIds);
  for (const examId of input.keys()) {
    if (!active.has(examId)) return { kind: 'unknown_exam', examId };
  }
  for (const examId of activeExamIds) {
    if (!input.has(examId)) return { kind: 'missing_exam', examId };
  }
  return null;
}

export function validateWeightSet(
  activeExamIds: ReadonlyArray<string>,
  input: ReadonlyMap<string, WeightUnits>,
): WeightSetResult<WeightSetError> {
  const membership = checkMembership(activeExamIds, input);
  if (membership !== null) return { ok: false, error: membership };
  const total = sumUnits(input.values());
  if (total !== TOTAL_WEIGHT_UNITS) return { ok: false, error: { kind: 'sum_not_total', total } };
  return { ok: true, value: input };
}

/**
 * Exams whose input differs from the current weight are kept; the others are scaled to fill the
 * rest, by the largest remainder method in integers, ties broken by sortExams over the current
 * weights. The result always sums to exactly 1000.
 */
export function rebalanceWeights(
  activeExams: ReadonlyArray<Exam>,
  input: ReadonlyMap<string, WeightUnits>,
): WeightSetResult<RebalanceError> {
  const ordered = sortExams(activeExams.filter((exam) => exam.active));
  const membership = checkMembership(
    ordered.map((exam) => exam.id),
    input,
  );
  if (membership !== null) return { ok: false, error: membership };

  const unitsOf = (exam: Exam): WeightUnits => input.get(exam.id) ?? 0;
  const locked = ordered.filter((exam) => unitsOf(exam) !== toWeightUnits(exam.targetWeight));
  const free = ordered.filter((exam) => unitsOf(exam) === toWeightUnits(exam.targetWeight));

  const lockedTotal = sumUnits(locked.map(unitsOf));
  if (lockedTotal > TOTAL_WEIGHT_UNITS) {
    return { ok: false, error: { kind: 'locked_exceeds_total', lockedTotal } };
  }
  const rest = TOTAL_WEIGHT_UNITS - lockedTotal;
  const freeTotal = sumUnits(free.map(unitsOf));
  if (rest > 0 && freeTotal === 0) return { ok: false, error: { kind: 'nothing_to_rebalance' } };

  const result = new Map<string, WeightUnits>();
  for (const exam of ordered) result.set(exam.id, unitsOf(exam));
  if (freeTotal === 0) return { ok: true, value: result };

  // Integer quotient and remainder of units × rest / freeTotal: the remainders share the same
  // denominator, so comparing them is exact and no float rounding can break the 1000 total.
  const shares = free.map((exam, position) => {
    const numerator = unitsOf(exam) * rest;
    return {
      exam,
      position,
      floor: Math.floor(numerator / freeTotal),
      remainder: numerator % freeTotal,
    };
  });
  let leftover = rest - sumUnits(shares.map((share) => share.floor));
  const byRemainder = [...shares].sort(
    (a, b) => b.remainder - a.remainder || a.position - b.position,
  );
  const bonus = new Set<string>();
  for (const share of byRemainder) {
    if (leftover === 0) break;
    bonus.add(share.exam.id);
    leftover -= 1;
  }
  for (const share of shares) {
    result.set(share.exam.id, share.floor + (bonus.has(share.exam.id) ? 1 : 0));
  }
  return { ok: true, value: result };
}

export function isDefaultWeightSet(
  exams: ReadonlyArray<Exam>,
  set: ReadonlyMap<string, WeightUnits>,
): boolean {
  const active = exams.filter((exam) => exam.active);
  return (
    set.size === active.length &&
    active.every((exam) => set.get(exam.id) === toWeightUnits(exam.targetWeight))
  );
}

export function buildExamWeightsSettings(
  exams: ReadonlyArray<Exam>,
  overrides: ReadonlyArray<ExamWeightOverride>,
): ExamWeightsSettings {
  const { exams: effective, summary } = applyExamWeights(exams, overrides);
  const effectiveById = new Map(effective.map((exam) => [exam.id, exam.targetWeight]));
  const unweighted = new Set(summary.unweightedExamIds);
  const ordered = sortExams(exams);

  return {
    active: ordered
      .filter((exam) => exam.active)
      .map((exam) => ({
        exam,
        defaultWeight: exam.targetWeight,
        weight: unweighted.has(exam.id) ? null : (effectiveById.get(exam.id) ?? null),
      })),
    inactive: ordered.filter((exam) => !exam.active),
    summary,
  };
}
