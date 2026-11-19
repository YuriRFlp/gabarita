import type { DbClient } from '@/shared/supabase';
import { readTopicMapSource, type LoadResult } from '../data/topics-repository';
import {
  buildTopicDetail,
  buildTopicMap,
  type Exam,
  type TopicMap,
  type TopicMapEntry,
  type TopicMapQuery,
} from '../domain';

// Server-side readers, deliberately without 'use server': they are not callable from the client (P-9).

export async function getTopicMap(
  client: DbClient,
  userId: string,
  query: TopicMapQuery,
): Promise<LoadResult<TopicMap>> {
  const source = await readTopicMapSource(client, userId);
  if (!source.ok) return source;
  return { ok: true, value: buildTopicMap(source.value, query) };
}

/** `value: null` means the topic does not exist (the page answers 404). */
export async function getTopicDetail(
  client: DbClient,
  userId: string,
  topicId: string,
): Promise<LoadResult<{ entry: TopicMapEntry; exams: ReadonlyArray<Exam> } | null>> {
  const source = await readTopicMapSource(client, userId);
  if (!source.ok) return source;
  const entry = buildTopicDetail(source.value, topicId);
  if (entry === null) return { ok: true, value: null };
  return { ok: true, value: { entry, exams: entry.priority.contributions.map((c) => c.exam) } };
}
