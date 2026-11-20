import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExamWeightsSummary } from '../domain';
import { dismissWeightsNotice } from '../actions/dismiss-weights-notice';
import { WeightsNotice } from './WeightsNotice';

const { bound } = vi.hoisted(() => ({ bound: vi.fn() }));
vi.mock('../actions/dismiss-weights-notice', () => ({
  dismissWeightsNotice: { bind: vi.fn(() => bound) },
}));

const summary = (overrides: Partial<ExamWeightsSummary>): ExamWeightsSummary => ({
  mode: 'default',
  activeTotal: 1000,
  unweightedExamIds: [],
  fingerprint: null,
  ...overrides,
});

describe('WeightsNotice', () => {
  beforeEach(() => {
    bound.mockClear();
    vi.mocked(dismissWeightsNotice.bind).mockClear();
  });

  it('renders nothing with the default weights summing to 100%', () => {
    const { container } = render(<WeightsNotice weights={summary({})} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('announces custom weights with a link to the settings section', () => {
    render(<WeightsNotice weights={summary({ mode: 'custom' })} />);
    expect(screen.getByText(/Pesos personalizados em uso\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute(
      'href',
      '/settings#exam-weights',
    );
  });

  it('warns about a total different from 100% instead of the custom message', () => {
    render(<WeightsNotice weights={summary({ mode: 'custom', activeTotal: 720 })} />);
    expect(
      screen.getByText(
        'Os pesos dos concursos ativos somam 72%; as prioridades ficam fora da escala de 0 a 100%.',
        { exact: false },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Pesos personalizados em uso/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
  });

  it('also warns when the default weights no longer sum to 100%', () => {
    render(<WeightsNotice weights={summary({ activeTotal: 950 })} />);
    expect(screen.getByText(/somam 95%/)).toBeInTheDocument();
  });

  it('calls the dismiss action with the fingerprint when closed', async () => {
    render(<WeightsNotice weights={summary({ mode: 'custom', fingerprint: 'k3j9x' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(dismissWeightsNotice.bind).toHaveBeenCalledWith(null, 'k3j9x');
    expect(bound).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when this fingerprint was already dismissed', () => {
    const { container } = render(
      <WeightsNotice
        weights={summary({ mode: 'custom', fingerprint: 'k3j9x' })}
        dismissedFingerprint="k3j9x"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('also stays closed for the off-scale warning of a dismissed set', () => {
    const { container } = render(
      <WeightsNotice
        weights={summary({ mode: 'custom', activeTotal: 720, fingerprint: 'k3j9x' })}
        dismissedFingerprint="k3j9x"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows again when the weights changed after the dismissal (different fingerprint)', () => {
    render(
      <WeightsNotice
        weights={summary({ mode: 'custom', fingerprint: 'zzz1' })}
        dismissedFingerprint="k3j9x"
      />,
    );
    expect(screen.getByText(/Pesos personalizados em uso\./)).toBeInTheDocument();
  });

  it('shows nothing in default mode even with a leftover dismissal cookie', () => {
    const { container } = render(
      <WeightsNotice weights={summary({})} dismissedFingerprint="k3j9x" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('cannot remember a dismissal without a fingerprint (default weights off the 100% scale)', async () => {
    render(<WeightsNotice weights={summary({ activeTotal: 950 })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(dismissWeightsNotice.bind).not.toHaveBeenCalled();
  });
});
