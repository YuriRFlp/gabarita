import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TopicList } from './TopicList';
import { makeEntry } from '#factories/topic-map-entries';

describe('TopicList', () => {
  it('lists each topic as a row header link to its detail page', () => {
    render(<TopicList entries={[makeEntry({})]} />);
    const link = screen.getByRole('link', { name: 'Stack da PDPJ-Br' });
    expect(link).toHaveAttribute('href', '/topics/pdpj_stack');
    expect(link.closest('th')).toHaveAttribute('scope', 'row');
  });

  it('keeps explicit table roles so the stacked mobile layout stays a table', () => {
    render(<TopicList entries={[makeEntry({})]} />);
    expect(screen.getByRole('table', { name: 'Assuntos do edital' })).toBeInTheDocument();
    expect(screen.getAllByRole('rowgroup')).toHaveLength(2);
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByRole('rowheader', { name: /Stack da PDPJ-Br/ })).toBeInTheDocument();
    expect(screen.getAllByRole('cell')).toHaveLength(3);
  });

  it('shows priority with two decimals, the profile tag and the subtopic count', () => {
    render(<TopicList entries={[makeEntry({ incidences: [1, 0.5, 0] })]} />);
    const row = screen.getByRole('row', { name: /Stack da PDPJ-Br/ });
    expect(within(row).getByText('35%')).toBeInTheDocument();
    expect(within(row).getByText('Sistemas')).toBeInTheDocument();
    expect(within(row).getByText('2')).toBeInTheDocument();
  });

  it('labels general topics as "Geral" and flags the post-notice phase', () => {
    render(
      <TopicList
        entries={[
          makeEntry({
            id: 'portugues',
            name: 'Língua Portuguesa',
            profile: null,
            phase: 'post_notice',
          }),
        ]}
      />,
    );
    expect(screen.getByText('Geral')).toBeInTheDocument();
    expect(screen.getByText('Pós-edital')).toBeInTheDocument();
  });

  it('does not flag the pre-notice phase', () => {
    render(<TopicList entries={[makeEntry({})]} />);
    expect(screen.queryByText('Pós-edital')).not.toBeInTheDocument();
  });

  it('shows "Sem respostas" instead of a percentage when the topic is not measured', () => {
    render(<TopicList entries={[makeEntry({})]} />);
    expect(screen.getByText('Sem respostas')).toBeInTheDocument();
    expect(
      within(screen.getByRole('cell', { name: /Sem respostas/ })).queryByText(/%/),
    ).not.toBeInTheDocument();
  });

  it('shows the whole percentage when the topic is measured', () => {
    render(<TopicList entries={[makeEntry({ performance: { answered: 10, firmCorrect: 7 } })]} />);
    expect(screen.getByText(/^70\s?%$/)).toBeInTheDocument();
    expect(screen.queryByText('Sem respostas')).not.toBeInTheDocument();
  });

  it('keeps the entry order', () => {
    render(
      <TopicList
        entries={[makeEntry({ id: 'b', name: 'Beta' }), makeEntry({ id: 'a', name: 'Alfa' })]}
      />,
    );
    const names = screen.getAllByRole('link').map((link) => link.textContent);
    expect(names).toEqual(['Beta', 'Alfa']);
  });

  it('explains the priority and mastery columns in tooltips tied to their titles', () => {
    render(<TopicList entries={[makeEntry({})]} />);
    const priority = screen.getByRole('button', { name: 'Prioridade' });
    const mastery = screen.getByRole('button', { name: 'Domínio' });
    expect(priority).toHaveAccessibleDescription(
      'O quanto o assunto vale nos concursos que você escolheu.',
    );
    expect(mastery).toHaveAccessibleDescription('O quanto você já domina o assunto.');
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
  });
});
