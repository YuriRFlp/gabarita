'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/shared/supabase';
import {
  deleteExamWeights,
  readExamCatalog,
  readExamWeights,
  saveExamWeights as writeExamWeights,
} from '../data/exam-weights-repository';
import {
  applyExamWeights,
  isDefaultWeightSet,
  rebalanceWeights,
  validateWeightSet,
  type WeightUnits,
} from '../domain';
import {
  INVALID_FIELDS_MESSAGE,
  NOTHING_TO_REBALANCE_MESSAGE,
  SAVED_MESSAGE,
  SAVE_FAILED_MESSAGE,
  lockedExceedsTotalMessage,
  readExamWeightsForm,
  readWeightInputs,
  sumNotTotalMessage,
  weightFieldErrors,
  type ExamWeightsFormState,
} from './exam-weights-schema';

// Duplicated from auth/domain: importing @/modules/auth would create an import cycle (as in set-theme).
const LOGIN_ROUTE = '/login';

function failure(
  message: string,
  values: Readonly<Record<string, string>>,
  fieldErrors: Readonly<Record<string, string>> = {},
): ExamWeightsFormState {
  return { status: 'error', message, fieldErrors, values };
}

export async function saveExamWeights(
  _previous: ExamWeightsFormState,
  formData: FormData,
): Promise<ExamWeightsFormState> {
  const typed = readWeightInputs(formData);
  const parsed = readExamWeightsForm(formData);
  if (!parsed.success) {
    const fieldErrors = weightFieldErrors(parsed.error);
    const hasFieldErrors = Object.keys(fieldErrors).length > 0;
    return failure(
      hasFieldErrors ? INVALID_FIELDS_MESSAGE : SAVE_FAILED_MESSAGE,
      typed,
      fieldErrors,
    );
  }

  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(LOGIN_ROUTE);

  const [catalog, overrides] = await Promise.all([
    readExamCatalog(client),
    readExamWeights(client, data.user.id),
  ]);
  if (!catalog.ok || !overrides.ok) return failure(SAVE_FAILED_MESSAGE, typed);

  const input = new Map<string, WeightUnits>(Object.entries(parsed.data.weights));
  const activeExams = catalog.value.filter((exam) => exam.active);
  let set: ReadonlyMap<string, WeightUnits>;

  if (parsed.data.intent === 'save') {
    const validation = validateWeightSet(
      activeExams.map((exam) => exam.id),
      input,
    );
    if (!validation.ok) {
      const { error } = validation;
      return failure(
        error.kind === 'sum_not_total' ? sumNotTotalMessage(error.total) : SAVE_FAILED_MESSAGE,
        typed,
      );
    }
    set = validation.value;
  } else {
    // "Changed" is decided against the effective weights read now, not against the page (CA-23).
    const current = applyExamWeights(catalog.value, overrides.value).exams;
    const rebalanced = rebalanceWeights(
      current.filter((exam) => exam.active),
      input,
    );
    if (!rebalanced.ok) {
      const { error } = rebalanced;
      if (error.kind === 'locked_exceeds_total') {
        return failure(lockedExceedsTotalMessage(error.lockedTotal), typed);
      }
      return failure(
        error.kind === 'nothing_to_rebalance' ? NOTHING_TO_REBALANCE_MESSAGE : SAVE_FAILED_MESSAGE,
        typed,
      );
    }
    set = rebalanced.value;
  }

  // A set equal to the defaults is stored as "no rows", so later seed changes still reach the user.
  const written = isDefaultWeightSet(catalog.value, set)
    ? await deleteExamWeights(client, data.user.id)
    : await writeExamWeights(client, data.user.id, set);
  if (!written.ok) return failure(SAVE_FAILED_MESSAGE, typed);

  revalidatePath('/settings');
  revalidatePath('/topics', 'layout');
  return { status: 'saved', message: SAVED_MESSAGE };
}
