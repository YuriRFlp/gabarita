import { describe, expect, it } from 'vitest';
import { readStudyTargetForm, studyTargetSchema } from './study-target-schema';

function form(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(entries)) formData.set(name, value);
  return formData;
}

describe('CA-10 — study target form schema', () => {
  it('reads "Nenhum" without the box as no target and no notice', () => {
    const parsed = readStudyTargetForm(form({ targetExamId: '' }));

    expect(parsed.data).toEqual({ targetExamId: null, targetNoticePublished: false });
  });

  it('reads "Nenhum" with the box checked as a null target and a true flag (the domain rejects it)', () => {
    const parsed = readStudyTargetForm(form({ targetExamId: '', targetNoticePublished: 'on' }));

    expect(parsed.data).toEqual({ targetExamId: null, targetNoticePublished: true });
  });

  it('reads trt2 with the box checked', () => {
    const parsed = readStudyTargetForm(form({ targetExamId: 'trt2', targetNoticePublished: 'on' }));

    expect(parsed.data).toEqual({ targetExamId: 'trt2', targetNoticePublished: true });
  });

  it('reads trt2 without the box as not published', () => {
    const parsed = readStudyTargetForm(form({ targetExamId: 'trt2' }));

    expect(parsed.data).toEqual({ targetExamId: 'trt2', targetNoticePublished: false });
  });

  it.each(['TRT2', 'trt-2', 'a'.repeat(65), ' trt2'])(
    'rejects the exam id "%s"',
    (targetExamId) => {
      expect(readStudyTargetForm(form({ targetExamId })).success).toBe(false);
    },
  );

  it.each(['true', '1', 'off', ''])('rejects the box value "%s"', (value) => {
    expect(
      studyTargetSchema.safeParse({ targetExamId: 'trt2', targetNoticePublished: value }).success,
    ).toBe(false);
  });

  it('rejects a missing targetExamId field', () => {
    expect(readStudyTargetForm(form({})).success).toBe(false);
  });
});
