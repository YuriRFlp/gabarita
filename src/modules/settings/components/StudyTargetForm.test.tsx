import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { asServerAction, serverFormActions } from '#factories/server-action';
import type { StudyTargetFormState } from '../actions/study-target-schema';
import { StudyTargetForm } from './StudyTargetForm';

type Action = (previous: StudyTargetFormState, formData: FormData) => Promise<StudyTargetFormState>;

const OPTIONS = [
  { id: 'trt2', label: 'TRT-2 (SP) · FCC 2025' },
  { id: 'trt3', label: 'TRT-3 (MG) · Fumarc 2022' },
];

const select = () => screen.getByRole('combobox', { name: 'Concurso-alvo' });
const checkbox = () =>
  screen.getByRole('checkbox', { name: 'O edital do concurso-alvo foi publicado' });

function renderForm(
  target = { targetExamId: null as string | null, targetNoticePublished: false },
  action: Action = vi.fn<Action>(async () => ({ status: 'idle' })),
) {
  render(<StudyTargetForm target={target} examOptions={OPTIONS} action={action} />);
  return action;
}

describe('CA-29 — study target form', () => {
  it('offers "Nenhum" and the active exams, with the explanation as the box description', () => {
    renderForm();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Nenhum',
      'TRT-2 (SP) · FCC 2025',
      'TRT-3 (MG) · Fumarc 2022',
    ]);
    expect(checkbox()).toHaveAccessibleDescription(
      'O plano do dia só inclui assuntos pós-edital depois que o edital do concurso-alvo for publicado.',
    );
  });

  it('starts from the saved target', () => {
    renderForm({ targetExamId: 'trt2', targetNoticePublished: true });
    expect(select()).toHaveValue('trt2');
    expect(checkbox()).toBeChecked();
    expect(checkbox()).toBeEnabled();
  });

  it('treats a saved target that is no longer active as "Nenhum"', () => {
    renderForm({ targetExamId: 'old', targetNoticePublished: true });
    expect(select()).toHaveValue('');
    expect(checkbox()).toBeDisabled();
    expect(checkbox()).not.toBeChecked();
  });

  it('disables and clears the box with "Nenhum", and enables it again with an exam', async () => {
    renderForm({ targetExamId: 'trt2', targetNoticePublished: true });
    await userEvent.selectOptions(select(), '');
    expect(checkbox()).toBeDisabled();
    expect(checkbox()).not.toBeChecked();
    await userEvent.selectOptions(select(), 'trt3');
    expect(checkbox()).toBeEnabled();
  });

  it('submits the exam and the box and shows the saved message', async () => {
    const action = renderForm(
      undefined,
      vi.fn<Action>(async () => ({ status: 'saved', message: 'Concurso-alvo salvo.' })),
    );
    await userEvent.selectOptions(select(), 'trt2');
    await userEvent.click(checkbox());
    await userEvent.click(screen.getByRole('button', { name: 'Salvar concurso-alvo' }));
    const formData = vi.mocked(action).mock.calls[0]?.[1] as FormData;
    expect(formData.get('targetExamId')).toBe('trt2');
    expect(formData.get('targetNoticePublished')).toBe('on');
    expect(await screen.findByRole('status')).toHaveTextContent('Concurso-alvo salvo.');
  });

  it('shows a server error as an alert', async () => {
    renderForm(
      undefined,
      vi.fn<Action>(async () => ({
        status: 'error',
        message: 'Não foi possível salvar o concurso-alvo. Tente de novo.',
      })),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar concurso-alvo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar');
  });

  it('marks the form busy and disables the button while pending', async () => {
    let resolve: (state: StudyTargetFormState) => void = () => undefined;
    renderForm(
      undefined,
      vi.fn<Action>(() => new Promise((done) => (resolve = done))),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar concurso-alvo' }));
    expect(screen.getByRole('button', { name: 'Salvar concurso-alvo' })).toBeDisabled();
    expect(select().closest('form')).toHaveAttribute('aria-busy', 'true');
    resolve({ status: 'idle' });
  });
});

describe('§ 5.4 — without JavaScript', () => {
  it('renders the form on the server as a post, not as a javascript: URL', () => {
    const actions = serverFormActions(
      <StudyTargetForm
        target={{ targetExamId: null, targetNoticePublished: false }}
        examOptions={OPTIONS}
        action={asServerAction(vi.fn<Action>())}
      />,
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]).not.toMatch(/^javascript:/);
  });
});
