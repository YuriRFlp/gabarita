import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it.each(['primary', 'secondary', 'text'] as const)('applies the %s variant class', (variant) => {
    render(<Button variant={variant}>Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toHaveClass('gb-button', `gb-button--${variant}`);
  });

  it('uses the primary variant when none is given', () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveClass('gb-button--primary');
  });

  it('defaults to type button so it never submits a form by accident', () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'button');
  });

  it('honors type submit when given', () => {
    render(<Button type="submit">Entrar</Button>);
    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveAttribute('type', 'submit');
  });

  it('is disabled and exposes aria-busy while loading', () => {
    render(<Button loading>Entrando…</Button>);
    const button = screen.getByRole('button', { name: 'Entrando…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('does not expose aria-busy when not loading', () => {
    render(<Button>Entrar</Button>);
    expect(screen.getByRole('button', { name: 'Entrar' })).not.toHaveAttribute('aria-busy');
  });

  it('is disabled by the disabled prop without exposing aria-busy', () => {
    render(<Button disabled>Entrar</Button>);
    const button = screen.getByRole('button', { name: 'Entrar' });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
  });

  it('shows the icon next to the text without changing the accessible name', () => {
    render(<Button icon={<svg data-testid="icon" aria-hidden="true" />}>Sair</Button>);
    const button = screen.getByRole('button', { name: 'Sair' });
    expect(button).toContainElement(screen.getByTestId('icon'));
  });

  it('keeps extra classes alongside the design system classes', () => {
    render(<Button className="extra">Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveClass('gb-button', 'extra');
  });
});
