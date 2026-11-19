import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Bubble } from './Bubble';

function bubble(container: HTMLElement): Element {
  const element = container.querySelector('.gb-bubble');
  if (!element) throw new Error('Bubble not rendered.');
  return element;
}

describe('Bubble', () => {
  it('renders an empty bubble with only the base class', () => {
    const { container } = render(<Bubble fill="empty" />);
    expect(bubble(container).className).toBe('gb-bubble');
  });

  it.each(['half', 'filled'] as const)('applies the %s fill class', (fill) => {
    const { container } = render(<Bubble fill={fill} />);
    expect(bubble(container)).toHaveClass('gb-bubble', `gb-bubble--${fill}`);
  });

  it('applies the small size class', () => {
    const { container } = render(<Bubble fill="filled" size="small" />);
    expect(bubble(container)).toHaveClass('gb-bubble--small');
  });

  it('is hidden from screen readers when it has no label', () => {
    const { container } = render(<Bubble fill="filled" />);
    expect(bubble(container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes the label as visually hidden text instead of the shape', () => {
    const { container } = render(<Bubble fill="half" label="parcial ou em nível de noções" />);
    expect(bubble(container)).not.toHaveAttribute('aria-hidden');
    const text = screen.getByText('parcial ou em nível de noções');
    expect(text).toHaveClass('gb-visually-hidden');
  });
});
