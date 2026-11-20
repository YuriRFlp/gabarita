import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Notice, PageSection } from '@/shared/ui';
import { createSupabaseServerClient } from '@/shared/supabase';
import { LOGIN_ROUTE } from '@/modules/auth';
import {
  AppearanceSection,
  StudyTargetForm,
  getStudyTarget,
  readSavedTheme,
  saveStudyTarget,
  readThemePreference,
} from '@/modules/settings';
import { ExamWeightsSection, getExamWeightsSettings } from '@/modules/topics';

export const metadata: Metadata = { title: 'Configurações' };

type SettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const confirmRestore = params.confirm === 'restore';
  const restored = params.restored === '1';
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(LOGIN_ROUTE);

  const [weights, study, savedTheme] = await Promise.all([
    getExamWeightsSettings(client, data.user.id),
    getStudyTarget(client, data.user.id),
    readSavedTheme(client, data.user.id),
  ]);

  return (
    <>
      <header className="gb-page-header">
        <h1 className="gb-page-header__title">Configurações</h1>
      </header>

      {!weights.ok || !study.ok ? (
        <Notice kind="error">
          <p>Não foi possível carregar as configurações. Tente de novo em instantes.</p>
          <Link href="/settings">Tentar de novo</Link>
        </Notice>
      ) : (
        <>
          <PageSection
            id="exam-weights"
            title="Concursos e pesos"
            description="Quanto cada concurso pesa na prioridade dos assuntos."
          >
            <StudyTargetForm
              target={study.value.target}
              examOptions={study.value.examOptions}
              action={saveStudyTarget}
            />
            <ExamWeightsSection
              settings={weights.value}
              confirmRestore={confirmRestore}
              restored={restored}
            />
          </PageSection>
          <AppearanceSection savedTheme={savedTheme ?? (await readThemePreference())} />
        </>
      )}
    </>
  );
}
