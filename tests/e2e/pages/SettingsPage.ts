import { expect, type Locator, type Page } from '@playwright/test';
import type { ThemePreference } from '../support/theme.ts';

export const THEME_LABELS = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
} as const satisfies Record<ThemePreference, string>;

export type WeightRowExpectation = { court: string; short: string; year: string; standard: string };

/** The 14 active exams of the seed, in the order of the default weights (SPEC-005 CA-20). */
export const DEFAULT_WEIGHT_ROWS: ReadonlyArray<WeightRowExpectation> = [
  { court: 'TRT-3 (MG)', short: 'TRT-3', year: '2022', standard: '28%' },
  { court: 'TRF-6 (MG)', short: 'TRF-6', year: '2024', standard: '18%' },
  { court: 'TJMG', short: 'TJMG', year: '2022', standard: '14%' },
  { court: 'TRF-2 (RJ/ES)', short: 'TRF-2', year: '2024', standard: '5%' },
  { court: 'TRT-1 (RJ)', short: 'TRT-1', year: '2025', standard: '5%' },
  { court: 'TRT-2 (SP)', short: 'TRT-2', year: '2025', standard: '5%' },
  { court: 'TRT-15 (Campinas)', short: 'TRT-15', year: '2024', standard: '5%' },
  { court: 'TRF-4 (RS/SC/PR)', short: 'TRF-4', year: '2025', standard: '4%' },
  { court: 'TRT-4 (RS)', short: 'TRT-4', year: '2026', standard: '4%' },
  { court: 'TRT-12 (SC)', short: 'TRT-12', year: '2023', standard: '4%' },
  { court: 'TJRJ', short: 'TJRJ', year: '2025', standard: '2,5%' },
  { court: 'TJSP', short: 'TJSP', year: '2025', standard: '2,5%' },
  { court: 'TJRS', short: 'TJRS', year: '2023', standard: '1,5%' },
  { court: 'TJSC', short: 'TJSC', year: '2026', standard: '1,5%' },
];

/** What the S1 set shows in the fields (SPEC-005 CA-23), by exam court. */
export const S1_FIELD_VALUES: Readonly<Record<string, string>> = {
  'TRT-2 (SP)': '40',
  'TRT-3 (MG)': '17,7',
  'TRF-6 (MG)': '11,4',
  TJMG: '8,8',
  'TRF-2 (RJ/ES)': '3,2',
  'TRT-1 (RJ)': '3,2',
  'TRT-15 (Campinas)': '3,2',
  'TRF-4 (RS/SC/PR)': '2,5',
  'TRT-4 (RS)': '2,5',
  'TRT-12 (SC)': '2,5',
  TJRJ: '1,6',
  TJSP: '1,6',
  TJRS: '0,9',
  TJSC: '0,9',
};

export class SettingsPage {
  readonly heading: Locator;
  readonly main: Locator;
  /** The page header: the h1 comes first, with no eyebrow or hgroup (ADR-013, CA-42). */
  readonly pageHeader: Locator;
  readonly sectionHeadings: Locator;
  readonly menuButton: Locator;
  readonly preferencesNavigation: Locator;
  readonly weightsTable: Locator;
  readonly total: Locator;
  /** Icon and sentence about the total ("Soma correta", "Faltam 3 pontos"); below the table, not in it. */
  readonly totalStatus: Locator;
  /** "A soma dos pesos deve ser 100%." as a tooltip on the blocked "Salvar" (hover and focus). */
  readonly blockedHint: Locator;
  /** The same sentence as plain help text under the buttons, for screens without hover. */
  readonly blockedHelp: Locator;
  readonly saveButton: Locator;
  readonly rebalanceButton: Locator;
  readonly restoreLink: Locator;
  readonly confirmQuestion: Locator;
  readonly confirmButton: Locator;
  readonly cancelLink: Locator;
  readonly errorSummary: Locator;
  readonly savedStatus: Locator;
  readonly targetSelect: Locator;
  readonly noticeCheckbox: Locator;
  readonly saveTargetButton: Locator;
  readonly themeGroup: Locator;

