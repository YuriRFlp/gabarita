import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HeaderHint } from './HeaderHint';

describe('HeaderHint', () => {
  it('renders the title as a button described by a tooltip with the hint', () => {
    render(<HeaderHint hint="Explica a coluna.">Prioridade</HeaderHint>);
    const trigger = screen.getByRole('button', { name: 'Prioridade' });
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Explica a coluna.');
    expect(trigger).toHaveAccessibleDescription('Explica a coluna.');
    expect(trigger).toHaveAttribute('aria-describedby', tip.id);
  });

  it('is reachable by keyboard', async () => {
    render(<HeaderHint hint="Dica.">Domínio</HeaderHint>);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Domínio' })).toHaveFocus();
  });

  it('is dismissed by Escape and shown again after the focus leaves', async () => {
    render(<HeaderHint hint="Dica.">Domínio</HeaderHint>);
    const wrapper = screen.getByRole('button').parentElement;
    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    expect(wrapper).toHaveAttribute('data-dismissed', 'true');
    await userEvent.tab();
    expect(wrapper).toHaveAttribute('data-dismissed', 'false');
  });

  it('takes the end alignment modifier', () => {
    render(
      <HeaderHint hint="Dica." alignEnd>
        Domínio
      </HeaderHint>,
    );
    expect(screen.getByRole('button').parentElement).toHaveClass('gb-header-hint--end');
  });

  it('leaves the tab order while the given media query matches', () => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
    render(
      <HeaderHint hint="Dica." unfocusableWhen="(max-width: 767.98px)">
        Domínio
      </HeaderHint>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1');
  });
});
