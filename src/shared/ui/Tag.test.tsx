import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tag } from './Tag';

describe('Tag', () => {
  it('renders the text with only the base class by default', () => {
    render(<Tag>Sistemas</Tag>);
    expect(screen.getByText('Sistemas').className).toBe('gb-tag');
  });

  it.each(['new', 'overdue', 'phase'] as const)('applies the %s variant class', (variant) => {
    render(<Tag variant={variant}>Pós-edital</Tag>);
    expect(screen.getByText('Pós-edital')).toHaveClass('gb-tag', `gb-tag--${variant}`);
  });
});
