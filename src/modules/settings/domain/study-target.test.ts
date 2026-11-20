import { describe, expect, it } from 'vitest';
import { validateStudyTarget } from './study-target';

describe('validateStudyTarget — CA-10: a published notice requires a target exam', () => {
  it('rejects a published notice without a target exam', () => {
    expect(validateStudyTarget({ targetExamId: null, targetNoticePublished: true })).toEqual({
      ok: false,
      error: 'notice_requires_target',
    });
  });

  it('accepts no target exam with the notice unpublished', () => {
    const input = { targetExamId: null, targetNoticePublished: false };

    expect(validateStudyTarget(input)).toEqual({ ok: true, value: input });
  });

  it('accepts a target exam with the notice published', () => {
    const input = { targetExamId: 'trt2', targetNoticePublished: true };

    expect(validateStudyTarget(input)).toEqual({ ok: true, value: input });
  });

  it('accepts a target exam with the notice unpublished', () => {
    const input = { targetExamId: 'trt2', targetNoticePublished: false };

    expect(validateStudyTarget(input)).toEqual({ ok: true, value: input });
  });
});
