import { z } from 'zod';
import {
  TOPIC_CATEGORIES,
  TOPIC_MAP_SORTS,
  TOPIC_MAP_VIEWS,
  TOPIC_PROFILES,
  type TopicMapQuery,
} from '../domain';

export const topicMapQuerySchema = z.object({
  view: z.enum(TOPIC_MAP_VIEWS).catch('list'),
  category: z.enum(['all', ...TOPIC_CATEGORIES]).catch('all'),
  profile: z.enum(['all', ...TOPIC_PROFILES]).catch('all'),
  sort: z.enum(TOPIC_MAP_SORTS).catch('urgency'),
});

export const topicIdSchema = z.string().regex(/^[a-z0-9_]{1,64}$/);

/** A repeated parameter (`?sort=a&sort=b`) arrives as an array and falls back to the default. */
export function parseTopicMapQuery(
  searchParams: Record<string, string | string[] | undefined>,
): TopicMapQuery {
  return topicMapQuerySchema.parse({
    view: searchParams.view,
    category: searchParams.category,
    profile: searchParams.profile,
    sort: searchParams.sort,
  });
}
