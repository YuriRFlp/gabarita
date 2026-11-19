import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriorityValue } from './PriorityValue';

function fill(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('.gb-priority__fill');
}

describe('PriorityValue', () => {
  it.each([
    [0.89, '0,89'],
    [1, '1,00'],
    [0.065, '0,07'],
    [0, '0,00'],
  ])('shows %s with two decimals in pt-BR as "%s"', (value, text) => {
    render(<PriorityValue value={value} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('draws the bar proportional to the value, hidden from screen readers', () => {
    const { container } = render(<PriorityValue value={0.25} />);
    expect(container.firstElementChild).toHaveClass('gb-priority');
    expect(container.querySelector('.gb-priority__bar')).toHaveAttribute('aria-hidden', 'true');
    expect(fill(container)).toHaveStyle({ width: '25%' });
  });

  it('keeps the bar between 0 and 100%', () => {
    const { container } = render(<PriorityValue value={1.2} />);
    expect(fill(container)).toHaveStyle({ width: '100%' });
  });
});
