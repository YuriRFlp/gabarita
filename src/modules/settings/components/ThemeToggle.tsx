'use client';

import { useActionState, type ReactNode } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Notice } from '@/shared/ui';
import type { ThemePreference } from '../domain';
import { setTheme } from '../actions/set-theme';
import { INITIAL_SET_THEME_STATE, type SetThemeState } from '../actions/set-theme-schema';

type SetThemeAction = (previous: SetThemeState, formData: FormData) => Promise<SetThemeState>;

type ThemeToggleProps = {
  savedTheme: ThemePreference;
  action?: SetThemeAction;
};

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string; icon: ReactNode }> = [
  { value: 'system', label: 'Sistema', icon: <Monitor aria-hidden /> },
  { value: 'light', label: 'Claro', icon: <Sun aria-hidden /> },
  { value: 'dark', label: 'Escuro', icon: <Moon aria-hidden /> },
];

export function ThemeToggle({ savedTheme, action = setTheme }: ThemeToggleProps) {
  const [state, submit, pending] = useActionState(action, INITIAL_SET_THEME_STATE);

  return (
    <form action={submit} className="gb-theme-toggle">
      <div role="group" aria-label="Tema" aria-busy={pending} className="gb-segmented">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="submit"
            name="theme"
            value={option.value}
            aria-pressed={option.value === savedTheme}
            disabled={pending}
            className="gb-segmented__option"
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
      {state.status === 'error' ? <Notice kind="error">{state.message}</Notice> : null}
    </form>
  );
}
