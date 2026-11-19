import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { createSupabaseServerClient } from '@/shared/supabase';
import { LOGIN_ROUTE } from '@/modules/auth';
import { TopicDetailView, getTopicDetail, topicIdSchema } from '@/modules/topics';

type TopicPageProps = { params: Promise<{ topicId: string }> };

// Shared between generateMetadata and the page so the data is read once per request.
const loadDetail = cache(async (topicId: string) => {
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(LOGIN_ROUTE);
  return getTopicDetail(client, data.user.id, topicId);
});

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { topicId } = await params;
  if (!topicIdSchema.safeParse(topicId).success) return { title: 'Mapa do edital' };
  const result = await loadDetail(topicId);
  return { title: result.ok && result.value ? result.value.entry.topic.name : 'Mapa do edital' };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topicId } = await params;
  if (!topicIdSchema.safeParse(topicId).success) notFound();

  const result = await loadDetail(topicId);
  if (!result.ok) {
    return <TopicDetailView result={result} retryHref={`/topics/${topicId}`} />;
  }
  if (result.value === null) notFound();
  return (
    <TopicDetailView result={{ ok: true, value: result.value }} retryHref={`/topics/${topicId}`} />
  );
}
