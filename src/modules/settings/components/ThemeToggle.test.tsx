import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ThemePreference } from '../domain';
import { THEME_FAILURE_MESSAGE, type SetThemeState } from '../actions/set-theme-schema';
import { ThemeToggle } from './ThemeToggle';

vi.mock('../actions/set-theme', () => ({ setTheme: vi.fn() }));

type Action = (previous: SetThemeState, formData: FormData) => Promise<SetThemeState>;

function resolvingWith(state: SetThemeState) {
  return vi.fn<Action>(async () => state);
}

function deferredAction() {
  let resolve: (state: SetThemeState) => void = () => undefined;
  const action = vi.fn<Action>(
    () =>
      new Promise<SetThemeState>((done) => {
        resolve = done;
      }),
  );
  return { action, resolve: (state: SetThemeState) => resolve(state) };
}

function option(name: string) {
  return within(screen.getByRole('group', { name: 'Tema' })).getByRole('button', { name });
}

const LABELS: Record<ThemePreference, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
};

describe('CA-25 — saved option is pressed', () => {
  it.each(['system', 'light', 'dark'] as const)(
    'marks only the saved option (%s) with aria-pressed="true"',
    (savedTheme) => {
      render(<ThemeToggle savedTheme={savedTheme} action={resolvingWith({ status: 'idle' })} />);

      for (const [theme, label] of Object.entries(LABELS)) {
        expect(option(label)).toHaveAttribute('aria-pressed', String(theme === savedTheme));
      }
    },
  );

  it.each([
    ['Escuro', 'dark'],
    ['Claro', 'light'],
    ['Sistema', 'system'],
  ])('choosing "%s" sends theme=%s to the action', async (label, theme) => {
    const action = resolvingWith({ status: 'idle' });
    render(<ThemeToggle savedTheme="system" action={action} />);

    await userEvent.click(option(label));

    expect(action.mock.calls[0]?.[1].get('theme')).toBe(theme);
  });

  it('marks the new option once the server renders the new saved theme', () => {
    const action = resolvingWith({ status: 'idle' });
    const { rerender } = render(<ThemeToggle savedTheme="system" action={action} />);

    rerender(<ThemeToggle savedTheme="dark" action={action} />);

    expect(option('Escuro')).toHaveAttribute('aria-pressed', 'true');
    expect(option('Sistema')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows no notice while nothing went wrong', () => {
    render(<ThemeToggle savedTheme="system" action={resolvingWith({ status: 'idle' })} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('CA-38 — failure to save', () => {
  it('shows the notice without technical detail', async () => {
    render(
      <ThemeToggle
        savedTheme="light"
        action={resolvingWith({ status: 'error', message: THEME_FAILURE_MESSAGE })}
      />,
    );

    await userEvent.click(option('Escuro'));

    expect(await screen.findByRole('alert')).toHaveTextContent(THEME_FAILURE_MESSAGE);
  });

  it('keeps the previous option pressed', async () => {
    render(
      <ThemeToggle
        savedTheme="light"
        action={resolvingWith({ status: 'error', message: THEME_FAILURE_MESSAGE })}
      />,
    );

    await userEvent.click(option('Escuro'));

    await screen.findByRole('alert');
    expect(option('Claro')).toHaveAttribute('aria-pressed', 'true');
    expect(option('Escuro')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('ThemeToggle while submitting', () => {
  it('disables every option and marks the group busy', async () => {
    const { action, resolve } = deferredAction();
    render(<ThemeToggle savedTheme="system" action={action} />);

    await userEvent.click(option('Escuro'));

    await vi.waitFor(() =>
      expect(screen.getByRole('group', { name: 'Tema' })).toHaveAttribute('aria-busy', 'true'),
    );
    for (const label of Object.values(LABELS)) expect(option(label)).toBeDisabled();
    await act(async () => resolve({ status: 'idle' }));
  });

  it('does not submit a second choice while the first is pending', async () => {
    const { action, resolve } = deferredAction();
    render(<ThemeToggle savedTheme="system" action={action} />);
    await userEvent.click(option('Escuro'));
    await vi.waitFor(() => expect(option('Claro')).toBeDisabled());

    await userEvent.click(option('Claro'));

    expect(action).toHaveBeenCalledOnce();
    await act(async () => resolve({ status: 'idle' }));
  });

  it('enables the options again when the response arrives', async () => {
    const { action, resolve } = deferredAction();
    render(<ThemeToggle savedTheme="system" action={action} />);
    await userEvent.click(option('Escuro'));
    await vi.waitFor(() => expect(option('Escuro')).toBeDisabled());

    await act(async () => resolve({ status: 'idle' }));

    expect(option('Escuro')).toBeEnabled();
    expect(screen.getByRole('group', { name: 'Tema' })).toHaveAttribute('aria-busy', 'false');
  });
});
