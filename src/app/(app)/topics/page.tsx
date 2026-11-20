import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/shared/supabase';
import { LOGIN_ROUTE } from '@/modules/auth';
import {
  TopicMapView,
  getTopicMap,
  parseTopicMapQuery,
  readDismissedWeightsFingerprint,
} from '@/modules/topics';

export const metadata: Metadata = { title: 'Mapa do edital' };

type TopicsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TopicsPage({ searchParams }: TopicsPageProps) {
  const query = parseTopicMapQuery(await searchParams);
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(LOGIN_ROUTE);

  const result = await getTopicMap(client, data.user.id, query);
  return (
    <TopicMapView
      result={result}
      query={query}
      dismissedWeightsFingerprint={await readDismissedWeightsFingerprint()}
    />
  );
}
