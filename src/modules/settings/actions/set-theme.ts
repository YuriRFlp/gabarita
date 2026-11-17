'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/shared/supabase';
import { saveTheme } from '../data/settings-repository';
import { writeThemePreference } from '../data/theme-preference-cookie';
import {
  INITIAL_SET_THEME_STATE,
  THEME_FAILURE_MESSAGE,
  setThemeSchema,
  type SetThemeState,
} from './set-theme-schema';

// Duplicated from auth/domain: importing @/modules/auth here would create an import cycle
// between the auth and settings module indexes.
const LOGIN_ROUTE = '/login';

export async function setTheme(
  _previous: SetThemeState,
  formData: FormData,
): Promise<SetThemeState> {
  const validation = setThemeSchema.safeParse({ theme: formData.get('theme') });
  if (!validation.success) return { status: 'error', message: THEME_FAILURE_MESSAGE };

  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(LOGIN_ROUTE);

  // Database before cookie: if the database fails, the cache does not drift from the source of truth.
  const saved = await saveTheme(client, data.user.id, validation.data.theme);
  if (!saved.ok) return { status: 'error', message: THEME_FAILURE_MESSAGE };

  await writeThemePreference(validation.data.theme);
  revalidatePath('/', 'layout');
  return INITIAL_SET_THEME_STATE;
}
