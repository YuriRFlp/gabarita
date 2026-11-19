import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TopicMap, TopicMapQuery } from '../domain';
import { EXAMS, makeEntry } from '#factories/topic-map-entries';
import { TopicMapView } from './TopicMapView';

const QUERY: TopicMapQuery = { view: 'list', category: 'all', profile: 'all', sort: 'urgency' };

function buildMap(overrides: Partial<TopicMap> = {}): TopicMap {
  const entries = overrides.entries ?? [
    makeEntry({}),
    makeEntry({ id: 'redes', name: 'Redes', incidences: [0, 0.5, 0] }),
  ];
  return {
    query: QUERY,
    entries,
    exams: EXAMS,
    totals: { topics: 38, subtopics: 218, exams: 3, shown: entries.length, measured: 0 },
    ...overrides,
  };
}

describe('TopicMapView', () => {
  it('renders one h1 and the taxonomy totals', () => {
    render(<TopicMapView result={{ ok: true, value: buildMap() }} query={QUERY} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Mapa do edital' })).toBeInTheDocument();
    expect(screen.getByText(/38 assuntos · 218 subtópicos · 3 concursos/)).toBeInTheDocument();
  });

  it('shows the "not measured" notice and "Sem respostas" when nothing is measured', () => {
    render(<TopicMapView result={{ ok: true, value: buildMap() }} query={QUERY} />);
    expect(screen.getByText('Domínio ainda não medido.')).toBeInTheDocument();
    expect(screen.getByText(/quando houver respostas nos últimos 60 dias/)).toBeInTheDocument();
    expect(screen.getAllByText('Sem respostas')).toHaveLength(2);
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });

  it('hides the notice and shows the percentage when some topics are measured', () => {
    const entries = [
      makeEntry({ performance: { answered: 10, firmCorrect: 7 } }),
      makeEntry({ id: 'redes', name: 'Redes' }),
    ];
    const map = buildMap({
      entries,
      totals: { topics: 38, subtopics: 218, exams: 3, shown: 2, measured: 1 },
    });
    render(<TopicMapView result={{ ok: true, value: map }} query={QUERY} />);
    expect(screen.queryByText('Domínio ainda não medido.')).not.toBeInTheDocument();
    expect(screen.getByText(/^70\s?%$/)).toBeInTheDocument();
    expect(screen.getAllByText('Sem respostas')).toHaveLength(1);
  });

  it('announces the shown count in a polite live region', () => {
    render(<TopicMapView result={{ ok: true, value: buildMap() }} query={QUERY} />);
    const count = screen.getByText('Mostrando 2 de 38 assuntos');
    expect(count).toHaveAttribute('aria-live', 'polite');
  });

  it('renders the list by default and the matrix for view=matrix', () => {
    const { rerender } = render(
      <TopicMapView result={{ ok: true, value: buildMap() }} query={QUERY} />,
    );
    expect(screen.getByRole('table', { name: 'Assuntos do edital' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Matriz/ })).not.toBeInTheDocument();

    const matrixQuery: TopicMapQuery = { ...QUERY, view: 'matrix' };
    rerender(
      <TopicMapView
        result={{ ok: true, value: buildMap({ query: matrixQuery }) }}
        query={matrixQuery}
      />,
    );
    expect(
      screen.getByRole('region', { name: 'Matriz de incidência por concurso' }),
    ).toBeInTheDocument();
  });

  it('shows the empty state with a link to clear the filters', () => {
    const query: TopicMapQuery = { ...QUERY, category: 'general', profile: 'infra' };
    const map = buildMap({
      query,
      entries: [],
      totals: { topics: 38, subtopics: 218, exams: 3, shown: 0, measured: 0 },
    });
    render(<TopicMapView result={{ ok: true, value: map }} query={query} />);
    expect(screen.getByText('Nenhum assunto com esses filtros.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Limpar filtros' })).toHaveAttribute('href', '/topics');
    expect(screen.getByText('Mostrando 0 de 38 assuntos')).toBeInTheDocument();
  });

  it('shows the empty taxonomy state when there are no topics', () => {
    const map = buildMap({
      entries: [],
      totals: { topics: 0, subtopics: 0, exams: 0, shown: 0, measured: 0 },
    });
    render(<TopicMapView result={{ ok: true, value: map }} query={QUERY} />);
    expect(screen.getByText('A taxonomia ainda não foi carregada.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Ver' })).not.toBeInTheDocument();
  });

  it('shows the error notice with a retry link that keeps the filters', () => {
    const query: TopicMapQuery = { ...QUERY, view: 'matrix', sort: 'name' };
    render(<TopicMapView result={{ ok: false, error: 'load_failed' }} query={query} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o mapa do edital. Tente de novo em instantes.',
    );
    expect(screen.getByRole('link', { name: 'Tentar de novo' })).toHaveAttribute(
      'href',
      '/topics?view=matrix&sort=name',
    );
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
