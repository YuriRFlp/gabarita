import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TopicsLoading from './loading';

describe('TopicsLoading', () => {
  it('keeps the page title and announces the loading text while busy', () => {
    const { container } = render(<TopicsLoading />);
    expect(screen.getByRole('heading', { level: 1, name: 'Mapa do edital' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando o mapa do edital…');
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true');
  });
});
