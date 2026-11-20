import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { TEST_USER } from './data/test-user.ts';
import { expectNoSeriousA11yViolations } from './support/axe.ts';
import { scrollWidth, smallTouchTargets } from './support/layout.ts';
import { BASE_URL, SESSION_FILE } from './support/session.ts';
import {
  readThemeCookie,
  readThemeFromDatabase,
  setThemeCookie,
  setThemeInDatabase,
  themeInServerHtml,
  type ThemePreference,
} from './support/theme.ts';
import {
  createDisposableUser,
  deleteDisposableUser,
  type DisposableUser,
} from './support/users.ts';
import { HomePage } from './pages/HomePage.ts';
import { LoginPage } from './pages/LoginPage.ts';
import { SettingsPage, THEME_LABELS } from './pages/SettingsPage.ts';

const NO_SESSION = { cookies: [], origins: [] };
const MISSING_ROUTE = '/route-that-does-not-exist';

// --paper from design/tokens.json in each theme.
const PAPER_BACKGROUND = { light: 'rgb(252, 252, 250)', dark: 'rgb(18, 23, 51)' } as const;

function expectedAttribute(theme: ThemePreference): string | null {
  return theme === 'system' ? null : theme;
}

async function expectHtmlTheme(page: Page, theme: ThemePreference) {
  const html = page.locator('html');
  if (theme === 'system') await expect(html).not.toHaveAttribute('data-theme');
  else await expect(html).toHaveAttribute('data-theme', theme);
}

async function backgroundColor(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

/** Reloads and returns the data-theme that came in the server HTML, before hydration. */
async function themeAfterReload(page: Page): Promise<string | null> {
  const response = await page.reload();
  if (!response) throw new Error('Reload returned no document response.');
  return themeInServerHtml(await response.text());
}

/** A second browser context with the current project's device settings. */
async function newDeviceContext(
  browser: Browser,
  testInfo: TestInfo,
  storageState: BrowserContextOptions['storageState'],
): Promise<BrowserContext> {
  const { viewport, isMobile, hasTouch, deviceScaleFactor, userAgent, colorScheme, locale } =
    testInfo.project.use;
  return browser.newContext({
    baseURL: BASE_URL,
    storageState,
    viewport,
    isMobile,
    hasTouch,
    deviceScaleFactor,
    userAgent,
    colorScheme,
    locale,
  });
}

/** Records, in every document of the page, each value data-theme takes on <html>. */
async function recordThemeChanges(page: Page) {
  await page.addInitScript(() => {
    const values: (string | null)[] = [];
    Object.assign(window, { themeChanges: values });
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.target === document.documentElement) {
          values.push(document.documentElement.getAttribute('data-theme'));
        }
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-theme'] });
  });
}

async function recordedThemeChanges(page: Page): Promise<unknown[]> {
  const values: unknown = await page.evaluate(() => Reflect.get(window, 'themeChanges'));
  return Array.isArray(values) ? values : [];
}

test.describe('Journey 7 — theme without a session', () => {
  test.use({ storageState: NO_SESSION });

  for (const scheme of ['dark', 'light'] as const) {
    test(`CA-24 — ${scheme} system scheme, no cookie: /login follows the system without data-theme`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });

      const response = await new LoginPage(page).open();

      expect(response).not.toBeNull();
      expect(themeInServerHtml((await response?.text()) ?? '')).toBeNull();
      await expect(page.locator('html')).not.toHaveAttribute('data-theme');
      expect(await backgroundColor(page)).toBe(PAPER_BACKGROUND[scheme]);
    });
  }
});

