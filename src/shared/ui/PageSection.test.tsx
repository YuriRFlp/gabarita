import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageSection } from './PageSection';

describe('PageSection', () => {
  it('renders a named region with an h2 and the description', () => {
    render(
      <PageSection id="exam-weights" title="Concursos e pesos" description="Quanto cada pesa.">
        <p>Conteúdo</p>
      </PageSection>,
    );
    const region = screen.getByRole('region', { name: 'Concursos e pesos' });
    expect(region).toHaveAttribute('id', 'exam-weights');
    expect(region).toHaveClass('gb-page-section');
    expect(screen.getByRole('heading', { level: 2, name: 'Concursos e pesos' })).toHaveClass(
      'gb-page-section__title',
    );
    expect(screen.getByText('Quanto cada pesa.')).toHaveClass('gb-page-section__description');
    expect(region).toContainElement(screen.getByText('Conteúdo'));
  });

  it('omits the description when none is given', () => {
    const { container } = render(
      <PageSection id="appearance" title="Aparência">
        <p>x</p>
      </PageSection>,
    );
    expect(container.querySelector('.gb-page-section__description')).toBeNull();
  });
});
