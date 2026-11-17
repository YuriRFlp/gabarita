import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Logo } from '@/app/logo';
import { createSupabaseServerClient } from '@/shared/supabase';
import { LogoutButton, LOGIN_ROUTE } from '@/modules/auth';
import { ThemeToggle, readThemePreference, readSavedTheme } from '@/modules/settings';
import { AppShell } from './app-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(LOGIN_ROUTE);
  const savedTheme = (await readSavedTheme(client, data.user.id)) ?? (await readThemePreference());

  return (
    <AppShell
      logo={<Logo />}
      actions={
        <>
          <ThemeToggle savedTheme={savedTheme} />
          <LogoutButton />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
