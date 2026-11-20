'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/shared/supabase';
import {
  readActiveExamOptions,
  saveStudyTarget as writeStudyTarget,
} from '../data/settings-repository';
import { validateStudyTarget } from '../domain';
import {
  NOTICE_REQUIRES_TARGET_MESSAGE,
  STUDY_TARGET_FAILURE_MESSAGE,
  STUDY_TARGET_SAVED_MESSAGE,
  readStudyTargetForm,
  type StudyTargetFormState,
} from './study-target-schema';

// Duplicated from auth/domain: importing @/modules/auth would create an import cycle (as in set-theme).
const LOGIN_ROUTE = '/login';

const FAILURE: StudyTargetFormState = { status: 'error', message: STUDY_TARGET_FAILURE_MESSAGE };

export async function saveStudyTarget(
  _previous: StudyTargetFormState,
  formData: FormData,
): Promise<StudyTargetFormState> {
  const parsed = readStudyTargetForm(formData);
  if (!parsed.success) return FAILURE;

  const target = validateStudyTarget(parsed.data);
  if (!target.ok) return { status: 'error', message: NOTICE_REQUIRES_TARGET_MESSAGE };

  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(LOGIN_ROUTE);

  if (target.value.targetExamId !== null) {
    const options = await readActiveExamOptions(client);
    if (!options.ok) return FAILURE;
    if (!options.value.some((option) => option.id === target.value.targetExamId)) return FAILURE;
  }

  const saved = await writeStudyTarget(client, data.user.id, target.value);
  if (!saved.ok) return FAILURE;

  revalidatePath('/settings');
  return { status: 'saved', message: STUDY_TARGET_SAVED_MESSAGE };
}
