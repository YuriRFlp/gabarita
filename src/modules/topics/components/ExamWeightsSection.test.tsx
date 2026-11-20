import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { serverFormActions } from '#factories/server-action';
import { buildExamWeightsSettings, type Exam } from '../domain';
import { ExamWeightsSection } from './ExamWeightsSection';

// The real modules are 'use server' files; here they become references shaped like Next's.
vi.mock('../actions/save-exam-weights', async () => {
  const { asServerAction } = await import('#factories/server-action');
  return { saveExamWeights: asServerAction(vi.fn()) };
});
vi.mock('../actions/restore-default-weights', async () => {
  const { asServerAction } = await import('#factories/server-action');
  return { restoreDefaultWeights: asServerAction(vi.fn()) };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const EXAMS: Exam[] = [
  {
    id: 'trt3',
    court: 'TRT-3 (MG)',
    year: 2022,
    examBoardName: 'Fumarc',
    targetWeight: 0.95,
    active: true,
  },
  {
    id: 'trt2',
    court: 'TRT-2 (SP)',
    year: 2025,
    examBoardName: 'FCC',
    targetWeight: 0.05,
    active: true,
  },
  { id: 'old', court: 'TJXX', year: 2019, examBoardName: 'Banca', targetWeight: 0, active: false },
];

describe('CA-20 — default weights', () => {
  it('shows the default tag and no restore link', () => {
    render(<ExamWeightsSection settings={buildExamWeightsSettings(EXAMS, [])} />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Pesos dos concursos' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Pesos padrão')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Restaurar padrão' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });
});

describe('custom weights', () => {
  const custom = buildExamWeightsSettings(EXAMS, [
    { examId: 'trt3', weight: 0.6 },
    { examId: 'trt2', weight: 0.4 },
  ]);

  it('CA-28 — ignores ?restored=1 while the weights are custom', () => {
    render(<ExamWeightsSection settings={custom} restored />);
    expect(screen.queryByText('Pesos padrão restaurados.')).not.toBeInTheDocument();
  });

  it('shows the custom tag and the restore link', () => {
    render(<ExamWeightsSection settings={custom} />);
    expect(screen.getByText('Pesos personalizados')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Restaurar padrão' })).toBeInTheDocument();
  });

  it('CA-28 — swaps the buttons for the confirmation', () => {
    render(<ExamWeightsSection settings={custom} confirmRestore />);
    expect(screen.getByRole('button', { name: 'Restaurar pesos padrão' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('ignores the confirmation in default mode', () => {
    render(<ExamWeightsSection settings={buildExamWeightsSettings(EXAMS, [])} confirmRestore />);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });
});

describe('CA-26 — notices', () => {
  it('names the exam without a weight and the total off 100%', () => {
    const settings = buildExamWeightsSettings(EXAMS, [{ examId: 'trt3', weight: 0.72 }]);
    render(<ExamWeightsSection settings={settings} />);
    expect(
      screen.getByText('TRT-2 (SP) ainda não tem peso definido e conta como 0%.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Os pesos dos concursos ativos somam 72%\. Ajuste e salve para voltar a 100%\./,
      ),
    ).toBeInTheDocument();
  });

  it('shows no notice when everything is in order', () => {
    render(<ExamWeightsSection settings={buildExamWeightsSettings(EXAMS, [])} />);
    expect(screen.queryByText(/ainda não tem peso/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ajuste e salve/)).not.toBeInTheDocument();
  });
});

describe('CA-27 — inactive exams', () => {
  it('lists them apart, tagged, without a weight field', () => {
    render(<ExamWeightsSection settings={buildExamWeightsSettings(EXAMS, [])} />);
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(1);
    const [list] = lists;
    expect(list?.previousElementSibling).toHaveTextContent('Inativos (não contam na prioridade)');
    if (!list) throw new Error('inactive list not found');
    expect(within(list).getByText(/TJXX · Banca 2019/)).toBeInTheDocument();
    expect(within(list).getByText('Inativo')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /TJXX/ })).not.toBeInTheDocument();
  });
});

describe('CA-31 — empty', () => {
  it('shows the empty state without a form', () => {
    render(<ExamWeightsSection settings={buildExamWeightsSettings([], [])} />);
    expect(screen.getByText('Nenhum concurso carregado.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('§ 5.4 — without JavaScript', () => {
  const custom = buildExamWeightsSettings(EXAMS, [
    { examId: 'trt3', weight: 0.6 },
    { examId: 'trt2', weight: 0.4 },
  ]);

  it('hands the Server Actions to the forms untouched, so both post without JavaScript', () => {
    const save = serverFormActions(<ExamWeightsSection settings={custom} />);
    const restore = serverFormActions(<ExamWeightsSection settings={custom} confirmRestore />);
    expect(save).toHaveLength(1);
    expect(restore).toHaveLength(2);
    for (const action of [...save, ...restore]) expect(action).not.toMatch(/^javascript:/);
  });

  it('CA-28 — shows "Pesos padrão restaurados." when the address has ?restored=1', () => {
    render(<ExamWeightsSection settings={buildExamWeightsSettings(EXAMS, [])} restored />);
    expect(screen.getByRole('status')).toHaveTextContent('Pesos padrão restaurados.');
  });
});
