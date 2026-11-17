'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/shared/supabase';
import { ensureSettings, writeThemePreference } from '@/modules/settings';
import { safeReturnPath } from '../domain';
import {
  INVALID_CREDENTIALS_MESSAGE,
  LOGIN_FAILURE_MESSAGE,
  loginSchema,
  type LoginField,
  type LoginState,
} from './login-schema';

function asString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = asString(formData.get('email')) ?? '';
  const validation = loginSchema.safeParse({
    email,
    password: asString(formData.get('password')) ?? '',
    next: asString(formData.get('next')),
  });
  if (!validation.success) {
    const fields: Partial<Record<LoginField, string>> = {};
    for (const issue of validation.error.issues) {
      const field = issue.path[0];
      if ((field === 'email' || field === 'password') && !fields[field])
        fields[field] = issue.message;
    }
    return { status: 'error', fields, email };
  }

  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  });
  if (error || !data.user) {
    if (error?.code === 'invalid_credentials') {
      return { status: 'error', message: INVALID_CREDENTIALS_MESSAGE, email };
    }
    console.error('login: unexpected authentication failure', error);
    return { status: 'error', message: LOGIN_FAILURE_MESSAGE, email };
  }

  const settings = await ensureSettings(client, data.user.id);
  if (!settings.ok) {
    // The app does not work without the settings row: undo the login instead of continuing halfway.
    await client.auth.signOut({ scope: 'local' });
    return { status: 'error', message: LOGIN_FAILURE_MESSAGE, email };
  }

  await writeThemePreference(settings.theme);
  redirect(safeReturnPath(validation.data.next));
}
