import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppearanceSection } from './AppearanceSection';

vi.mock('../actions/set-theme', () => ({ setTheme: vi.fn() }));

describe('CA-30 — appearance section', () => {
  it('has an h2 "Aparência" and the theme toggle with the saved option pressed', () => {
    render(<AppearanceSection savedTheme="dark" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Aparência' })).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Tema' });
    expect(within(group).getByRole('button', { name: 'Escuro' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(group).getByRole('button', { name: 'Claro' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
