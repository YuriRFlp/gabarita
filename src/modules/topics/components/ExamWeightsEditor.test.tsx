import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asServerAction, serverFormActions } from '#factories/server-action';
import type { ExamWeightsFormState } from '../actions/exam-weights-schema';
import { buildExamWeightsSettings } from '../domain';
import { ExamWeightsEditor } from './ExamWeightsEditor';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

type Action = (previous: ExamWeightsFormState, formData: FormData) => Promise<ExamWeightsFormState>;

const { active } = buildExamWeightsSettings(
  [
    {
      id: 'trt3',
      court: 'TRT-3 (MG)',
      year: 2022,
      examBoardName: 'Fumarc',
      targetWeight: 1,
      active: true,
    },
  ],
  [],
);

beforeEach(() => router.replace.mockClear());

describe('results of the weights actions', () => {
  it('replaces the saved message with the restored one, and the other way around', async () => {
    const save = vi.fn<Action>().mockResolvedValue({ status: 'saved', message: 'Pesos salvos.' });
    const restore = vi
      .fn<Action>()
      .mockResolvedValue({ status: 'saved', message: 'Pesos padrão restaurados.' });
    render(
      <ExamWeightsEditor
        rows={active}
        mode="custom"
        confirmRestore
        showActions
        saveAction={save}
        restoreAction={restore}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/Pesos salvos\./)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Restaurar pesos padrão' }));
    expect(await screen.findByText('Pesos padrão restaurados.')).toBeInTheDocument();
    expect(screen.queryByText(/Pesos salvos\./)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/Pesos salvos\./)).toBeInTheDocument();
    expect(screen.queryByText('Pesos padrão restaurados.')).not.toBeInTheDocument();
  });

  it('hides the "restored" message from the address once the user saves', async () => {
    const save = vi.fn<Action>().mockResolvedValue({ status: 'saved', message: 'Pesos salvos.' });
    render(
      <ExamWeightsEditor
        rows={active}
        mode="default"
        confirmRestore={false}
        restored
        showActions
        saveAction={save}
        restoreAction={vi.fn<Action>()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Pesos padrão restaurados.');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(/Pesos salvos\./)).toBeInTheDocument();
    expect(screen.queryByText('Pesos padrão restaurados.')).not.toBeInTheDocument();
  });
});

describe('§ 5.4 — without JavaScript', () => {
  it('renders both forms on the server as posts, not as javascript: URLs', () => {
    const actions = serverFormActions(
      <ExamWeightsEditor
        rows={active}
        mode="custom"
        confirmRestore
        showActions={false}
        saveAction={asServerAction(vi.fn<Action>())}
        restoreAction={asServerAction(vi.fn<Action>())}
      />,
    );

    expect(actions).toHaveLength(2);
    for (const action of actions) expect(action).not.toMatch(/^javascript:/);
  });

  it('would render javascript: URLs for plain functions (the check above can fail)', () => {
    const actions = serverFormActions(
      <ExamWeightsEditor
        rows={active}
        mode="custom"
        confirmRestore
        showActions={false}
        saveAction={vi.fn<Action>()}
        restoreAction={vi.fn<Action>()}
      />,
    );

    expect(actions).toHaveLength(2);
    for (const action of actions) expect(action).toMatch(/^javascript:/);
  });
});
