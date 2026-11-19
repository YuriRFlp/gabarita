import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('shows the title with the design system classes', () => {
    const { container } = render(<EmptyState title="Nenhum assunto com esses filtros." />);
    expect(container.firstElementChild).toHaveClass('gb-empty-state');
    expect(screen.getByText('Nenhum assunto com esses filtros.')).toHaveClass(
      'gb-empty-state__title',
    );
  });

  it('shows the explanation and the action', () => {
    render(
      <EmptyState
        title="Nenhum assunto com esses filtros."
        action={<a href="/topics">Limpar filtros</a>}
      >
        <p>Tente outra combinação.</p>
      </EmptyState>,
    );
    expect(screen.getByText('Tente outra combinação.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Limpar filtros' })).toHaveAttribute('href', '/topics');
  });

  it('keeps the ornamental bubble away from screen readers', () => {
    const { container } = render(<EmptyState title="A taxonomia ainda não foi carregada." />);
    expect(container.querySelector('.gb-bubble')).toHaveAttribute('aria-hidden', 'true');
  });
});