test.describe('Journey 7 — theme toggle', () => {
  test.afterEach(async () => {
    await setThemeInDatabase('system');
  });

  for (const scenario of [
    { initial: 'system', chosen: 'dark' },
    { initial: 'system', chosen: 'light' },
    { initial: 'dark', chosen: 'system' },
  ] as const) {
    test(`CA-25 — choosing "${scenario.chosen}" in Configurações saves database and cookie, marks the option and persists without flashing`, async ({
      page,
    }) => {
      await setThemeInDatabase(scenario.initial);
      const home = new HomePage(page);
      const settings = new SettingsPage(page);
      await home.open();
      await expectHtmlTheme(page, scenario.initial);
      // ADR-012: the shell has no toggle; the theme is chosen in Settings > Aparência.
      await expect(home.heading).toBeVisible();
      await expect(home.themeGroup).toHaveCount(0);

      await home.chooseTheme(scenario.chosen);

      await expect(page).toHaveURL('/settings');
      await expectHtmlTheme(page, scenario.chosen);
      for (const other of ['system', 'light', 'dark'] as const) {
        if (other !== scenario.chosen) {
          await expect(settings.themeOption(THEME_LABELS[other])).toHaveAttribute(
            'aria-pressed',
            'false',
          );
        }
      }
      expect(await readThemeFromDatabase()).toBe(scenario.chosen);
      expect(await readThemeCookie(page.context())).toBe(scenario.chosen);

      expect(await themeAfterReload(page)).toBe(expectedAttribute(scenario.chosen));
      await expectHtmlTheme(page, scenario.chosen);
      await expect(settings.themeOption(THEME_LABELS[scenario.chosen])).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  }
});

test.describe('Journey 7 — accessibility in both themes', () => {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`${theme} theme`, () => {
      test.beforeEach(async () => {
        await setThemeInDatabase(theme);
      });

      test.afterEach(async () => {
        await setThemeInDatabase('system');
      });

      test(`CA-27 — /login in the ${theme} theme has no serious or critical violations`, async ({
        browser,
      }, testInfo) => {
        const context = await newDeviceContext(browser, testInfo, NO_SESSION);
        await setThemeCookie(context, theme);
        const page = await context.newPage();
        const loginPage = new LoginPage(page);

        await loginPage.open();
        await expect(loginPage.heading).toBeVisible();
        await expectHtmlTheme(page, theme);
        await expectNoSeriousA11yViolations(page);

        await loginPage.login(TEST_USER.email, 'wrong-password');
        await expect(loginPage.notice).toBeVisible();
        await expectNoSeriousA11yViolations(page);
        await context.close();
      });

      test(`CA-27 — home in the ${theme} theme has no serious or critical violations`, async ({
        page,
      }) => {
        const home = new HomePage(page);
        await home.open();
        await expect(home.heading).toBeVisible();
        await expectHtmlTheme(page, theme);
        await expectNoSeriousA11yViolations(page);

        await home.openMenuIfPresent();
        await expectNoSeriousA11yViolations(page);
      });

      test(`CA-27 — Configurações in the ${theme} theme (current item on ink, toggle, close buttons) has no serious or critical violations`, async ({
        page,
      }) => {
        const settings = new SettingsPage(page);
        await settings.open();
        await expect(settings.heading).toBeVisible();
        await expectHtmlTheme(page, theme);
        await expectNoSeriousA11yViolations(page);

        await settings.openMenuIfPresent();
        await expect(settings.settingsLink()).toHaveAttribute('aria-current', 'page');
        await expectNoSeriousA11yViolations(page);
      });

      test(`CA-27 — 404 in the ${theme} theme has no serious or critical violations`, async ({
        page,
      }) => {
        await page.goto(MISSING_ROUTE);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada');
        await expectHtmlTheme(page, theme);
        await expectNoSeriousA11yViolations(page);
      });
    });
  }
});

