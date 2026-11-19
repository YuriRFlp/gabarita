import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

vi.mock('@/modules/auth', () => ({
  LoginForm: ({ next }: { next?: string }) => <form aria-label="Formulário" data-next={next} />,
}));
vi.mock('@/app/logo', () => ({ Logo: () => <span role="img" aria-label="Gabarita" /> }));

async function renderLoginPage(next?: string | string[]) {
  render(await LoginPage({ searchParams: Promise.resolve({ next }) }));
}

describe('LoginPage', () => {
  it('has a single h1 "Entrar" next to the form', async () => {
    await renderLoginPage();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Entrar');
    expect(screen.getByRole('form', { name: 'Formulário' })).toBeInTheDocument();
  });

  it('passes a string "next" to the form', async () => {
    await renderLoginPage('/topics');
    expect(screen.getByRole('form', { name: 'Formulário' })).toHaveAttribute(
      'data-next',
      '/topics',
    );
  });

  it('ignores a repeated "next"', async () => {
    await renderLoginPage(['/a', '/b']);
    expect(screen.getByRole('form', { name: 'Formulário' })).not.toHaveAttribute('data-next');
  });

  it('shows the promise and the three sheet rows as real text, with the logo as the only image', async () => {
    const { container } = render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText('Estude o que cai. Lembre no dia da prova.')).toHaveClass(
      'gb-login__promise',
    );
    const rows = screen.getByRole('list');
    expect(rows).toHaveClass('gb-login__sheet-rows');
    expect(
      within(rows)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual([
      '01Retenção com revisão espaçada',
      '02Direção pelo que mais cai',
      '03Prática no formato da banca',
    ]);
    expect(container.querySelectorAll('img, [role="img"]')).toHaveLength(1);
    expect(screen.getByRole('img')).toHaveAccessibleName('Gabarita');
  });

  it('keeps every ornament hidden from screen readers', async () => {
    const { container } = render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(container.querySelector('.gb-timing-marks')).toHaveAttribute('aria-hidden', 'true');
    for (const ornament of container.querySelectorAll(
      '.gb-login__row-number, .gb-login__row-bubbles',
    )) {
      expect(ornament).toHaveAttribute('aria-hidden', 'true');
    }
    for (const bubble of container.querySelectorAll('.gb-bubble')) {
      expect(bubble.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('applies the login classes to the brand panel and the form column', async () => {
    const { container } = render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole('main')).toHaveClass('gb-login');
    expect(container.querySelector('.gb-login__panel')).toHaveClass('gb-sheet-texture');
    expect(container.querySelector('.gb-login__form')).toContainElement(
      screen.getByRole('heading', { level: 1 }),
    );
  });
});
