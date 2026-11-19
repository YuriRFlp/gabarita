import { FilterGroup, type FilterOption } from '@/shared/ui';
import type { TopicMapQuery } from '../domain';
import { PROFILE_LABELS } from './format';

export const TOPICS_PATH = '/topics';

const DEFAULTS: TopicMapQuery = { view: 'list', category: 'all', profile: 'all', sort: 'urgency' };

/** Builds the link for a query; parameters equal to their default are left out of the URL. */
export function buildTopicMapHref(
  query: TopicMapQuery,
  changes: Partial<TopicMapQuery> = {},
): string {
  const next = { ...query, ...changes };
  const params = new URLSearchParams();
  for (const key of ['view', 'category', 'profile', 'sort'] as const) {
    if (next[key] !== DEFAULTS[key]) params.set(key, next[key]);
  }
  const search = params.toString();
  return search === '' ? TOPICS_PATH : `${TOPICS_PATH}?${search}`;
}

function options<K extends keyof TopicMapQuery>(
  query: TopicMapQuery,
  key: K,
  choices: ReadonlyArray<readonly [TopicMapQuery[K], string]>,
): FilterOption[] {
  return choices.map(([value, label]) => ({
    label,
    href: buildTopicMapHref(query, { [key]: value }),
    current: query[key] === value,
  }));
}

export function TopicMapFilters({ query }: { query: TopicMapQuery }) {
  return (
    <div className="gb-topic-filters">
      <FilterGroup
        label="Ver"
        options={options(query, 'view', [
          ['list', 'Lista'],
          ['matrix', 'Matriz'],
        ])}
      />
      <FilterGroup
        label="Grupo"
        options={options(query, 'category', [
          ['all', 'Todos'],
          ['specific', 'Específicos'],
          ['general', 'Gerais'],
        ])}
      />
      <FilterGroup
        label="Perfil"
        options={options(query, 'profile', [
          ['all', 'Todos'],
          ['systems', PROFILE_LABELS.systems],
          ['infra', PROFILE_LABELS.infra],
          ['common', PROFILE_LABELS.common],
        ])}
      />
      <FilterGroup
        label="Ordenar"
        options={options(query, 'sort', [
          ['urgency', 'Urgência'],
          ['priority', 'Prioridade'],
          ['name', 'Nome'],
        ])}
      />
    </div>
  );
}
