import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, type Mock } from 'vitest';
import type { ExamWeightsFormState } from '../actions/exam-weights-schema';
import { buildExamWeightsSettings, type Exam } from '../domain';
import { ExamWeightsForm } from './ExamWeightsForm';

type Action = (previous: ExamWeightsFormState, formData: FormData) => Promise<ExamWeightsFormState>;

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
];

function rows(overrides: Parameters<typeof buildExamWeightsSettings>[1] = []) {
  return buildExamWeightsSettings(EXAMS, overrides).active;
}

function renderForm(
  action: Mock<Action> = vi.fn<Action>(async () => ({ status: 'idle' })),
  showActions = true,
) {
  render(<ExamWeightsForm rows={rows()} action={action} showActions={showActions} />);
  return action;
}

const field = (court: string) =>
  screen.getByRole('textbox', { name: `Peso do ${court}, em porcentagem` });
// The live region has no role of its own (a status role would be read as a second notice).
const total = () => {
  const region = screen.getByRole('table').closest('form')?.querySelector('[aria-live]');
  if (!(region instanceof HTMLElement)) throw new Error('live region not found');
  return region;
};
const totalRow = () => within(screen.getByRole('table')).getByRole('row', { name: /^Total/ });
const totalCell = () => within(totalRow()).getByRole('cell');
const save = () => screen.getByRole('button', { name: 'Salvar' });

describe('CA-20 — weights table', () => {
  it('lists the exams in the default order with the default weight and the saved weight', () => {
    renderForm();
    const table = screen.getByRole('table', { name: 'Pesos dos concursos' });
    const body = within(table).getAllByRole('row').slice(1, 3);
    expect(body[0]).toHaveTextContent('TRT-3');
    expect(body[0]).toHaveTextContent('Fumarc 2022');
    expect(body[0]).toHaveTextContent('95%');
    expect(body[1]).toHaveTextContent('TRT-2');
    expect(field('TRT-3 (MG)')).toHaveValue('95');
    expect(field('TRT-2 (SP)')).toHaveValue('5');
    expect(field('TRT-2 (SP)')).toHaveAttribute('inputmode', 'decimal');
  });

  it('shows 100% with icon and text when the sum is right', () => {
    renderForm();
    expect(totalCell()).toHaveTextContent('100%');
    expect(total()).toHaveTextContent('Soma correta');
    expect(total()).toHaveAttribute('aria-live', 'polite');
  });

  it('shows the decimal weights with a comma', () => {
    const decimal = buildExamWeightsSettings(EXAMS, [
      { examId: 'trt3', weight: 0.823 },
      { examId: 'trt2', weight: 0.177 },
    ]).active;
    render(<ExamWeightsForm rows={decimal} action={vi.fn<Action>()} />);
    expect(field('TRT-2 (SP)')).toHaveValue('17,7');
  });
});

describe('CA-21 — live total', () => {
  it('shows points above 100%', async () => {
    renderForm();
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '40');
    expect(totalCell()).toHaveTextContent('135%');
    expect(total()).toHaveTextContent('35 pontos acima de 100%');
  });

  it('announces the total together with the status in the live region', async () => {
    renderForm();
    expect(total()).toHaveTextContent('100%: Soma correta');
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '40');
    expect(total()).toHaveTextContent('135%: 35 pontos acima de 100%');
    expect(within(total()).getByText('135%:')).toHaveClass('gb-visually-hidden');
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), 'abc');
    expect(total()).toHaveTextContent(/^Há valores inválidos$/);
  });

  it('shows points missing below 100%', async () => {
    renderForm();
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '2');
    expect(totalCell()).toHaveTextContent('97%');
    expect(total()).toHaveTextContent('Faltam 3 pontos');
  });

  it('uses the singular for half a point', async () => {
    renderForm();
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '4,5');
    expect(total()).toHaveTextContent('Faltam 0,5 ponto');
  });

  it('shows a dash and "Há valores inválidos" when a field is invalid, with an alert icon', async () => {
    renderForm();
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), 'abc');
    expect(totalCell()).toHaveTextContent('—');
    expect(total()).toHaveTextContent('Há valores inválidos');
    expect(total().querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not submit while typing', async () => {
    const action = renderForm();
    await userEvent.type(field('TRT-2 (SP)'), '1');
    expect(action).not.toHaveBeenCalled();
  });
});

