import { z } from 'zod';

// Same pattern as the exam weights form; settings may not import the topics module.
const EXAM_ID_PATTERN = /^[a-z0-9_]{1,64}$/;

export const studyTargetSchema = z.object({
  targetExamId: z.union([z.literal('').transform(() => null), z.string().regex(EXAM_ID_PATTERN)]),
  targetNoticePublished: z
    .literal('on')
    .optional()
    .transform((value) => value === 'on'),
});

export type StudyTargetFormState =
  { status: 'idle' } | { status: 'saved'; message: string } | { status: 'error'; message: string };

export const INITIAL_STUDY_TARGET_STATE: StudyTargetFormState = { status: 'idle' };

export const STUDY_TARGET_SAVED_MESSAGE = 'Concurso-alvo salvo.';
export const NOTICE_REQUIRES_TARGET_MESSAGE =
  'Escolha o concurso-alvo antes de marcar o edital como publicado.';
export const STUDY_TARGET_FAILURE_MESSAGE =
  'Não foi possível salvar o concurso-alvo. Tente de novo.';

/** The unchecked box is absent from the FormData, hence `undefined` (not null) for it. */
export function readStudyTargetForm(formData: FormData) {
  return studyTargetSchema.safeParse({
    targetExamId: formData.get('targetExamId'),
    targetNoticePublished: formData.get('targetNoticePublished') ?? undefined,
  });
}
