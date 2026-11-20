import { PageSection } from '@/shared/ui';
import type { ThemePreference } from '../domain';
import { ThemeToggle } from './ThemeToggle';

export function AppearanceSection({ savedTheme }: { savedTheme: ThemePreference }) {
  return (
    <PageSection
      id="appearance"
      title="Aparência"
      description="Tema claro, escuro ou o do seu aparelho."
    >
      <ThemeToggle savedTheme={savedTheme} />
    </PageSection>
  );
}
