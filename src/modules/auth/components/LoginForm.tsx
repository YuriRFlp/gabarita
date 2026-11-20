'use client';

import { useActionState, useEffect, useRef } from 'react';
import { LogIn } from 'lucide-react';
import { Button, Field, Notice } from '@/shared/ui';
import { login } from '../actions/login';
import { INITIAL_LOGIN_STATE, type LoginState } from '../actions/login-schema';

type LoginAction = (previous: LoginState, formData: FormData) => Promise<LoginState>;

type LoginFormProps = {
  action?: LoginAction;
  next?: string;
};

export function LoginForm({ action = login, next }: LoginFormProps) {
  const [state, submit, pending] = useActionState(action, INITIAL_LOGIN_STATE);
  const noticeRef = useRef<HTMLDivElement>(null);
  const error = state.status === 'error' ? state : undefined;

  useEffect(() => {
    if (error?.message) noticeRef.current?.focus();
  }, [error]);

  return (
    <form action={submit} noValidate className="gb-form">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field
        id="email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        required
        defaultValue={error?.email ?? ''}
        error={error?.fields?.email}
      />
      <Field
        id="password"
        name="password"
        type="password"
        label="Senha"
        autoComplete="current-password"
        required
        error={error?.fields?.password}
      />
      {error?.message ? (
        <Notice kind="error" ref={noticeRef} tabIndex={-1} resetKey={error}>
          {error.message}
        </Notice>
      ) : null}
      <Button type="submit" loading={pending} icon={<LogIn aria-hidden />}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
