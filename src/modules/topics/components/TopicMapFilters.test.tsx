import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TopicMapQuery } from '../domain';
import { buildTopicMapHref, TopicMapFilters } from './TopicMapFilters';

const DEFAULT_QUERY: TopicMapQuery = {
  view: 'list',
  category: 'all',
  profile: 'all',
  sort: 'urgency',
};

describe('buildTopicMapHref', () => {
  it('leaves default values out of the URL', () => {
    expect(buildTopicMapHref(DEFAULT_QUERY)).toBe('/topics');
  });

  it('applies the change and preserves the other parameters', () => {
    const query: TopicMapQuery = { ...DEFAULT_QUERY, category: 'specific', sort: 'name' };
    expect(buildTopicMapHref(query, { view: 'matrix' })).toBe(
      '/topics?view=matrix&category=specific&sort=name',
    );
    expect(buildTopicMapHref(query, { category: 'all' })).toBe('/topics?sort=name');
  });
});

describe('TopicMapFilters', () => {
  it('renders the four groups as links', () => {
    render(<TopicMapFilters query={DEFAULT_QUERY} />);
    for (const name of ['Ver', 'Grupo', 'Perfil', 'Ordenar']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    }
  });

  it('marks the current option of each group with aria-current', () => {
    render(<TopicMapFilters query={{ ...DEFAULT_QUERY, view: 'matrix', profile: 'infra' }} />);
    expect(
      within(screen.getByRole('group', { name: 'Ver' })).getByRole('link', { name: 'Matriz' }),
    ).toHaveAttribute('aria-current', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Perfil' })).getByRole('link', { name: 'Infra' }),
    ).toHaveAttribute('aria-current', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Ordenar' })).getByRole('link', {
        name: 'Urgência',
      }),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('keeps the other choices when picking an option', () => {
    render(<TopicMapFilters query={{ ...DEFAULT_QUERY, category: 'specific' }} />);
    expect(
      within(screen.getByRole('group', { name: 'Ver' })).getByRole('link', { name: 'Matriz' }),
    ).toHaveAttribute('href', '/topics?view=matrix&category=specific');
    expect(
      within(screen.getByRole('group', { name: 'Grupo' })).getByRole('link', { name: 'Todos' }),
    ).toHaveAttribute('href', '/topics');
  });
});