describe('submission', () => {
  it('sends the intent of the clicked button and the typed values', async () => {
    const action = renderForm();
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '40');
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar os demais e salvar' }));
    const formData = action.mock.calls[0]?.[1] as FormData;
    expect(formData.get('intent')).toBe('rebalance');
    expect(formData.get('weight.trt2')).toBe('40');
    expect(formData.get('weight.trt3')).toBe('95');
  });

  it('puts "Salvar" first so Enter in a field saves', async () => {
    const action = renderForm();
    await userEvent.type(field('TRT-2 (SP)'), '{Enter}');
    expect((action.mock.calls[0]?.[1] as FormData).get('intent')).toBe('save');
    const buttons = screen.getAllByRole('button').map((button) => button.textContent);
    expect(buttons).toEqual(['Salvar', 'Ajustar os demais e salvar']);
  });

  it('hides the buttons while the restore confirmation is open', () => {
    renderForm(undefined, false);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables the buttons and marks the form busy while pending', async () => {
    let resolve: (state: ExamWeightsFormState) => void = () => undefined;
    const action = vi.fn<Action>(() => new Promise((done) => (resolve = done)));
    renderForm(action);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ajustar os demais e salvar' })).toBeDisabled();
    expect(screen.getByRole('table').closest('form')).toHaveAttribute('aria-busy', 'true');
    resolve({ status: 'idle' });
  });
});

describe('CA-22 and CA-32 — errors', () => {
  const failing = vi.fn<Action>(async () => ({
    status: 'error',
    message: 'A soma dos pesos precisa ser 100%. Agora está em 135%.',
    fieldErrors: { trt2: 'Use um número de 0 a 100, com no máximo uma casa decimal (ex.: 2,5).' },
    values: { trt3: '95', trt2: '40' },
  }));

  it('focuses the summary, keeps the typed values and links the field error', async () => {
    renderForm(failing);
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '40');
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar os demais e salvar' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('A soma dos pesos precisa ser 100%. Agora está em 135%.');
    expect(summary).toHaveFocus();
    expect(field('TRT-2 (SP)')).toHaveValue('40');
    expect(field('TRT-2 (SP)')).toHaveAttribute('aria-invalid', 'true');
    const message = document.getElementById(
      field('TRT-2 (SP)').getAttribute('aria-describedby') ?? '',
    );
    expect(message).toHaveTextContent('Use um número de 0 a 100');
    expect(field('TRT-3 (MG)')).not.toHaveAttribute('aria-invalid');
  });
});

