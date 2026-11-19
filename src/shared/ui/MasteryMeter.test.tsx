import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MasteryMeter } from './MasteryMeter';

function bubbles(container: HTMLElement) {
  return Array.from(container.querySelectorAll('.gb-mastery__bubbles .gb-bubble'));
}

function filledCount(container: HTMLElement): number {
  return bubbles(container).filter((element) => element.classList.contains('gb-bubble--filled'))
    .length;
}

describe('MasteryMeter', () => {
  it('without answers shows "Sem respostas" and five empty bubbles, never 0%', () => {
    const { container } = render(<MasteryMeter value={null} />);
    expect(container.querySelector('.gb-mastery')).toHaveTextContent('Sem respostas');
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(bubbles(container)).toHaveLength(5);
    expect(filledCount(container)).toBe(0);
  });

  it('shows 0,7 as "70%" with four filled bubbles', () => {
    const { container } = render(<MasteryMeter value={0.7} />);
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(filledCount(container)).toBe(4);
  });

  it.each([
    [0, 0],
    [0.1, 1],
    [0.5, 3],
    [0.95, 5],
    [1, 5],
  ])('fills round(%s × 5) bubbles: %s', (value, expected) => {
    const { container } = render(<MasteryMeter value={value} />);
    expect(filledCount(container)).toBe(expected);
    expect(bubbles(container)).toHaveLength(5);
  });

  it('shows a measured 0 as "0%", unlike no answers', () => {
    render(<MasteryMeter value={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.queryByText('Sem respostas')).not.toBeInTheDocument();
  });

  it('keeps values out of range within 0 to 5 bubbles and 0% to 100%', () => {
    const { container } = render(<MasteryMeter value={1.4} />);
    expect(filledCount(container)).toBe(5);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('hides the bubbles from screen readers so only the text is read', () => {
    const { container } = render(<MasteryMeter value={0.7} />);
    expect(container.querySelector('.gb-mastery__bubbles')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.gb-mastery')).toHaveClass('gb-mastery');
  });
});
