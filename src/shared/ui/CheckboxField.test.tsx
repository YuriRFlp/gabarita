import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CheckboxField } from './CheckboxField';

describe('CheckboxField', () => {
  it('renders a checkbox named by its label', () => {
    render(<CheckboxField id="published" label="O edital foi publicado" name="published" />);
    const box = screen.getByRole('checkbox', { name: 'O edital foi publicado' });
    expect(box).toHaveClass('gb-checkbox__input');
    expect(box).toHaveAttribute('name', 'published');
  });

  it('toggles by clicking the label and by the Space key', async () => {
    render(<CheckboxField id="p" label="Publicado" />);
    const box = screen.getByRole('checkbox', { name: 'Publicado' });
    await userEvent.click(screen.getByText('Publicado'));
    expect(box).toBeChecked();
    box.focus();
    await userEvent.keyboard(' ');
    expect(box).not.toBeChecked();
  });

  it('describes the checkbox by the hint', () => {
    render(
      <CheckboxField id="p" label="Publicado" hint="O plano só inclui assuntos pós-edital." />,
    );
    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription(
      'O plano só inclui assuntos pós-edital.',
    );
  });

  it('with an error, sets aria-invalid and shows icon and text', () => {
    render(
      <CheckboxField id="p" label="Publicado" hint="Dica." error="Escolha um concurso-alvo." />,
    );
    const box = screen.getByRole('checkbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAttribute('aria-describedby', 'p-hint p-error');
    expect(document.getElementById('p-error')?.querySelector('svg')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<CheckboxField id="p" label="Publicado" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
