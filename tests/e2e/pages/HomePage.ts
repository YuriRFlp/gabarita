import { expect, type Locator, type Page } from '@playwright/test';
import type { ThemePreference } from '../support/theme.ts';

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Escuro',
};

export class HomePage {
  readonly heading: Locator;
  readonly skipLink: Locator;
  readonly menuButton: Locator;
  readonly navigation: Locator;
  readonly homeLink: Locator;
  readonly themeGroup: Locator;
  readonly logoutButton: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Início' });
    this.skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' });
    this.menuButton = page.getByRole('button', { name: 'Menu' });
    this.navigation = page.getByRole('navigation', { name: 'Principal' });
    this.homeLink = this.navigation.getByRole('link', { name: 'Início' });
    this.themeGroup = page.getByRole('group', { name: 'Tema' });
    this.logoutButton = page.getByRole('button', { name: 'Sair' });
  }

  async open() {
    return this.page.goto('/');
  }

  themeOption(theme: ThemePreference): Locator {
    return this.themeGroup.getByRole('button', { name: THEME_LABELS[theme], exact: true });
  }

  /** On mobile the navigation, theme toggle and "Sair" live inside the menu; desktop has no button. */
  async openMenuIfPresent() {
    await expect(this.heading).toBeVisible();
    if (!(await this.menuButton.isVisible())) return;
    // A click before hydration does nothing; retry until React owns the button.
    await expect(async () => {
      if ((await this.menuButton.getAttribute('aria-expanded')) !== 'true') {
        await this.menuButton.click();
      }
      await expect(this.menuButton).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 });
    }).toPass();
  }

  async chooseTheme(theme: ThemePreference) {
    await this.openMenuIfPresent();
    await this.themeOption(theme).click();
    await expect(this.themeOption(theme)).toHaveAttribute('aria-pressed', 'true');
  }

  async logout() {
    await this.openMenuIfPresent();
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }
}
