import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly heading: Locator;
  readonly emailField: Locator;
  readonly passwordField: Locator;
  readonly submitButton: Locator;
  /** Next's route announcer also has role=alert, so the notice is looked up inside main only. */
  readonly notice: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Entrar' });
    this.emailField = page.getByLabel('E-mail');
    this.passwordField = page.getByLabel('Senha');
    this.submitButton = page.getByRole('button', { name: /^(Entrar|Entrando…)$/ });
    this.notice = page.getByRole('main').getByRole('alert');
  }

  async open(next?: string) {
    const path = next === undefined ? '/login' : `/login?next=${encodeURIComponent(next)}`;
    return this.page.goto(path);
  }

  async login(email: string, password: string) {
    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.submitButton.click();
  }
}
