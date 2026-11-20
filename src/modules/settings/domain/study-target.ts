export type StudyTarget = { targetExamId: string | null; targetNoticePublished: boolean };

/** docs/04 exception 1 refers to the target exam's notice, so the flag needs a target. */
export function validateStudyTarget(
  input: StudyTarget,
): { ok: true; value: StudyTarget } | { ok: false; error: 'notice_requires_target' } {
  if (input.targetNoticePublished && input.targetExamId === null) {
    return { ok: false, error: 'notice_requires_target' };
  }
  return { ok: true, value: input };
}
