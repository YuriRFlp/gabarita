import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IncidenceMatrix } from './IncidenceMatrix';
import { EXAMS, makeEntry } from './topic-fixtures';

const ENTRIES = [
  makeEntry({ incidences: [1, 0.5, 0] }),
  makeEntry({ id: 'redes', name: 'Redes', incidences: [0, 0, 1] }),
];

describe('IncidenceMatrix', () => {
  it('puts the table in a focusable, named scroll region', () => {
    render(<IncidenceMatrix entries={ENTRIES} exams={EXAMS} />);
    const region = screen.getByRole('region', { name: 'Matriz de incidência por concurso' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeInTheDocument();
  });

  it('has a caption and one column per exam with short label and full details for screen readers', () => {
    render(<IncidenceMatrix entries={ENTRIES} exams={EXAMS} />);
    expect(screen.getByRole('table', { name: /Incidência de cada assunto/ })).toBeInTheDocument();
    const columns = screen.getAllByRole('columnheader');
    expect(columns).toHaveLength(EXAMS.length + 1);
    expect(
      screen.getByRole('columnheader', { name: 'TRT-3 (MG), Fumarc 2022, peso 0,28' }),
    ).toBeInTheDocument();
    expect(screen.getByText('TRT-3')).toBeVisible();
    expect(screen.getByText('0,025')).toBeInTheDocument();
  });

  it('links each row header to the topic detail', () => {
    render(<IncidenceMatrix entries={ENTRIES} exams={EXAMS} />);
    const link = screen.getByRole('link', { name: 'Redes' });
    expect(link).toHaveAttribute('href', '/topics/redes');
    expect(link.closest('th')).toHaveAttribute('scope', 'row');
  });

  it('gives every cell a bubble and the incidence text', () => {
    render(<IncidenceMatrix entries={ENTRIES} exams={EXAMS} />);
    const row = screen.getByRole('row', { name: /Stack da PDPJ-Br/ });
    const cells = within(row).getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toEqual([
      'cobrado com profundidade',
      'parcial ou em nível de noções',
      'ausente',
    ]);
    expect(cells[0]?.querySelector('.gb-bubble--filled')).not.toBeNull();
    expect(cells[1]?.querySelector('.gb-bubble--half')).not.toBeNull();
    expect(cells[2]?.querySelector('.gb-bubble')).not.toHaveClass('gb-bubble--filled');
  });

  it('shows the visible legend of the three bubbles', () => {
    render(<IncidenceMatrix entries={ENTRIES} exams={EXAMS} />);
    const legend = screen.getByRole('list', { name: 'Legenda das bolhas' });
    expect(within(legend).getAllByRole('listitem')).toHaveLength(3);
    expect(within(legend).getByText('parcial ou em nível de noções')).toBeVisible();
  });
});