test.describe('Journey 7 — mobile (360 px)', () => {
  test.skip(({ isMobile }) => !isMobile, 'CA-28 runs in the mobile project');

  test('CA-28 — /login has no horizontal scroll and 44 px touch targets', async ({
    browser,
  }, testInfo) => {
    const context = await newDeviceContext(browser, testInfo, NO_SESSION);
    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await expect(loginPage.heading).toBeVisible();

    expect(page.viewportSize()?.width).toBe(360);
    expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
    expect(await smallTouchTargets(page)).toEqual([]);
    await context.close();
  });

  test('CA-28 — home: the menu reaches navigation, "Configurações" and "Sair" without horizontal scroll and has no theme toggle', async ({
    page,
  }) => {
    const home = new HomePage(page);
    await home.open();
    await expect(home.heading).toBeVisible();
    expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
    await expect(home.menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(home.homeLink).toBeHidden();

    await home.openMenuIfPresent();

    for (const target of [home.homeLink, home.settingsLink, home.logoutButton]) {
      await expect(target).toBeInViewport();
    }
    await expect(home.themeGroup).toHaveCount(0);
    await expect(home.homeLink).toHaveAttribute('aria-current', 'page');
    expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
    expect(await smallTouchTargets(page)).toEqual([]);

    await home.homeLink.focus();
    await page.keyboard.press('Escape');
    await expect(home.menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(home.menuButton).toBeFocused();
    await expect(home.homeLink).toBeHidden();
  });

  test('CA-28 — the skip link is the first focusable element and is 44 px tall when focused', async ({
    page,
  }) => {
    const home = new HomePage(page);
    await home.open();
    await expect(home.heading).toBeVisible();

    await page.keyboard.press('Tab');

    await expect(home.skipLink).toBeFocused();
    await expect(home.skipLink).toHaveAttribute('href', '#content');
    const box = await home.skipLink.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('CA-28 — 404 has no horizontal scroll and 44 px touch targets', async ({ page }) => {
    await page.goto(MISSING_ROUTE);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada');

    expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
    expect(await smallTouchTargets(page)).toEqual([]);
  });
});

test.describe('Journey 7 — 404 page', () => {
  test('CA-31 — a missing route with a session shows the Portuguese 404 with a link home', async ({
    page,
  }) => {
    const response = await page.goto(MISSING_ROUTE);

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await page.getByRole('link', { name: 'Voltar ao início' }).click();
    await expect(page).toHaveURL('/');
    await expect(new HomePage(page).heading).toBeVisible();
  });
});

test.describe('Journey 7 — saved theme across devices', () => {
  test.beforeEach(async () => {
    await setThemeInDatabase('system');
  });

  test.afterEach(async () => {
    await setThemeInDatabase('system');
  });

  test.describe('browser without a session', () => {
    test.use({ storageState: NO_SESSION });

    test('CA-35 — with "dark" saved, the first page after login is already dark and the cookie becomes dark', async ({
      page,
    }) => {
      await setThemeInDatabase('dark');
      await recordThemeChanges(page);
      const loginPage = new LoginPage(page);
      await loginPage.open();
      await expect(page.locator('html')).not.toHaveAttribute('data-theme');
      expect(await readThemeCookie(page.context())).toBeUndefined();

      await loginPage.login(TEST_USER.email, TEST_USER.password);

      await expect(page).toHaveURL('/');
      await expect(new HomePage(page).heading).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      // Whether by client navigation or a new document, <html> never goes through another theme.
      for (const value of await recordedThemeChanges(page)) expect(value).toBe('dark');
      expect(await readThemeCookie(page.context())).toBe('dark');
      expect(await themeAfterReload(page)).toBe('dark');
    });
  });

  test('CA-36 — a theme changed on another device comes from the server on the next full load', async ({
    page,
    browser,
  }, testInfo) => {
    const otherDevice = await newDeviceContext(browser, testInfo, SESSION_FILE);
    const otherPage = await otherDevice.newPage();
    const otherHome = new HomePage(otherPage);
    const otherSettings = new SettingsPage(otherPage);
    await otherHome.open();
    await expect(otherHome.heading).toBeVisible();

    const home = new HomePage(page);
    await home.open();
    await home.chooseTheme('dark');
    expect(await readThemeFromDatabase()).toBe('dark');
    await setThemeCookie(otherDevice, 'light');

    const response = await otherHome.open();

    expect(response).not.toBeNull();
    expect(themeInServerHtml((await response?.text()) ?? '')).toBe('dark');
    await expect(otherPage.locator('html')).toHaveAttribute('data-theme', 'dark');
    await otherSettings.open();
    await expect(otherSettings.themeOption('Escuro')).toHaveAttribute('aria-pressed', 'true');
    expect(await readThemeCookie(otherDevice)).toBe('dark');
    await otherDevice.close();
  });
});

test.describe('Journey 7 — theme after logout', () => {
  test.use({ storageState: NO_SESSION });

  let user: DisposableUser;

  test.beforeEach(async () => {
    user = await createDisposableUser();
  });

  test.afterEach(async () => {
    await deleteDisposableUser(user);
  });

  test('CA-37 — a user who chose "Escuro" and logged out sees /login in the dark theme', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(user.email, user.password);
    const home = new HomePage(page);
    await home.chooseTheme('dark');

    await home.logout();

    await expect(loginPage.heading).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await readThemeCookie(page.context())).toBe('dark');
    expect(await themeAfterReload(page)).toBe('dark');
    expect(await backgroundColor(page)).toBe(PAPER_BACKGROUND.dark);
  });
});
