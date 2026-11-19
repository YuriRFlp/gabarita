import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FilterGroup } from './FilterGroup';

const OPTIONS = [
  { label: 'Todos', href: '/topics', current: false },
  { label: 'Específicos', href: '/topics?category=specific', current: true },
  { label: 'Gerais', href: '/topics?category=general', current: false },
];

describe('FilterGroup', () => {
  it('is a group named by its visible label', () => {
    render(<FilterGroup label="Grupo" options={OPTIONS} />);
    const group = screen.getByRole('group', { name: 'Grupo' });
    expect(group).toHaveClass('gb-filter-group');
    expect(screen.getByText('Grupo')).toBeVisible();
  });

  it('renders each option as a link with its href and the segmented classes', () => {
    render(<FilterGroup label="Grupo" options={OPTIONS} />);
    for (const option of OPTIONS) {
      const link = screen.getByRole('link', { name: option.label });
      expect(link).toHaveAttribute('href', option.href);
      expect(link).toHaveClass('gb-segmented__option');
    }
    expect(screen.getByRole('list')).toHaveClass('gb-segmented');
  });

  it('marks only the current option with aria-current="true"', () => {
    render(<FilterGroup label="Grupo" options={OPTIONS} />);
    expect(screen.getByRole('link', { name: 'Específicos' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Todos' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Gerais' })).not.toHaveAttribute('aria-current');
  });
});
