import { expect, test } from '@playwright/test';
import { TEST_USER } from './data/test-user.ts';
import { hasFocusIndicator } from './support/focus.ts';
import {
  createDisposableUser,
  deleteDisposableUser,
  type DisposableUser,
} from './support/users.ts';
import { HomePage } from './pages/HomePage.ts';
import { LoginPage } from './pages/LoginPage.ts';

const NO_SESSION = { cookies: [], origins: [] };

function nextParam(url: string): string | null {
  return new URL(url).searchParams.get('next');
}

test.describe('Journey 1 — login without a session', () => {
  test.use({ storageState: NO_SESSION });

  test('CA-12 — without a session, / redirects to /login?next=/ without rendering protected content', async ({
    page,
  }) => {
    const response = await page.request.get('/', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toBe('/login?next=%2F');
    expect(await response.text()).not.toContain('Início');

    await page.goto('/');
    await expect(page).toHaveURL(/\/login\?/);
    expect(nextParam(page.url())).toBe('/');
    await expect(new LoginPage(page).heading).toBeVisible();
    await expect(new HomePage(page).navigation).toHaveCount(0);
  });

  test('CA-12 — without a session, any other route redirects keeping path and query', async ({
    page,
  }) => {
    const requested = '/any/route?tab=2';
    const response = await page.request.get(requested, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(await response.text()).not.toContain('Página não encontrada');

    await page.goto(requested);
    await expect(page).toHaveURL(/\/login\?/);
    expect(nextParam(page.url())).toBe(requested);
    await expect(new LoginPage(page).heading).toBeVisible();
  });

  test('CA-13 — valid credentials return to the requested route with the shell visible', async ({
    page,
  }) => {
    await page.goto('/?origin=e2e');
    await expect(page).toHaveURL(/\/login\?/);

    await new LoginPage(page).login(TEST_USER.email, TEST_USER.password);

    await expect(page).toHaveURL('/?origin=e2e');
    const home = new HomePage(page);
    await expect(home.heading).toBeVisible();
    await home.openMenuIfPresent();
    await expect(home.homeLink).toHaveAttribute('aria-current', 'page');
    await expect(home.logoutButton).toBeVisible();
  });

  test('CA-13 — valid credentials without "next" go to the home page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    await loginPage.login(TEST_USER.email, TEST_USER.password);

    await expect(page).toHaveURL('/');
    await expect(new HomePage(page).heading).toBeVisible();
  });

  for (const scenario of [
    { name: 'wrong password', email: TEST_USER.email, password: 'wrong-password' },
    { name: 'unknown e-mail', email: 'nobody@gabarita.local', password: TEST_USER.password },
  ]) {
    test(`CA-15 — ${scenario.name}: generic message, e-mail kept, password cleared and focus on the notice`, async ({
      page,
    }) => {
      const loginPage = new LoginPage(page);
      await loginPage.open();

      await loginPage.login(scenario.email, scenario.password);

      await expect(loginPage.notice).toHaveText('E-mail ou senha incorretos.');
      await expect(loginPage.notice).toBeFocused();
      await expect(loginPage.emailField).toHaveValue(scenario.email);
      await expect(loginPage.passwordField).toHaveValue('');
      await expect(page).toHaveURL('/login');
      const stillAnonymous = await page.request.get('/', { maxRedirects: 0 });
      expect(stillAnonymous.status()).toBe(307);
    });
  }

  test('CA-42 — the form starts with the h1 "Entrar", without the "Acesso" eyebrow or an hgroup', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await expect(loginPage.heading).toBeVisible();

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const first = loginPage.form.locator(':scope > *').first();
    expect(await first.evaluate((element) => element.tagName)).toBe('H1');
    await expect(first).toHaveText('Entrar');
    await expect(
      loginPage.form.locator('hgroup, .gb-eyebrow, .gb-page-header__eyebrow'),
    ).toHaveCount(0);
    await expect(page.getByText('Acesso', { exact: true })).toHaveCount(0);
  });

  test('CA-42 — from 1024 px the brand panel keeps the "Analista Judiciário" line', async ({
    page,
  }) => {
    test.skip(test.info().project.name === 'mobile', 'sizes the viewport itself, in desktop');
    await page.setViewportSize({ width: 1280, height: 800 });
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await expect(loginPage.heading).toBeVisible();

    await expect(loginPage.brandLine).toBeVisible();
  });

  test('CA-22 — logs in with the keyboard only, with visible focus on every control', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await expect(loginPage.heading).toBeVisible();

    // Controls before the form may change over time; tab until the e-mail field.
    for (let presses = 0; presses < 10; presses += 1) {
      await page.keyboard.press('Tab');
      if (await loginPage.emailField.evaluate((field) => field === document.activeElement)) break;
    }
    await expect(loginPage.emailField).toBeFocused();
    expect(await hasFocusIndicator(loginPage.emailField)).toBe(true);
    await page.keyboard.type(TEST_USER.email);

    await page.keyboard.press('Tab');
    await expect(loginPage.passwordField).toBeFocused();
    expect(await hasFocusIndicator(loginPage.passwordField)).toBe(true);
    await page.keyboard.type(TEST_USER.password);

    await page.keyboard.press('Tab');
    await expect(loginPage.submitButton).toBeFocused();
    expect(await hasFocusIndicator(loginPage.submitButton)).toBe(true);

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/');
    await expect(new HomePage(page).heading).toBeVisible();
  });
});

test.describe('Journey 1 — logged-in user', () => {
  test('CA-21 — when logged in, /login redirects to the home page', async ({ page }) => {
    await new LoginPage(page).open();

    await expect(page).toHaveURL('/');
    await expect(new HomePage(page).heading).toBeVisible();
  });
});

test.describe('Journey 1 — logout', () => {
  test.use({ storageState: NO_SESSION });

  let user: DisposableUser;

  test.beforeEach(async () => {
    user = await createDisposableUser();
  });

  test.afterEach(async () => {
    await deleteDisposableUser(user);
  });

  test('CA-20 — "Sair" ends the session; going back or opening / leads to /login', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(user.email, user.password);
    const home = new HomePage(page);
    await expect(home.heading).toBeVisible();

    await home.logout();

    await expect(loginPage.heading).toBeVisible();
    const afterLogout = await page.request.get('/', { maxRedirects: 0 });
    expect(afterLogout.status()).toBe(307);

    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(home.heading).toHaveCount(0);

    await home.open();
    await expect(page).toHaveURL(/\/login\?/);
    await expect(home.heading).toHaveCount(0);
  });

  test('CA-20 — "Sair" on one device keeps the session on another device', async ({ browser }) => {
    const devices = [await browser.newContext(), await browser.newContext()];
    const [thisDevice, otherDevice] = await Promise.all(
      devices.map((context) => context.newPage()),
    );
    for (const devicePage of [thisDevice, otherDevice]) {
      if (!devicePage) throw new Error('Could not open a browser page.');
      const loginPage = new LoginPage(devicePage);
      await loginPage.open();
      await loginPage.login(user.email, user.password);
      await expect(new HomePage(devicePage).heading).toBeVisible();
    }
    if (!thisDevice || !otherDevice) throw new Error('Could not open a browser page.');

    await new HomePage(thisDevice).logout();

    const otherHome = new HomePage(otherDevice);
    await otherHome.open();
    await expect(otherDevice).toHaveURL(/\/$/);
    await expect(otherHome.heading).toBeVisible();
    await Promise.all(devices.map((context) => context.close()));
  });
});
