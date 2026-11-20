import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExamWeightsFormState } from '../actions/exam-weights-schema';
import { RestoreDefaultWeights } from './RestoreDefaultWeights';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

type Action = (previous: ExamWeightsFormState, formData: FormData) => Promise<ExamWeightsFormState>;

const RESTORED: ExamWeightsFormState = { status: 'saved', message: 'Pesos padrão restaurados.' };
const FAILED: ExamWeightsFormState = {
  status: 'error',
  message: 'Não foi possível salvar os pesos. Tente de novo.',
  fieldErrors: {},
  values: {},
};

const confirmButton = () => screen.getByRole('button', { name: 'Restaurar pesos padrão' });

beforeEach(() => router.replace.mockClear());

describe('CA-28 — restore defaults', () => {
  it('shows only a link to the confirmation in custom mode', () => {
    render(<RestoreDefaultWeights mode="custom" confirming={false} action={vi.fn<Action>()} />);
    expect(screen.getByRole('link', { name: 'Restaurar padrão' })).toHaveAttribute(
      'href',
      '/settings?confirm=restore#exam-weights',
    );
  });

  it('renders nothing in default mode', () => {
    const { container } = render(
      <RestoreDefaultWeights mode="default" confirming={true} action={vi.fn<Action>()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('asks for confirmation, focuses the question and offers Cancelar as a link', () => {
    render(<RestoreDefaultWeights mode="custom" confirming={true} action={vi.fn<Action>()} />);
    const question = screen.getByText(
      'Restaurar os pesos padrão? Seus pesos personalizados serão apagados.',
    );
    expect(question.closest('[tabindex="-1"]')).toHaveFocus();
    expect(confirmButton()).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute(
      'href',
      '/settings#exam-weights',
    );
  });

  it('runs the action on confirm, announces the result and clears ?confirm=restore', async () => {
    const action = vi.fn<Action>(async () => RESTORED);
    render(<RestoreDefaultWeights mode="custom" confirming={true} action={action} />);
    await userEvent.click(confirmButton());
    expect(action).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent('Pesos padrão restaurados.');
    expect(router.replace).toHaveBeenCalledWith('/settings#exam-weights');
  });

  it('tells the server JavaScript is running, so it answers with state instead of a redirect', async () => {
    const action = vi.fn<Action>(async () => RESTORED);
    render(<RestoreDefaultWeights mode="custom" confirming={true} action={action} />);
    await userEvent.click(confirmButton());
    expect(action.mock.calls[0]?.[1].get('enhanced')).toBe('1');
  });

  it('shows the failure message as a focused alert and keeps the address', async () => {
    const action = vi.fn<Action>(async () => FAILED);
    render(<RestoreDefaultWeights mode="custom" confirming={true} action={action} />);
    await userEvent.click(confirmButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível salvar');
    expect(alert).toHaveFocus();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('CA-28 — after a restore without JavaScript (?restored=1)', () => {
  it('shows "Pesos padrão restaurados." from the address', () => {
    render(
      <RestoreDefaultWeights mode="default" confirming={false} restored action={vi.fn<Action>()} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Pesos padrão restaurados.');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('hides it once a later save took its place', () => {
    render(
      <RestoreDefaultWeights
        mode="default"
        confirming={false}
        restored
        hideResult
        action={vi.fn<Action>()}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
