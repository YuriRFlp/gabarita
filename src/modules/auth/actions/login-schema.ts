import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: 'Informe um e-mail válido.' })),
  password: z.string().min(1, { error: 'Informe a senha.' }),
  next: z.string().optional(),
});

export type LoginField = 'email' | 'password';

export type LoginState =
  | { status: 'idle' }
  | {
      status: 'error';
      message?: string;
      fields?: Partial<Record<LoginField, string>>;
      email: string;
    };

export const INITIAL_LOGIN_STATE: LoginState = { status: 'idle' };

export const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha incorretos.';
export const LOGIN_FAILURE_MESSAGE = 'Não foi possível entrar agora. Tente de novo em instantes.';
