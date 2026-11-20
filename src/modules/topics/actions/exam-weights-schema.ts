import { z } from 'zod';
import { formatShare } from '@/shared/utils/format';
import { TOTAL_WEIGHT_UNITS, type WeightUnits } from '../domain';

export const EXAM_ID_PATTERN = /^[a-z0-9_]{1,64}$/;
/** The input of exam trt2 is named "weight.trt2". */
export const WEIGHT_FIELD_PREFIX = 'weight.';

export const WEIGHT_FIELD_MESSAGE =
  'Use um número de 0 a 100, com no máximo uma casa decimal (ex.: 2,5).';
export const INVALID_FIELDS_MESSAGE = 'Corrija os pesos destacados e tente de novo.';
export const NOTHING_TO_REBALANCE_MESSAGE =
  'Para ajustar os demais, deixe pelo menos um concurso com o peso salvo e maior que 0.';
export const SAVE_FAILED_MESSAGE = 'Não foi possível salvar os pesos. Tente de novo.';
export const SAVED_MESSAGE = 'Pesos salvos. A prioridade dos assuntos já usa os novos pesos.';
export const RESTORED_MESSAGE = 'Pesos padrão restaurados.';

const SETTINGS_PATH = '/settings';
const WEIGHTS_ANCHOR = '#exam-weights';
export const WEIGHTS_SETTINGS_HREF = `${SETTINGS_PATH}${WEIGHTS_ANCHOR}`;
export const RESTORE_HREF = `${SETTINGS_PATH}?confirm=restore${WEIGHTS_ANCHOR}`;

/** Sent by the restore form only once JavaScript runs; its absence means a plain browser POST. */
export const ENHANCED_FIELD = 'enhanced';
/** Where a restore without JavaScript lands: no `?confirm=restore`, and the result in the address. */
export const RESTORED_PATH = `${SETTINGS_PATH}?restored=1${WEIGHTS_ANCHOR}`;

export function sumNotTotalMessage(total: WeightUnits): string {
  return `A soma dos pesos precisa ser 100%. Agora está em ${formatShare(total / TOTAL_WEIGHT_UNITS)}.`;
}

export function lockedExceedsTotalMessage(lockedTotal: WeightUnits): string {
  return `Os pesos alterados já somam ${formatShare(lockedTotal / TOTAL_WEIGHT_UNITS)}, mais que 100%. Reduza algum deles.`;
}

/** "40" → 400, "2,5" → 25: percentage points with one decimal are exactly thousandths. */
function percentTextToUnits(text: string): WeightUnits {
  const [whole = '0', decimal = '0'] = text.replace(',', '.').split('.');
  return Number(whole) * 10 + Number(decimal);
}

// At most 100 and one decimal place; `\d` is ASCII-only here, so "٣" and "1e2" are rejected.
export const weightPercentSchema = z
  .string()
  .trim()
  .regex(/^\d{1,3}(?:[.,]\d)?$/, WEIGHT_FIELD_MESSAGE)
  .transform(percentTextToUnits)
  .refine((units) => units <= TOTAL_WEIGHT_UNITS, WEIGHT_FIELD_MESSAGE);

export const examWeightsFormSchema = z.object({
  intent: z.enum(['save', 'rebalance']),
  weights: z.record(z.string().regex(EXAM_ID_PATTERN), weightPercentSchema),
});

/** What the user typed, by exam id, exactly as submitted (kept in the form on error). */
export function readWeightInputs(formData: FormData): Record<string, string> {
  const inputs: Record<string, string> = {};
  for (const [name, value] of formData.entries()) {
    if (!name.startsWith(WEIGHT_FIELD_PREFIX)) continue;
    inputs[name.slice(WEIGHT_FIELD_PREFIX.length)] = typeof value === 'string' ? value : '';
  }
  return inputs;
}

export function readExamWeightsForm(formData: FormData) {
  return examWeightsFormSchema.safeParse({
    intent: formData.get('intent'),
    weights: readWeightInputs(formData),
  });
}

/** Messages by exam id for the invalid weight fields of a failed parse. */
export function weightFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const [root, examId] = issue.path;
    if (root === 'weights' && typeof examId === 'string') errors[examId] = WEIGHT_FIELD_MESSAGE;
  }
  return errors;
}

/** Live total for the form; null when any field is invalid ("Há valores inválidos"). */
export function sumWeightInputs(values: Readonly<Record<string, string>>): WeightUnits | null {
  let total = 0;
  for (const text of Object.values(values)) {
    const parsed = weightPercentSchema.safeParse(text);
    if (!parsed.success) return null;
    total += parsed.data;
  }
  return total;
}

export type ExamWeightsFormState =
  | { status: 'idle' }
  | { status: 'saved'; message: string }
  | {
      status: 'error';
      /** Summary shown above the table; receives focus. */
      message: string;
      /** By exam id. */
      fieldErrors: Readonly<Record<string, string>>;
      /** What the user typed, kept on error. */
      values: Readonly<Record<string, string>>;
    };

export const INITIAL_EXAM_WEIGHTS_STATE: ExamWeightsFormState = { status: 'idle' };
