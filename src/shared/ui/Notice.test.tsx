import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { Notice } from './Notice';

describe('Notice', () => {
  it('announces an error as an alert, with icon and text', () => {
    render(<Notice kind="error">E-mail ou senha incorretos.</Notice>);
    const notice = screen.getByRole('alert');
    expect(notice).toHaveTextContent('E-mail ou senha incorretos.');
    expect(notice).toHaveClass('gb-notice', 'gb-notice--error');
    expect(notice.querySelector('svg')).toBeInTheDocument();
  });

  it('announces a success as a status, with icon and text', () => {
    render(<Notice kind="success">Tema salvo.</Notice>);
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Tema salvo.');
    expect(notice).toHaveClass('gb-notice', 'gb-notice--success');
    expect(notice.querySelector('svg')).toBeInTheDocument();
  });

  it('shows information with icon and text, without a live region role', () => {
    const { container } = render(<Notice kind="info">Domínio ainda não medido.</Notice>);
    const notice = container.firstElementChild;
    expect(notice).toHaveTextContent('Domínio ainda não medido.');
    expect(notice).toHaveClass('gb-notice', 'gb-notice--info');
    expect(notice).not.toHaveAttribute('role');
    expect(notice?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hides the icon from screen readers so the message is not repeated', () => {
    render(<Notice kind="error">Falhou.</Notice>);
    expect(screen.getByRole('alert').querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('can receive programmatic focus through ref and tabIndex -1', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Notice kind="error" ref={ref} tabIndex={-1}>
        Falhou.
      </Notice>,
    );
    ref.current?.focus();
    expect(screen.getByRole('alert')).toHaveFocus();
  });
});

describe('Notice close button (all kinds)', () => {
  it.each([
    ['error', 'alert'],
    ['success', 'status'],
  ] as const)('closes a %s notice by click, keeping its %s role while open', async (kind, role) => {
    render(<Notice kind={kind}>Texto.</Notice>);
    expect(screen.getByRole(role)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByRole(role)).not.toBeInTheDocument();
  });

  it('closes an info notice, which has no role, and closes with Escape on the button', async () => {
    render(<Notice kind="info">Informação.</Notice>);
    expect(screen.getByText('Informação.').closest('.gb-notice')).not.toHaveAttribute('role');
    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Informação.')).not.toBeInTheDocument();
  });

  it('keeps the link next to the close button and does not close when following it', () => {
    render(
      <Notice kind="error">
        <a href="/settings">Tentar de novo</a>
      </Notice>,
    );
    expect(screen.getByRole('link', { name: 'Tentar de novo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar aviso' })).toBeInTheDocument();
  });

  it('shows the notice again when resetKey changes', async () => {
    const { rerender } = render(
      <Notice kind="error" resetKey={1}>
        Falhou.
      </Notice>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    rerender(
      <Notice kind="error" resetKey={2}>
        Falhou.
      </Notice>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has no close button with dismissible={false}', () => {
    render(
      <Notice kind="info" dismissible={false}>
        Pergunta.
      </Notice>,
    );
    expect(screen.queryByRole('button', { name: 'Fechar aviso' })).not.toBeInTheDocument();
  });

  it('keeps the forwarded ref focusable', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Notice kind="error" ref={ref} tabIndex={-1}>
        Falhou.
      </Notice>,
    );
    ref.current?.focus();
    expect(screen.getByRole('alert')).toHaveFocus();
  });
});
