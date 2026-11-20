import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './page';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn(),
  getStudyTarget: vi.fn(),
  getExamWeightsSettings: vi.fn(),
  saveStudyTarget: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/shared/supabase', () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock('@/modules/auth', () => ({ LOGIN_ROUTE: '/login' }));
vi.mock('@/modules/settings', () => ({
  getStudyTarget: mocks.getStudyTarget,
  readSavedTheme: async () => 'light',
  readThemePreference: async () => 'system',
  saveStudyTarget: mocks.saveStudyTarget,
  StudyTargetForm: ({ action }: { action: unknown }) => (
    <form aria-label="Concurso-alvo" data-action={String(action === mocks.saveStudyTarget)} />
  ),
  AppearanceSection: () => <section aria-label="Aparência" />,
}));
vi.mock('@/modules/topics', () => ({
  getExamWeightsSettings: mocks.getExamWeightsSettings,
  ExamWeightsSection: ({
    settings,
    confirmRestore,
    restored,
  }: {
    settings: { active: unknown[]; inactive: unknown[] };
    confirmRestore: boolean;
    restored: boolean;
  }) =>
    settings.active.length === 0 && settings.inactive.length === 0 ? (
      <p>Nenhum concurso carregado.</p>
    ) : (
      <p
        data-testid="weights"
        data-confirm={String(confirmRestore)}
        data-restored={String(restored)}
      />
    ),
}));

const WEIGHTS = { active: [{}], inactive: [], summary: {} };
const STUDY = { target: {}, examOptions: [] };

async function renderPage(params: Record<string, string | string[] | undefined> = {}) {
  return render(await SettingsPage({ searchParams: Promise.resolve(params) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
  mocks.getExamWeightsSettings.mockResolvedValue({ ok: true, value: WEIGHTS });
  mocks.getStudyTarget.mockResolvedValue({ ok: true, value: STUDY });
});

describe('SettingsPage', () => {
  it('has one h1 and shows the weights, target and appearance sections', async () => {
    await renderPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Configurações');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Concursos e pesos' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Concurso-alvo' })).toBeInTheDocument();
    expect(screen.getByTestId('weights')).toHaveAttribute('data-confirm', 'false');
  });

  it('starts the page header with the h1, with no eyebrow or hgroup (CA-42)', async () => {
    const { container } = await renderPage();
    expect(container.querySelector('.gb-page-header')?.firstElementChild).toBe(
      screen.getByRole('heading', { level: 1 }),
    );
    expect(container.querySelector('hgroup, .gb-page-header__eyebrow')).toBeNull();
    expect(screen.queryByText('Preferências')).not.toBeInTheDocument();
  });

  it('passes the restore confirmation when the address has ?confirm=restore', async () => {
    await renderPage({ confirm: 'restore' });
    expect(screen.getByTestId('weights')).toHaveAttribute('data-confirm', 'true');
  });

  it('hands the study target form the Server Action itself (works without JavaScript)', async () => {
    await renderPage();
    expect(screen.getByRole('form', { name: 'Concurso-alvo' })).toHaveAttribute(
      'data-action',
      'true',
    );
  });

  it('CA-28 — passes ?restored=1 on to the weights section, and nothing else', async () => {
    await renderPage({ restored: '1' });
    expect(screen.getByTestId('weights')).toHaveAttribute('data-restored', 'true');
    cleanup();
    await renderPage({ restored: 'yes' });
    expect(screen.getByTestId('weights')).toHaveAttribute('data-restored', 'false');
  });

  it('ignores any other value of confirm', async () => {
    await renderPage({ confirm: 'yes' });
    expect(screen.getByTestId('weights')).toHaveAttribute('data-confirm', 'false');
  });

  it('shows an error with a retry link when the weights fail to load', async () => {
    mocks.getExamWeightsSettings.mockResolvedValue({ ok: false });
    await renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível carregar as configurações.',
    );
    expect(screen.getByRole('link', { name: 'Tentar de novo' })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(screen.queryByTestId('weights')).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the same error when the study target fails to load', async () => {
    mocks.getStudyTarget.mockResolvedValue({ ok: false });
    await renderPage();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Concurso-alvo' })).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no exams', async () => {
    mocks.getExamWeightsSettings.mockResolvedValue({
      ok: true,
      value: { active: [], inactive: [], summary: {} },
    });
    await renderPage();
    expect(screen.getByText('Nenhum concurso carregado.')).toBeInTheDocument();
  });

  it('redirects to the login without a session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
    await expect(SettingsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(mocks.redirect).toHaveBeenCalledWith('/login');
  });
});
