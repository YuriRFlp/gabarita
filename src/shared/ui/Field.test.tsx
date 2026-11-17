import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';

describe('Field', () => {
  it('associates the label with the input', () => {
    render(<Field id="email" label="E-mail" type="email" />);
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('id', 'email');
  });

  it('without an error, neither marks the input invalid nor points to a message', () => {
    render(<Field id="email" label="E-mail" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('with an error, sets aria-invalid and describes the input by the message', () => {
    render(<Field id="email" label="E-mail" error="Informe um e-mail válido." />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Informe um e-mail válido.');
  });

  it('shows the error message with an icon and text', () => {
    render(<Field id="password" label="Senha" error="Informe a senha." />);
    const messageId = screen.getByLabelText('Senha').getAttribute('aria-describedby') ?? '';
    const message = document.getElementById(messageId);
    expect(message).toHaveTextContent('Informe a senha.');
    expect(message?.querySelector('svg')).toBeInTheDocument();
  });

  it('keeps an existing aria-describedby when adding the error', () => {
    render(
      <>
        <p id="hint">Use o e-mail cadastrado.</p>
        <Field
          id="email"
          label="E-mail"
          aria-describedby="hint"
          error="Informe um e-mail válido."
        />
      </>,
    );
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-describedby', 'hint email-error');
  });

  it('passes native attributes through to the input', () => {
    render(
      <Field
        id="password"
        label="Senha"
        type="password"
        name="password"
        autoComplete="current-password"
        required
      />,
    );
    const input = screen.getByLabelText('Senha');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('name', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(input).toBeRequired();
  });
});
