import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SelectField } from './SelectField';

describe('SelectField', () => {
  it('associates the label with the select and renders the options', () => {
    render(
      <SelectField id="target" label="Concurso-alvo" name="target">
        <option value="">Nenhum</option>
        <option value="trt2">TRT-2 (SP)</option>
      </SelectField>,
    );
    const select = screen.getByRole('combobox', { name: 'Concurso-alvo' });
    expect(select).toHaveClass('gb-field__input', 'gb-field__select');
    expect(select).toHaveAttribute('name', 'target');
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('lets the keyboard change the value', async () => {
    render(
      <SelectField id="target" label="Concurso-alvo" defaultValue="">
        <option value="">Nenhum</option>
        <option value="trt2">TRT-2 (SP)</option>
      </SelectField>,
    );
    await userEvent.selectOptions(screen.getByLabelText('Concurso-alvo'), 'trt2');
    expect(screen.getByLabelText('Concurso-alvo')).toHaveValue('trt2');
  });

  it('without an error, neither marks invalid nor points to a message', () => {
    render(<SelectField id="t" label="T" />);
    const select = screen.getByLabelText('T');
    expect(select).not.toHaveAttribute('aria-invalid');
    expect(select).not.toHaveAttribute('aria-describedby');
  });

  it('with an error, shows icon and text and describes the select', () => {
    render(<SelectField id="t" label="T" error="Escolha um concurso." aria-describedby="hint" />);
    const select = screen.getByLabelText('T');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAttribute('aria-describedby', 'hint t-error');
    const message = document.getElementById('t-error');
    expect(message).toHaveTextContent('Escolha um concurso.');
    expect(message?.querySelector('svg')).toBeInTheDocument();
  });
});
