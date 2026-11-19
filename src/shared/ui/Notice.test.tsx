import { render, screen } from '@testing-library/react';
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
