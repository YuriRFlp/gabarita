import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DismissibleNotice } from './DismissibleNotice';
import { Notice } from './Notice';

describe('DismissibleNotice', () => {
  it('is a success status with an accessibly named close button', () => {
    render(<DismissibleNotice>Concurso-alvo salvo.</DismissibleNotice>);
    expect(screen.getByRole('status')).toHaveTextContent('Concurso-alvo salvo.');
    const close = screen.getByRole('button', { name: 'Fechar aviso' });
    expect(close).toHaveAttribute('type', 'button');
    expect(close.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('closes on click', async () => {
    render(<DismissibleNotice>Salvo.</DismissibleNotice>);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('closes with Escape while the button has focus', async () => {
    render(<DismissibleNotice>Salvo.</DismissibleNotice>);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Fechar aviso' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('moves focus to the next control in the form instead of losing it', async () => {
    render(
      <form>
        <DismissibleNotice>Salvo.</DismissibleNotice>
        <label htmlFor="x">Campo</label>
        <input id="x" />
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.getByLabelText('Campo')).toHaveFocus();
  });

  it('moves focus to the container when no control follows', async () => {
    render(
      <form aria-label="Formulário">
        <DismissibleNotice>Salvo.</DismissibleNotice>
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.getByRole('form')).toHaveFocus();
  });

  it('shows again when the result changes', async () => {
    const { rerender } = render(<DismissibleNotice resetKey={{}}>Salvo.</DismissibleNotice>);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(<DismissibleNotice resetKey={{}}>Salvo.</DismissibleNotice>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('stays closed when re-rendered with the same result', async () => {
    const key = {};
    const { rerender } = render(<DismissibleNotice resetKey={key}>Salvo.</DismissibleNotice>);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    rerender(<DismissibleNotice resetKey={key}>Salvo.</DismissibleNotice>);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('gives error and info notices a close button too', () => {
    render(
      <>
        <Notice kind="error">Falhou.</Notice>
        <Notice kind="info">Aviso.</Notice>
      </>,
    );
    expect(screen.getAllByRole('button', { name: 'Fechar aviso' })).toHaveLength(2);
  });

  it('calls onDismiss once when closed by the button or Esc', async () => {
    const onDismiss = vi.fn();
    const { unmount } = render(<DismissibleNotice onDismiss={onDismiss}>Salvo.</DismissibleNotice>);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    unmount();

    render(<DismissibleNotice onDismiss={onDismiss}>Salvo.</DismissibleNotice>);
    screen.getByRole('button', { name: 'Fechar aviso' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
