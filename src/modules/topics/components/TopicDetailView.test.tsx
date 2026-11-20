import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ExamWeightsSummary } from '../domain';
import { EXAMS, makeEntry } from '#factories/topic-map-entries';
import { TopicDetailView } from './TopicDetailView';

const DEFAULT_WEIGHTS: ExamWeightsSummary = {
  mode: 'default',
  activeTotal: 1000,
  unweightedExamIds: [],
  fingerprint: null,
};

function renderDetail(entry = makeEntry({}), weights: ExamWeightsSummary = DEFAULT_WEIGHTS) {
  return render(
    <TopicDetailView
      result={{ ok: true, value: { entry: { ...entry, weights }, exams: EXAMS } }}
      retryHref="/topics/x"
    />,
  );
}

describe('TopicDetailView', () => {
  it('hides the weights notice already closed for this set, and shows it for a changed one', () => {
    const custom: ExamWeightsSummary = { ...DEFAULT_WEIGHTS, mode: 'custom', fingerprint: 'k3j9x' };
    const entry = { ...makeEntry({}), weights: custom };
    const result = { ok: true, value: { entry, exams: EXAMS } } as const;
    const { unmount } = render(
      <TopicDetailView result={result} retryHref="/topics/x" dismissedWeightsFingerprint="k3j9x" />,
    );
    expect(screen.queryByText(/Pesos personalizados em uso/)).not.toBeInTheDocument();
    unmount();
    render(
      <TopicDetailView result={result} retryHref="/topics/x" dismissedWeightsFingerprint="old" />,
    );
    expect(screen.getByText(/Pesos personalizados em uso/)).toBeInTheDocument();
  });

  it('shows the custom weights notice only with custom weights', () => {
    const { unmount } = renderDetail();
    expect(screen.queryByText(/Pesos personalizados em uso/)).not.toBeInTheDocument();
    unmount();
    renderDetail(makeEntry({}), { ...DEFAULT_WEIGHTS, mode: 'custom' });
    expect(screen.getByText(/Pesos personalizados em uso\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
  });

  it('renders the topic name as the only h1, with tags and a back link', () => {
    renderDetail();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Stack da PDPJ-Br' })).toBeInTheDocument();
    expect(screen.getByText('Sistemas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mapa do edital' })).toHaveAttribute('href', '/topics');
  });

  it('starts the page header with the h1, with no eyebrow or hgroup (CA-42)', () => {
    const { container } = renderDetail();
    expect(container.querySelector('.gb-page-header')?.firstElementChild).toBe(
      screen.getByRole('heading', { level: 1 }),
    );
    expect(container.querySelector('hgroup, .gb-page-header__eyebrow')).toBeNull();
    expect(screen.queryByText('Assunto')).not.toBeInTheDocument();
  });

  it('lists the subtopics in an ordered list', () => {
    renderDetail(makeEntry({ subtopics: ['Java', 'Spring Boot', 'Eureka'] }));
    expect(screen.getByRole('heading', { level: 2, name: 'Subtópicos (3)' })).toBeInTheDocument();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['Java', 'Spring Boot', 'Eureka']);
  });

  it('shows each exam contribution and a total equal to the priority', () => {
    renderDetail(makeEntry({ incidences: [1, 0.5, 0] }));
    const table = screen.getByRole('table', { name: /Contribuição de cada concurso/ });
    const trt3 = within(table).getByRole('row', { name: /TRT-3 \(MG\) · Fumarc 2022 · peso 28%/ });
    expect(within(trt3).getByText('Profundidade')).toBeInTheDocument();
    expect(within(trt3).getByText('28%')).toBeInTheDocument();
    const tjmg = within(table).getByRole('row', { name: /TJMG/ });
    expect(within(tjmg).getByText('Noções')).toBeInTheDocument();
    expect(within(tjmg).getByText('7%')).toBeInTheDocument();
    const total = within(table).getByRole('row', { name: /Total/ });
    expect(within(total).getByText('35%')).toBeInTheDocument();
    expect(
      screen.getByText(/Prioridade 35% · Urgência 35% · Domínio: sem respostas/),
    ).toBeInTheDocument();
  });

  it('marks an inactive exam and shows a dash as its contribution', () => {
    const inactive = EXAMS.map((exam) => (exam.id === 'tjmg' ? { ...exam, active: false } : exam));
    renderDetail(makeEntry({ exams: inactive }));
    const row = screen.getByRole('row', { name: /TJMG/ });
    expect(within(row).getByText('Inativo')).toBeInTheDocument();
    expect(within(row).getByText('—')).toBeInTheDocument();
  });

  it('shows the empty mastery state without a percentage when there are no answers', () => {
    renderDetail();
    expect(
      screen.getByText('Você ainda não respondeu questões deste assunto nos últimos 60 dias.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Para a urgência, o domínio conta como 0.')).toBeInTheDocument();
    expect(screen.getByText(/Domínio: sem respostas/)).toBeInTheDocument();
  });

  it('shows percentage, counts and the retention note when measured', () => {
    renderDetail(makeEntry({ performance: { answered: 10, firmCorrect: 7 } }));
    expect(
      screen.getByText(/10 respostas, 7 acertos firmes \(chutes não contam\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Retenção média: ainda não calculada/)).toBeInTheDocument();
    expect(
      screen.getByText('Sem cartões, o domínio é a taxa de acerto firme.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^70\s?%$/).length).toBeGreaterThan(0);
  });

  it('uses singular forms for one answer', () => {
    renderDetail(makeEntry({ performance: { answered: 1, firmCorrect: 1 } }));
    expect(screen.getByText(/1 resposta, 1 acerto firme/)).toBeInTheDocument();
  });

  it('has no eyebrow or hgroup in the error state either (CA-42)', () => {
    const { container } = render(
      <TopicDetailView result={{ ok: false, error: 'load_failed' }} retryHref="/topics/redes" />,
    );
    expect(container.querySelector('.gb-page-header')?.firstElementChild).toBe(
      screen.getByRole('heading', { level: 1 }),
    );
    expect(container.querySelector('hgroup, .gb-page-header__eyebrow')).toBeNull();
  });

  it('shows the error notice with a retry link', () => {
    render(
      <TopicDetailView result={{ ok: false, error: 'load_failed' }} retryHref="/topics/redes" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o mapa do edital.',
    );
    expect(screen.getByRole('link', { name: 'Tentar de novo' })).toHaveAttribute(
      'href',
      '/topics/redes',
    );
  });
});
