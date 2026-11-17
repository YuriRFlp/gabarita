import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  INVALID_CREDENTIALS_MESSAGE,
  LOGIN_FAILURE_MESSAGE,
  type LoginState,
} from '../actions/login-schema';
import { LoginForm } from './LoginForm';

vi.mock('../actions/login', () => ({ login: vi.fn() }));

type Action = (previous: LoginState, formData: FormData) => Promise<LoginState>;

function resolvingWith(state: LoginState) {
  return vi.fn<Action>(async () => state);
}

function deferredAction() {
  let resolve: (state: LoginState) => void = () => undefined;
  const action = vi.fn<Action>(
    () =>
      new Promise<LoginState>((done) => {
        resolve = done;
      }),
  );
  return { action, resolve: (state: LoginState) => resolve(state) };
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText('E-mail'), email);
  if (password) await user.type(screen.getByLabelText('Senha'), password);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  return user;
}

describe('LoginForm', () => {
  it('renders labeled e-mail and password fields and the submit button', () => {
    render(<LoginForm action={resolvingWith({ status: 'idle' })} />);

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sends e-mail, password and the next path to the action', async () => {
    const action = resolvingWith({ status: 'idle' });
    render(<LoginForm action={action} next="/questions" />);

    await fillAndSubmit('ana@exemplo.com', 'segredo');

    const formData = action.mock.calls[0]?.[1];
    expect(formData?.get('email')).toBe('ana@exemplo.com');
    expect(formData?.get('password')).toBe('segredo');
    expect(formData?.get('next')).toBe('/questions');
  });

  it('does not send a next field when none is given', async () => {
    const action = resolvingWith({ status: 'idle' });
    render(<LoginForm action={action} />);

    await fillAndSubmit('ana@exemplo.com', 'segredo');

    expect(action.mock.calls[0]?.[1].has('next')).toBe(false);
  });
});

describe('CA-15 — wrong credentials', () => {
  const failed: LoginState = {
    status: 'error',
    message: INVALID_CREDENTIALS_MESSAGE,
    email: 'ana@exemplo.com',
  };

  it('shows the generic message in an alert', async () => {
    render(<LoginForm action={resolvingWith(failed)} />);

    await fillAndSubmit('ana@exemplo.com', 'errada');

    expect(await screen.findByRole('alert')).toHaveTextContent(INVALID_CREDENTIALS_MESSAGE);
  });

  it('keeps the typed e-mail and clears the password', async () => {
    render(<LoginForm action={resolvingWith(failed)} />);

    await fillAndSubmit('ana@exemplo.com', 'errada');

    await screen.findByRole('alert');
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@exemplo.com');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
  });

  it('moves focus to the notice', async () => {
    render(<LoginForm action={resolvingWith(failed)} />);

    await fillAndSubmit('ana@exemplo.com', 'errada');

    expect(await screen.findByRole('alert')).toHaveFocus();
  });

  it('shows the CA-17 message with no technical detail when the action reports a failure', async () => {
    render(
      <LoginForm
        action={resolvingWith({
          status: 'error',
          message: LOGIN_FAILURE_MESSAGE,
          email: 'ana@exemplo.com',
        })}
      />,
    );

    await fillAndSubmit('ana@exemplo.com', 'segredo');

    expect(await screen.findByRole('alert')).toHaveTextContent(LOGIN_FAILURE_MESSAGE);
  });
});

describe('CA-16 — field errors', () => {
  it('marks the e-mail as invalid and describes it with the message', async () => {
    render(
      <LoginForm
        action={resolvingWith({
          status: 'error',
          fields: { email: 'Informe um e-mail válido.' },
          email: 'ana',
        })}
      />,
    );

    await fillAndSubmit('ana', 'segredo');

    const email = screen.getByLabelText('E-mail');
    await vi.waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    expect(email).toHaveAccessibleDescription('Informe um e-mail válido.');
    expect(email).toHaveValue('ana');
  });

  it('marks both fields as invalid when both are empty', async () => {
    render(
      <LoginForm
        action={resolvingWith({
          status: 'error',
          fields: { email: 'Informe um e-mail válido.', password: 'Informe a senha.' },
          email: '',
        })}
      />,
    );

    await fillAndSubmit('', '');

    const password = screen.getByLabelText('Senha');
    await vi.waitFor(() => expect(password).toHaveAttribute('aria-invalid', 'true'));
    expect(password).toHaveAccessibleDescription('Informe a senha.');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not show a general notice for field errors', async () => {
    render(
      <LoginForm
        action={resolvingWith({
          status: 'error',
          fields: { password: 'Informe a senha.' },
          email: 'ana@exemplo.com',
        })}
      />,
    );

    await fillAndSubmit('ana@exemplo.com', '');

    await vi.waitFor(() =>
      expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('leaves validation to the action instead of blocking the submit in the browser', async () => {
    const action = resolvingWith({ status: 'idle' });
    render(<LoginForm action={action} />);

    await fillAndSubmit('', '');

    expect(action).toHaveBeenCalledOnce();
  });
});

describe('CA-18 — waiting for the response', () => {
  it('shows "Entrando…" on a disabled, busy button while the action runs', async () => {
    const { action, resolve } = deferredAction();
    render(<LoginForm action={action} />);

    await fillAndSubmit('ana@exemplo.com', 'segredo');

    const button = await screen.findByRole('button', { name: 'Entrando…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await act(async () => resolve({ status: 'idle' }));
  });

  it('does not submit twice while waiting', async () => {
    const { action, resolve } = deferredAction();
    render(<LoginForm action={action} />);
    const user = await fillAndSubmit('ana@exemplo.com', 'segredo');

    await user.click(await screen.findByRole('button', { name: 'Entrando…' }));
    await user.keyboard('{Enter}');

    expect(action).toHaveBeenCalledOnce();
    await act(async () => resolve({ status: 'idle' }));
  });

  it('goes back to "Entrar" when the response arrives', async () => {
    const { action, resolve } = deferredAction();
    render(<LoginForm action={action} />);
    await fillAndSubmit('ana@exemplo.com', 'segredo');
    await screen.findByRole('button', { name: 'Entrando…' });

    await act(async () =>
      resolve({ status: 'error', message: INVALID_CREDENTIALS_MESSAGE, email: 'ana@exemplo.com' }),
    );

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });
});