describe('CA-23 — success', () => {
  it('announces the message with a link to the topic map', async () => {
    renderForm(
      vi.fn<Action>(async () => ({
        status: 'saved',
        message: 'Pesos salvos. A prioridade dos assuntos já usa os novos pesos.',
      })),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(
      'Pesos salvos. A prioridade dos assuntos já usa os novos pesos.',
    );
    expect(within(status).getByRole('link', { name: 'Ver o mapa do edital' })).toHaveAttribute(
      'href',
      '/topics',
    );
  });

  it('shows the new saved weights when the server sends them', async () => {
    const { rerender } = render(<ExamWeightsForm rows={rows()} action={vi.fn<Action>()} />);
    await userEvent.type(field('TRT-2 (SP)'), '0');
    rerender(
      <ExamWeightsForm
        rows={rows([
          { examId: 'trt3', weight: 0.6 },
          { examId: 'trt2', weight: 0.4 },
        ])}
        action={vi.fn<Action>()}
      />,
    );
    expect(field('TRT-2 (SP)')).toHaveValue('40');
    expect(field('TRT-3 (MG)')).toHaveValue('60');
    expect(total()).toHaveTextContent('Soma correta');
  });
});

describe('CA-26 — exam without weight', () => {
  it('shows an empty field', () => {
    const custom = buildExamWeightsSettings(EXAMS, [{ examId: 'trt3', weight: 1 }]).active;
    render(<ExamWeightsForm rows={custom} action={vi.fn<Action>()} />);
    expect(field('TRT-2 (SP)')).toHaveValue('');
    expect(field('TRT-3 (MG)')).toHaveValue('100');
  });
});

describe('sum layout and status', () => {
  it('keeps the total in the Peso column and the status below the table, outside the tfoot', async () => {
    renderForm();
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '40');
    const table = screen.getByRole('table');
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['Concurso', 'Padrão', 'Peso']);
    const footRow = totalRow();
    const totalHeader = within(footRow).getByRole('rowheader', { name: 'Total' });
    expect(footRow.children).toHaveLength(2);
    expect(totalHeader).toHaveAttribute('colspan', '2');
    expect(totalCell()).toHaveTextContent('135%');
    const mirror = totalCell().querySelector('.gb-weight-table__total');
    expect(mirror?.querySelector('.gb-weight-table__total-number')).toHaveTextContent(/^135$/);
    expect(mirror?.querySelector('.gb-weight-table__total-suffix')).toHaveTextContent('%');
    // Column index of a cell = sum of the colspans before it; the total must share the field's column.
    const columnOf = (cell: Element) => {
      let index = 0;
      for (const sibling of Array.from(cell.parentElement?.children ?? [])) {
        if (sibling === cell) return index;
        index += Number(sibling.getAttribute('colspan') ?? 1);
      }
      return -1;
    };
    const fieldRow = within(table).getByRole('row', { name: /TRT-2/ });
    const fieldCell = within(fieldRow)
      .getAllByRole('cell')
      .find((cell) => cell.contains(field('TRT-2 (SP)')));
    if (!fieldCell) throw new Error('field cell not found');
    expect(columnOf(fieldCell)).toBe(2);
    expect(columnOf(totalCell())).toBe(columnOf(fieldCell));
    expect(columnOf(totalCell())).not.toBe(1);
    expect(table.querySelector('tfoot [aria-live]')).toBeNull();
    expect(table.contains(total())).toBe(false);
    expect(total()).toHaveTextContent('35 pontos acima de 100%');
    expect(table.compareDocumentPosition(total()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('blocked "Salvar"', () => {
  const tip = () => screen.queryByRole('tooltip');

  it('is enabled at 100% with no tooltip', () => {
    renderForm();
    expect(save()).not.toHaveAttribute('aria-disabled');
    expect(tip()).not.toBeInTheDocument();
  });

  it('is aria-disabled (still focusable) when the sum is not 100%, above, below or invalid', async () => {
    renderForm();
    for (const value of ['40', '2', 'abc']) {
      await userEvent.clear(field('TRT-2 (SP)'));
      await userEvent.type(field('TRT-2 (SP)'), value);
      expect(save()).toHaveAttribute('aria-disabled', 'true');
      expect(save()).not.toBeDisabled();
    }
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '5');
    expect(save()).not.toHaveAttribute('aria-disabled');
  });

  it('does not submit on click or on Enter while blocked', async () => {
    const action = renderForm();
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '40');
    await userEvent.click(save());
    await userEvent.type(field('TRT-2 (SP)'), '{Enter}');
    save().focus();
    await userEvent.keyboard('{Enter}');
    expect(action).not.toHaveBeenCalled();
  });

  it('shows the tooltip on hover and keyboard focus, linked by aria-describedby, and Esc closes it', async () => {
    renderForm();
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '40');
    expect(tip()).toHaveTextContent('A soma dos pesos deve ser 100%.');
    expect(save()).toHaveAccessibleDescription('A soma dos pesos deve ser 100%.');
    const wrapper = save().closest('.gb-header-hint');
    await userEvent.tab({ shift: true });
    save().focus();
    expect(save()).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(wrapper).toHaveAttribute('data-dismissed', 'true');
    await userEvent.unhover(save());
    save().blur();
    expect(wrapper).toHaveAttribute('data-dismissed', 'false');
  });

  it('also offers the sentence as visible help text for screens without hover', async () => {
    renderForm();
    expect(document.querySelector('.gb-form__help')).toBeNull();
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '40');
    expect(document.querySelector('.gb-form__help')).toHaveTextContent(
      'A soma dos pesos deve ser 100%.',
    );
  });

  it('keeps "Ajustar os demais e salvar" enabled and working', async () => {
    const action = renderForm();
    await userEvent.clear(field('TRT-2 (SP)'));
    await userEvent.type(field('TRT-2 (SP)'), '40');
    const rebalance = screen.getByRole('button', { name: 'Ajustar os demais e salvar' });
    expect(rebalance).not.toHaveAttribute('aria-disabled');
    await userEvent.click(rebalance);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
