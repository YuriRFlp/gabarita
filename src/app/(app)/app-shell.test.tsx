import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';

const pathname = vi.hoisted(() => vi.fn<() => string>());
vi.mock('next/navigation', () => ({ usePathname: pathname }));

function renderShell() {
  render(
    <AppShell logo={<span>Gabarita</span>} actions={<button type="button">Sair</button>}>
      <h1>Página</h1>
    </AppShell>,
  );
}

describe('AppShell', () => {
  beforeEach(() => pathname.mockReset());

  it('links to Configurações and marks it current on /settings', () => {
    pathname.mockReturnValue('/settings');
    renderShell();
    const link = screen.getByRole('link', { name: 'Configurações' });
    expect(link).toHaveAttribute('href', '/settings');
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Mapa do edital/ })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('does not mark Configurações as current on other pages', () => {
    pathname.mockReturnValue('/topics');
    renderShell();
    expect(screen.getByRole('link', { name: 'Configurações' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /Mapa do edital/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('gives Início, Mapa do edital and Configurações an icon each and no number', () => {
    pathname.mockReturnValue('/');
    renderShell();
    for (const name of ['Início', 'Mapa do edital', 'Configurações']) {
      const link = screen.getByRole('link', { name });
      expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(link).not.toHaveTextContent(/\d/);
    }
  });
});
