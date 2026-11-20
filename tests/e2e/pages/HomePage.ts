import { expect, type Locator, type Page } from '@playwright/test';
import type { ThemePreference } from '../support/theme.ts';
import { SettingsPage, THEME_LABELS } from './SettingsPage.ts';

export class HomePage {
  readonly heading: Locator;
  readonly skipLink: Locator;
  readonly menuButton: Locator;
  readonly navigation: Locator;
  readonly homeLink: Locator;
  readonly settingsLink: Locator;
  /** The theme toggle lives only in Settings > Aparência (ADR-012); the shell must never have one. */
  readonly themeGroup: Locator;
  readonly logoutButton: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Início' });
    this.skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' });
    this.menuButton = page.getByRole('button', { name: 'Menu' });
    this.navigation = page.getByRole('navigation', { name: 'Principal' });
    this.homeLink = this.navigation.getByRole('link', { name: 'Início' });
    this.settingsLink = page
      .getByRole('navigation', { name: 'Preferências' })
      .getByRole('link', { name: 'Configurações' });
    this.themeGroup = page.getByRole('group', { name: 'Tema' });
    this.logoutButton = page.getByRole('button', { name: 'Sair' });
  }

  async open() {
    return this.page.goto('/');
  }

  /** On mobile the navigation and "Sair" live inside the menu; desktop has no button. */
  async openMenuIfPresent() {
    // Any page of the shell: wait for the page itself, whatever its title is.
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
    if (!(await this.menuButton.isVisible())) return;
    // A click before hydration does nothing; retry until React owns the button.
    await expect(async () => {
      if ((await this.menuButton.getAttribute('aria-expanded')) !== 'true') {
        await this.menuButton.click();
      }
      await expect(this.menuButton).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 });
    }).toPass();
  }

  async openSettings(): Promise<SettingsPage> {
    // The menu can still close once after the first render (e.g. right after login), so opening it
    // and clicking the link are retried together.
    await expect(async () => {
      await this.openMenuIfPresent();
      await this.settingsLink.click({ timeout: 2_000 });
    }).toPass();
    const settings = new SettingsPage(this.page);
    await expect(settings.heading).toBeVisible();
    return settings;
  }

  /** Goes to Configurações through the navigation and picks the theme in the Aparência section. */
  async chooseTheme(theme: ThemePreference) {
    const settings = await this.openSettings();
    const option = settings.themeOption(THEME_LABELS[theme]);
    // A click before hydration does nothing; retry until the toggle reacts.
    await expect(async () => {
      await option.click();
      await expect(option).toHaveAttribute('aria-pressed', 'true', { timeout: 1_000 });
    }).toPass();
  }

  async logout() {
    await this.openMenuIfPresent();
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }
}
