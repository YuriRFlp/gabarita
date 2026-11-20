'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/shared/supabase';
import { deleteExamWeights } from '../data/exam-weights-repository';
import {
  ENHANCED_FIELD,
  RESTORED_MESSAGE,
  RESTORED_PATH,
  SAVE_FAILED_MESSAGE,
  type ExamWeightsFormState,
} from './exam-weights-schema';

// Duplicated from auth/domain: importing @/modules/auth would create an import cycle (as in set-theme).
const LOGIN_ROUTE = '/login';

const enhancedSchema = z.literal('1');

export async function restoreDefaultWeights(
  _previous: ExamWeightsFormState,
  formData: FormData,
): Promise<ExamWeightsFormState> {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(LOGIN_ROUTE);

  const deleted = await deleteExamWeights(client, data.user.id);
  if (!deleted.ok) {
    return { status: 'error', message: SAVE_FAILED_MESSAGE, fieldErrors: {}, values: {} };
  }

  revalidatePath('/settings');
  revalidatePath('/topics', 'layout');
  // A plain POST would re-render the page still on ?confirm=restore; with JavaScript the client
  // clears the address itself and keeps the message in the action state.
  if (!enhancedSchema.safeParse(formData.get(ENHANCED_FIELD)).success) redirect(RESTORED_PATH);
  return { status: 'saved', message: RESTORED_MESSAGE };
}
