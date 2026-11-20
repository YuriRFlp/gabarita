import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Logo } from '@/app/logo';
import { createSupabaseServerClient } from '@/shared/supabase';
import { LogoutButton, LOGIN_ROUTE } from '@/modules/auth';
import { AppShell } from './app-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(LOGIN_ROUTE);

  return (
    <AppShell logo={<Logo />} actions={<LogoutButton />}>
      {children}
    </AppShell>
  );
}