  constructor(readonly page: Page) {
    this.main = page.getByRole('main');
    this.pageHeader = page.locator('header.gb-page-header');
    this.heading = page.getByRole('heading', { level: 1, name: 'Configurações' });
    this.sectionHeadings = this.main.getByRole('heading', { level: 2 });
    this.menuButton = page.getByRole('button', { name: 'Menu' });
    this.preferencesNavigation = page.getByRole('navigation', { name: 'Preferências' });
    this.weightsTable = page.getByRole('table', { name: 'Pesos dos concursos' });
    this.total = this.weightsTable.getByRole('row', { name: /^Total/ });
    this.totalStatus = page.locator('.gb-weight-table__live');
    this.blockedHint = this.main.getByRole('tooltip');
    this.blockedHelp = this.main.locator('.gb-form__help');
    this.saveButton = page.getByRole('button', { name: 'Salvar', exact: true });
    this.rebalanceButton = page.getByRole('button', { name: 'Ajustar os demais e salvar' });
    this.restoreLink = page.getByRole('link', { name: 'Restaurar padrão' });
    this.confirmQuestion = page.getByText(
      'Restaurar os pesos padrão? Seus pesos personalizados serão apagados.',
    );
    this.confirmButton = page.getByRole('button', { name: 'Restaurar pesos padrão' });
    this.cancelLink = page.getByRole('link', { name: 'Cancelar' });
    this.errorSummary = this.main.getByRole('alert');
    this.savedStatus = this.main.getByRole('status');
    this.targetSelect = page.getByLabel('Concurso-alvo', { exact: true });
    this.noticeCheckbox = page.getByLabel('O edital do concurso-alvo foi publicado');
    this.saveTargetButton = page.getByRole('button', { name: 'Salvar concurso-alvo' });
    this.themeGroup = this.main.getByRole('group', { name: 'Tema' });
  }

  async open(search = '') {
    return this.page.goto(`/settings${search}`);
  }

  /** Below 1024 px the navigation lives inside the "Menu" button. */
  async openMenuIfPresent() {
    if (!(await this.menuButton.isVisible())) return;
    await expect(async () => {
      if ((await this.menuButton.getAttribute('aria-expanded')) !== 'true') {
        await this.menuButton.click();
      }
      await expect(this.menuButton).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 });
    }).toPass();
  }

  settingsLink(): Locator {
    return this.preferencesNavigation.getByRole('link', { name: 'Configurações' });
  }

  weightField(court: string): Locator {
    return this.page.getByRole('textbox', { name: `Peso do ${court}, em porcentagem` });
  }

  weightRows(): Locator {
    return this.weightsTable.locator('tbody').getByRole('row');
  }

  async expectHeaderStartsWithHeading() {
    const first = this.pageHeader.locator(':scope > *').first();
    expect(await first.evaluate((element) => element.tagName)).toBe('H1');
    await expect(
      this.pageHeader.locator('hgroup, .gb-eyebrow, .gb-page-header__eyebrow'),
    ).toHaveCount(0);
    await expect(this.pageHeader.getByText('Preferências')).toHaveCount(0);
  }

  /** Every notice has a close button (SPEC-005 § 5.4), except the restore question. */
  closeButton(scope: Locator): Locator {
    return scope.getByRole('button', { name: 'Fechar aviso' });
  }

  weightsTag(label: 'Pesos padrão' | 'Pesos personalizados'): Locator {
    return this.main.getByText(label, { exact: true });
  }

  /**
   * Types into a weight field and waits for the live total to show `expectedTotal`. A value typed
   * before hydration is discarded by React, so the fill is retried until the total reacts.
   */
  async enterWeight(court: string, value: string, expectedTotal: string | RegExp) {
    const field = this.weightField(court);
    await expect(async () => {
      await field.fill(value);
      await expect(this.total).toContainText(expectedTotal, { timeout: 1_000 });
    }).toPass();
  }

  themeOption(label: 'Sistema' | 'Claro' | 'Escuro', scope: Locator = this.themeGroup): Locator {
    return scope.getByRole('button', { name: label, exact: true });
  }
}
