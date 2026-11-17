import type { Metadata } from 'next';
import { Logo } from '@/app/logo';
import { LoginForm } from '@/modules/auth';

export const metadata: Metadata = { title: 'Entrar' };

type LoginPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  return (
    <main className="gb-login">
      <div className="gb-login__card">
        <Logo />
        <h1>Entrar</h1>
        <LoginForm next={typeof next === 'string' ? next : undefined} />
      </div>
    </main>
  );
}
