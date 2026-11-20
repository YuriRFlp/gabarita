import { expect, test as base, type Browser, type Page } from '@playwright/test';
import { clearWeights, readSettings, readWeights, S1_UNITS } from './data/exam-weights.ts';
import { seedStudyTarget, seedTheme, seedWeights } from './data/exam-weights.ts';
import { HomePage } from './pages/HomePage.ts';
import { LoginPage } from './pages/LoginPage.ts';
import { DEFAULT_WEIGHT_ROWS, S1_FIELD_VALUES, SettingsPage } from './pages/SettingsPage.ts';
import { TopicMapPage } from './pages/TopicMapPage.ts';
import { expectNoSeriousA11yViolations } from './support/axe.ts';
import { hasFocusIndicator } from './support/focus.ts';
import { scrollWidth, smallTouchTargets } from './support/layout.ts';
import {
  createDisposableUser,
  deleteDisposableUser,
  type DisposableUser,
} from './support/users.ts';

const NO_SESSION = { cookies: [], origins: [] };
const SUM_ERROR = 'A soma dos pesos precisa ser 100%. Agora está em 135%.';
const SAVED_MESSAGE = 'Pesos salvos. A prioridade dos assuntos já usa os novos pesos.';
const LEGISLATION = 'Legislação estadual de MG';
const NETWORKS = 'Redes de computadores';

type Fixtures = { user: DisposableUser; settings: SettingsPage };

// Every test gets its own user, logged in through the form: the shared test user keeps the default
// weights, so journey 8 passes in any order (SPEC-005 § 6).
const test = base.extend<Fixtures>({
  user: async ({}, provide) => {
    const user = await createDisposableUser();
    try {
      await provide(user);
    } finally {
      await clearWeights(user.id);
      await deleteDisposableUser(user);
    }
  },
  settings: async ({ page, user }, provide) => {
    const login = new LoginPage(page);
    await login.open();
    await login.login(user.email, user.password);
    await expect(new HomePage(page).heading).toBeVisible();
    await provide(new SettingsPage(page));
  },
});

async function expectDefaultTable(settings: SettingsPage) {
  await expect(settings.weightRows()).toHaveCount(DEFAULT_WEIGHT_ROWS.length);
  for (const [index, row] of DEFAULT_WEIGHT_ROWS.entries()) {
    const line = settings.weightRows().nth(index);
    await expect(line.getByRole('rowheader')).toContainText(row.short);
    await expect(line.getByRole('rowheader')).toContainText(row.year);
    await expect(line.getByRole('cell').first()).toHaveText(row.standard);
    await expect(settings.weightField(row.court)).toHaveValue(row.standard.replace('%', ''));
  }
}

async function expectS1Fields(settings: SettingsPage) {
  for (const [court, value] of Object.entries(S1_FIELD_VALUES)) {
    await expect(settings.weightField(court)).toHaveValue(value);
  }
}

const WEIGHTS_NOTICE_COOKIE = 'gb-weights-notice';
const DETAIL_PATH = '/topics/legislacao_mg';

async function weightsNoticeCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === WEIGHTS_NOTICE_COOKIE);
}

/**
 * Closes the weights notice and waits until this browser holds the cookie that remembers it. A click
 * before hydration does nothing, so it is retried; the reload that follows must not race the action.
 */
async function dismissWeightsNotice(page: Page, map: TopicMapPage, settings: SettingsPage) {
  await expect(map.weightsNotice).toBeVisible();
  await expect(async () => {
    if (await map.weightsNotice.count()) {
      await settings.closeButton(map.weightsNotice).click({ timeout: 1_000 });
    }
    await expect(map.weightsNotice).toHaveCount(0, { timeout: 1_000 });
  }).toPass();
  await expect.poll(async () => (await weightsNoticeCookie(page))?.value).toBeTruthy();
}

// Playwright gives each test a new browser context, so the dismissal cookie never leaks into another
// test; the tests below also run on their own disposable user.
test.use({ storageState: NO_SESSION });

async function plainContext(browser: Browser, baseURL: string | undefined, settings: SettingsPage) {
  return browser.newContext({
    baseURL,
    storageState: await settings.page.context().storageState(),
    javaScriptEnabled: false,
    locale: 'pt-BR',
  });
}

test.describe('Journey 9 — navigation and the default table', () => {
  test('CA-19 — "Configurações" in the sidebar footer opens /settings with the sections in order', async ({
    page,
    settings,
  }) => {
    await page.goto('/');
    await settings.openMenuIfPresent();
    await settings.settingsLink().click();

    await expect(page).toHaveURL('/settings');
    await expect(page).toHaveTitle(/Configurações/);
    await expect(settings.heading).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await settings.expectHeaderStartsWithHeading();
    await expect(settings.sectionHeadings).toHaveText(['Concursos e pesos', 'Aparência']);
    await expect(page.getByRole('heading', { name: 'Estudo' })).toHaveCount(0);
    await settings.openMenuIfPresent();
    const link = settings.settingsLink();
    await expect(link).toHaveAttribute('aria-current', 'page');
    // CA-40: the icon stays, there is no bubble, and the item has a background of its own.
    await expect(link.locator('svg[aria-hidden="true"]')).toHaveCount(1);
    await expect(link.locator('.gb-bubble')).toHaveCount(0);
    const principal = page.getByRole('navigation', { name: 'Principal' });
    await expect(principal.getByRole('link', { name: 'Início' })).not.toHaveAttribute(
      'aria-current',
    );
    await expect(principal.getByRole('link', { name: 'Mapa do edital' })).not.toHaveAttribute(
      'aria-current',
    );
    const current = await link.evaluate((el) => getComputedStyle(el).backgroundColor);
    const other = await principal
      .getByRole('link', { name: 'Início' })
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(current).not.toBe(other);
    expect(current).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('CA-20 — default weights: 14 exams in order, standard and field values, total 100%', async ({
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();

    await expectDefaultTable(settings);
    await expect(settings.total).toContainText('100%');
    await expect(settings.totalStatus).toContainText('Soma correta');
    await expect(settings.weightsTag('Pesos padrão')).toBeVisible();
    await expect(settings.restoreLink).toHaveCount(0);
  });

  test('CA-37 — a user with default weights sees no weights notice in the map or the detail', async ({
    page,
    settings,
  }) => {
    const map = new TopicMapPage(page);
    await settings.open();
    await expect(settings.heading).toBeVisible();

    await map.open();
    await expect(map.heading).toBeVisible();
    await expect(
      page.getByText(/Pesos personalizados em uso|Os pesos dos concursos ativos/),
    ).toHaveCount(0);
    await page.goto('/topics/legislacao_mg');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByText(/Pesos personalizados em uso|Os pesos dos concursos ativos/),
    ).toHaveCount(0);
  });
});

test.describe('Journey 9 — editing the weights', () => {
  test('CA-21 — the total follows what is typed, sits under the "Peso" column and nothing is saved', async ({
    user,
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    // The status is announced from below the table, not from inside its footer.
    await expect(settings.totalStatus).toHaveAttribute('aria-live', 'polite');
    await expect(settings.weightsTable.locator('[aria-live]')).toHaveCount(0);
    await expect(settings.weightsTable.locator('.gb-weight-table__live')).toHaveCount(0);
    await expect(settings.total.getByRole('cell')).toHaveCount(1);
    const totalBox = await settings.total.getByRole('cell').boundingBox();
    const fieldBox = await settings.weightRows().first().getByRole('cell').last().boundingBox();
    expect(totalBox).not.toBeNull();
    expect(fieldBox).not.toBeNull();
    expect(Math.abs((totalBox?.x ?? 0) - (fieldBox?.x ?? 1))).toBeLessThanOrEqual(1);

    await settings.enterWeight('TRT-2 (SP)', '40', '135%');
    await expect(settings.totalStatus).toContainText('35 pontos acima de 100%');
    await settings.enterWeight('TRT-2 (SP)', '2', '97%');
    await expect(settings.totalStatus).toContainText('Faltam 3 pontos');
    await settings.enterWeight('TRT-2 (SP)', 'abc', '—');
    await expect(settings.totalStatus).toContainText('Há valores inválidos');

    expect(await readWeights(user.id)).toEqual({});
  });

  test('CA-22 — a total of 135% blocks "Salvar" with a hint; "Ajustar os demais" stays enabled and nothing is saved', async ({
    page,
    user,
    isMobile,
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await expect(settings.saveButton).not.toHaveAttribute('aria-disabled');
    await expect(settings.blockedHint).toHaveCount(0);

    await settings.enterWeight('TRT-2 (SP)', '40', '135%');

    // aria-disabled (not disabled) keeps the button focusable so the hint is reachable by keyboard.
    await expect(settings.saveButton).toHaveAttribute('aria-disabled', 'true');
    await expect(settings.saveButton).not.toHaveAttribute('disabled');
    await expect(settings.rebalanceButton).toBeEnabled();
    await expect(settings.rebalanceButton).not.toHaveAttribute('aria-disabled');
    await settings.saveButton.focus();
    await expect(settings.saveButton).toBeFocused();
    if (isMobile) {
      // Without hover the same sentence is plain help text under the buttons.
      await expect(settings.blockedHelp).toHaveText('A soma dos pesos deve ser 100%.');
    } else {
      await expect(settings.blockedHint).toHaveText('A soma dos pesos deve ser 100%.');
      const describedBy = await settings.blockedHint.getAttribute('id');
      expect(describedBy).toBeTruthy();
      await expect(settings.saveButton).toHaveAttribute('aria-describedby', describedBy ?? '');
      await page.keyboard.press('Escape');
      await expect(settings.blockedHint).toBeHidden();
    }

    // Enter in a field goes through the default button, which is blocked: nothing is sent.
    await settings.weightField('TRT-2 (SP)').press('Enter');
    await expect(settings.errorSummary).toHaveCount(0);
    await expect(settings.weightField('TRT-2 (SP)')).toHaveValue('40');
    expect(await readWeights(user.id)).toEqual({});

    // Back to 100%: the button returns to normal and the hint goes away.
    await settings.enterWeight('TRT-2 (SP)', '5', '100%');
    await expect(settings.saveButton).not.toHaveAttribute('aria-disabled');
    await expect(settings.blockedHint).toHaveCount(0);
    await expect(settings.blockedHelp).toHaveCount(0);
  });

  test('CA-22 — without JavaScript the server still refuses 135%, shows the summary and keeps the values', async ({
    browser,
    baseURL,
    user,
    settings,
  }) => {
    test.skip(test.info().project.name === 'mobile', 'JavaScript is switched off on desktop only');
    const state = await settings.page.context().storageState();
    const context = await browser.newContext({
      baseURL,
      storageState: state,
      javaScriptEnabled: false,
      locale: 'pt-BR',
    });
    try {
      const plain = new SettingsPage(await context.newPage());
      await plain.open();
      await expect(plain.heading).toBeVisible();
      await plain.weightField('TRT-2 (SP)').fill('40');
      await plain.saveButton.click();

      await expect(plain.errorSummary).toHaveText(SUM_ERROR);
      await expect(plain.weightField('TRT-2 (SP)')).toHaveValue('40');
      expect(await readWeights(user.id)).toEqual({});
    } finally {
      await context.close();
    }
  });

  test('CA-23 — "Ajustar os demais e salvar" stores the S1 set and shows it', async ({
    user,
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await settings.enterWeight('TRT-2 (SP)', '40', '135%');

    await settings.rebalanceButton.click();

    await expect(settings.savedStatus).toContainText(SAVED_MESSAGE);
    await expect(
      settings.savedStatus.getByRole('link', { name: 'Ver o mapa do edital' }),
    ).toBeVisible();
    await expectS1Fields(settings);
    await expect(settings.total).toContainText('100%');
    await expect(settings.totalStatus).toContainText('Soma correta');
    await expect(settings.weightsTag('Pesos personalizados')).toBeVisible();
    await expect(settings.restoreLink).toBeVisible();
    expect(await readWeights(user.id)).toEqual(S1_UNITS);

    await settings.open();
    await expectS1Fields(settings);
  });

  test('Notices — the success notice closes with "Fechar aviso" and a new save shows it again', async ({
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await settings.enterWeight('TRT-2 (SP)', '40', '135%');
    await settings.rebalanceButton.click();
    await expect(settings.savedStatus).toContainText(SAVED_MESSAGE);

    await settings.closeButton(settings.savedStatus).click();
    await expect(settings.savedStatus).toHaveCount(0);

    await settings.enterWeight('TRT-2 (SP)', '30', '90%');
    await settings.rebalanceButton.click();
    await expect(settings.savedStatus).toContainText(SAVED_MESSAGE);
  });

  test('Notices — the error summary also has a close button and Esc on it closes the notice', async ({
    page,
    user,
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await settings.enterWeight('TRT-2 (SP)', '40', '135%');
    await settings.enterWeight('TRT-3 (MG)', '95', '202%');
    await settings.rebalanceButton.click();
    await expect(settings.errorSummary).toBeFocused();

    await settings.closeButton(settings.errorSummary).focus();
    await page.keyboard.press('Escape');

    await expect(settings.errorSummary).toHaveCount(0);
    await expect(page.locator('body')).not.toBeFocused();
    expect(await readWeights(user.id)).toEqual({});
  });

  test('CA-25 — changes that already add up to more than 100% are refused by "Ajustar os demais"', async ({
    user,
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await settings.enterWeight('TRT-2 (SP)', '40', '135%');
    await settings.enterWeight('TRT-3 (MG)', '95', '202%');

    await settings.rebalanceButton.click();

    await expect(settings.errorSummary).toHaveText(
      'Os pesos alterados já somam 135%, mais que 100%. Reduza algum deles.',
    );
    expect(await readWeights(user.id)).toEqual({});
  });

  test('CA-32 — a field refused by the server is marked and described and the summary takes focus', async ({
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await settings.enterWeight('TRT-2 (SP)', 'abc', '—');

    // "Salvar" is blocked while a field is invalid, so the server answer comes from the other button.
    await settings.rebalanceButton.click();

    const field = settings.weightField('TRT-2 (SP)');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    const describedBy = await field.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(settings.page.locator(`[id="${describedBy}"]`)).toContainText(
      'Use um número de 0 a 100, com no máximo uma casa decimal (ex.: 2,5).',
    );
    await expect(settings.errorSummary).toBeFocused();
    await expect(field).toHaveValue('abc');
  });

  test('CA-32 — Enter in a field saves when the total is 100%', async ({ user, settings }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await settings.enterWeight('TRT-2 (SP)', '4', '99%');
    await settings.enterWeight('TRT-1 (RJ)', '6', '100%');

    await settings.weightField('TRT-1 (RJ)').press('Enter');

    await expect(settings.savedStatus).toContainText(SAVED_MESSAGE);
    expect(await readWeights(user.id)).toMatchObject({ trt2: 40, trt1: 60 });
    await expect(settings.weightsTag('Pesos personalizados')).toBeVisible();
  });
});

test.describe('Journey 9 — restoring the default weights', () => {
  test('CA-28 — "Restaurar padrão" asks first; cancelling keeps the weights, confirming restores them', async ({
    page,
    user,
    settings,
  }) => {
    await seedWeights(user.id);
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await expect(settings.weightsTag('Pesos personalizados')).toBeVisible();

    await settings.restoreLink.click();
    await expect(page).toHaveURL(/\/settings\?confirm=restore/);
    await expect(settings.confirmQuestion).toBeVisible();
    await expect(
      settings.confirmQuestion.locator('xpath=ancestor::*[@tabindex="-1"][1]'),
    ).toBeFocused();
    await expect(settings.confirmButton).toBeVisible();
    // The question labels the buttons below it, so it is the one notice without a close button.
    await expect(
      settings.closeButton(
        settings.confirmQuestion.locator('xpath=ancestor::*[@tabindex="-1"][1]'),
      ),
    ).toHaveCount(0);

    await settings.cancelLink.click();
    await expect(page).not.toHaveURL(/confirm=restore/);
    await expect(settings.confirmQuestion).toHaveCount(0);
    await expect(settings.weightsTag('Pesos personalizados')).toBeVisible();
    expect(await readWeights(user.id)).toEqual(S1_UNITS);

    await settings.restoreLink.click();
    await expect(settings.confirmButton).toBeVisible();
    await settings.confirmButton.click();

    await expect(settings.savedStatus).toHaveText(/Pesos padrão restaurados\./);
    await expect(page).toHaveURL(/\/settings(#exam-weights)?$/);
    await expect(page).not.toHaveURL(/confirm=restore/);
    await expect(settings.weightsTag('Pesos padrão')).toBeVisible();
    await expect(settings.restoreLink).toHaveCount(0);
    await expectDefaultTable(settings);
    expect(await readWeights(user.id)).toEqual({});
  });

  test('CA-28 — without JavaScript confirming restores, lands on ?restored=1 and shows the message', async ({
    browser,
    baseURL,
    user,
    settings,
  }) => {
    test.skip(test.info().project.name === 'mobile', 'JavaScript is switched off on desktop only');
    await seedWeights(user.id);
    const context = await plainContext(browser, baseURL, settings);
    try {
      const plain = new SettingsPage(await context.newPage());
      await plain.open();
      await expect(plain.weightsTag('Pesos personalizados')).toBeVisible();
      await expect(plain.confirmQuestion).toHaveCount(0);
      await plain.restoreLink.click();
      await expect(plain.confirmButton).toBeVisible();
      await plain.confirmButton.click();

      await expect(plain.page).toHaveURL(/\/settings\?restored=1#exam-weights$/);
      await expect(plain.savedStatus).toHaveText(/Pesos padrão restaurados\./);
      await expect(plain.confirmQuestion).toHaveCount(0);
      await expect(plain.weightsTag('Pesos padrão')).toBeVisible();
      expect(await readWeights(user.id)).toEqual({});
    } finally {
      await context.close();
    }
  });

  test('CA-28 — saving and then restoring leaves only the restore message visible', async ({
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await settings.enterWeight('TRT-2 (SP)', '40', '135%');
    await settings.rebalanceButton.click();
    await expect(settings.savedStatus).toContainText(SAVED_MESSAGE);

    await settings.restoreLink.click();
    await expect(settings.confirmButton).toBeVisible();
    await settings.confirmButton.click();

    await expect(settings.weightsTag('Pesos padrão')).toBeVisible();
    await expect(settings.savedStatus).toHaveCount(1);
    await expect(settings.savedStatus).toHaveText(/Pesos padrão restaurados\./);
    await expect(settings.main.getByText(SAVED_MESSAGE)).toHaveCount(0);
  });
});

test.describe('Journey 9 — target exam and appearance', () => {
  test('CA-29 — without JavaScript the target exam form saves and the choice persists', async ({
    browser,
    baseURL,
    user,
    settings,
  }) => {
    test.skip(test.info().project.name === 'mobile', 'JavaScript is switched off on desktop only');
    const context = await plainContext(browser, baseURL, settings);
    try {
      const plain = new SettingsPage(await context.newPage());
      await plain.open();
      await expect(plain.heading).toBeVisible();
      await plain.targetSelect.selectOption('trt2');
      await plain.saveTargetButton.click();

      await expect(plain.savedStatus).toHaveText(/Concurso-alvo salvo\./);
      await plain.open();
      await expect(plain.targetSelect).toHaveValue('trt2');
      expect(await readSettings(user.id)).toMatchObject({ target_exam_id: 'trt2' });
      expect(await readWeights(user.id)).toEqual({});
    } finally {
      await context.close();
    }
  });

  test('CA-29 — the target exam and the published notice persist and change no weight', async ({
    user,
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await expect(settings.targetSelect).toHaveValue('');
    await expect(settings.noticeCheckbox).toBeDisabled();
    await expect(
      settings.page.getByText(
        'O plano do dia só inclui assuntos pós-edital depois que o edital do concurso-alvo for publicado.',
      ),
    ).toBeVisible();

    await settings.targetSelect.selectOption('trt2');
    await expect(settings.noticeCheckbox).toBeEnabled();
    await settings.noticeCheckbox.check();
    await settings.saveTargetButton.click();

    await expect(settings.savedStatus).toHaveText(/Concurso-alvo salvo\./);
    await settings.open();
    await expect(settings.targetSelect).toHaveValue('trt2');
    await expect(settings.noticeCheckbox).toBeChecked();
    expect(await readSettings(user.id)).toMatchObject({
      target_exam_id: 'trt2',
      target_notice_published: true,
    });
    expect(await readWeights(user.id)).toEqual({});
    await expect(settings.weightsTag('Pesos padrão')).toBeVisible();
  });

  test('CA-30 — the theme chosen on the page is saved and persists; the shell has no toggle', async ({
    page,
    user,
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    // The only toggle of the application, and the only "Aparência" label.
    await expect(page.getByRole('group', { name: 'Tema' })).toHaveCount(1);
    await expect(settings.themeGroup).toHaveCount(1);
    await expect(page.getByText('Aparência', { exact: true })).toHaveCount(1);

    await expect(async () => {
      await settings.themeOption('Escuro').click();
      await expect(settings.themeOption('Escuro')).toHaveAttribute('aria-pressed', 'true', {
        timeout: 1_000,
      });
    }).toPass();
    await expect.poll(async () => (await readSettings(user.id))?.theme).toBe('dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(settings.themeOption('Escuro')).toHaveAttribute('aria-pressed', 'true');
    await settings.openMenuIfPresent();
    await expect(page.getByRole('group', { name: 'Tema' })).toHaveCount(1);
    await expect(page.getByText('Aparência', { exact: true })).toHaveCount(1);
  });
});

test.describe('Journey 9 — effect on the topic map', () => {
  test('CA-35 — the map warns about custom weights and follows the S1 priorities', async ({
    page,
    user,
    settings,
  }) => {
    await seedWeights(user.id);
    const map = new TopicMapPage(page);
    await map.open('?sort=priority');
    await expect(map.heading).toBeVisible();
    const byPriority = await map.topicNames();

    await expect(page.getByText('Pesos personalizados em uso.')).toBeVisible();
    await expect(settings.main.getByRole('link', { name: 'Configurações' })).toBeVisible();
    await expect(map.listRow(LEGISLATION)).toContainText('8,8%');
    await expect(map.listRow(NETWORKS)).toContainText('75,7%');

    await map.open();
    await expect(map.heading).toBeVisible();
    expect(await map.topicNames()).toEqual(byPriority);

    await map.open('?view=matrix');
    await expect(map.matrixRegion).toBeVisible();
    const firstExam = map.matrixTable.getByRole('columnheader').nth(1);
    await expect(firstExam).toContainText('TRT-2');
    await expect(firstExam).toContainText('40%');
  });

  test('CA-35 — weights that add up to 72% get the off-scale warning', async ({
    page,
    user,
    settings,
  }) => {
    await seedWeights(user.id, { trt3: 400, trf6: 320 });
    await settings.open();
    await expect(settings.heading).toBeVisible();
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.heading).toBeVisible();

    await expect(
      page.getByText(
        'Os pesos dos concursos ativos somam 72%; as prioridades ficam fora da escala de 0 a 100%.',
      ),
    ).toBeVisible();
    await expect(page.getByText('Pesos personalizados em uso.')).toHaveCount(0);
  });

  test('CA-35 — the weights notice closed on the map stays closed after a reload and on the detail', async ({
    page,
    user,
    settings,
  }) => {
    await seedWeights(user.id);
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.heading).toBeVisible();
    await expect(map.masteryNotice).toBeVisible();

    await dismissWeightsNotice(page, map, settings);
    const cookie = await weightsNoticeCookie(page);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });

    await page.reload();
    await expect(map.heading).toBeVisible();
    await expect(map.weightsNotice).toHaveCount(0);
    // Only the weights notice was closed: the other info notice on the page is untouched.
    await expect(map.masteryNotice).toBeVisible();

    await page.goto(DETAIL_PATH);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(map.weightsNotice).toHaveCount(0);
    await map.open();
    await expect(map.heading).toBeVisible();
    await expect(map.weightsNotice).toHaveCount(0);
  });

  test('CA-36 — the weights notice closed on the detail stays closed on the map', async ({
    page,
    user,
    settings,
  }) => {
    await seedWeights(user.id);
    const map = new TopicMapPage(page);
    await page.goto(DETAIL_PATH);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await dismissWeightsNotice(page, map, settings);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(map.weightsNotice).toHaveCount(0);

    await map.open();
    await expect(map.heading).toBeVisible();
    await expect(map.weightsNotice).toHaveCount(0);
  });

  test('CA-35 — saving other weights brings the closed notice back; restoring the default leaves none', async ({
    page,
    user,
    settings,
  }) => {
    await seedWeights(user.id);
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.heading).toBeVisible();
    await dismissWeightsNotice(page, map, settings);
    const closedFor = (await weightsNoticeCookie(page))?.value;

    await settings.open();
    await expect(settings.heading).toBeVisible();
    await settings.enterWeight('TRT-2 (SP)', '30', '90%');
    await settings.rebalanceButton.click();
    await expect(settings.savedStatus).toContainText(SAVED_MESSAGE);

    await map.open();
    await expect(map.heading).toBeVisible();
    await expect(map.weightsNotice).toContainText('Pesos personalizados em uso.');
    await page.goto(DETAIL_PATH);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(map.weightsNotice).toContainText('Pesos personalizados em uso.');

    // Closing it again remembers the new set, not the old one.
    await dismissWeightsNotice(page, map, settings);
    await expect.poll(async () => (await weightsNoticeCookie(page))?.value).not.toBe(closedFor);

    await settings.open('?confirm=restore');
    await settings.confirmButton.click();
    await expect(settings.savedStatus).toHaveText(/Pesos padrão restaurados\./);
    await map.open();
    await expect(map.heading).toBeVisible();
    await expect(map.weightsNotice).toHaveCount(0);
  });

  test('CA-36 — the topic detail shows the TJMG weight and contribution and the warning', async ({
    page,
    user,
    settings,
  }) => {
    await seedWeights(user.id);
    await page.goto('/topics/legislacao_mg');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.getByText('Pesos personalizados em uso.')).toBeVisible();
    await expect(settings.main.getByRole('link', { name: 'Configurações' })).toBeVisible();
    const table = page.getByRole('table', {
      name: 'Contribuição de cada concurso para a prioridade',
    });
    const tjmg = table.getByRole('row').filter({ hasText: 'TJMG' });
    await expect(tjmg.getByRole('rowheader')).toContainText('peso 8,8%');
    await expect(tjmg.getByRole('cell').last()).toHaveText('8,8%');
    await expect(table.getByRole('row', { name: /^Total/ })).toContainText('8,8%');
  });
});

test.describe('Journey 9 — keyboard and focus', () => {
  test.skip(({ isMobile }) => isMobile, 'the tab order is checked on desktop');

  test('CA-32 — Tab reaches the target, the 14 fields, the buttons and the theme toggle in order, with a visible focus', async ({
    page,
    user,
    settings,
  }) => {
    await seedStudyTarget(user.id, { targetExamId: 'trt2', targetNoticePublished: false });
    await settings.open();
    await expect(settings.heading).toBeVisible();

    const expected = [
      'Concurso-alvo',
      'O edital do concurso-alvo foi publicado',
      'Salvar concurso-alvo',
      ...DEFAULT_WEIGHT_ROWS.map((row) => `Peso do ${row.court}, em porcentagem`),
      'Salvar',
      'Ajustar os demais e salvar',
      'Sistema',
      'Claro',
      'Escuro',
    ];
    await settings.targetSelect.focus();
    const seen: string[] = [];
    for (let step = 0; step < expected.length; step += 1) {
      if (step > 0) await page.keyboard.press('Tab');
      seen.push(
        await page.evaluate(() => {
          const element = document.activeElement as HTMLElement | null;
          const labelled = (element as HTMLInputElement | null)?.labels?.[0]?.textContent;
          return (
            element?.getAttribute('aria-label') ??
            labelled?.trim() ??
            element?.textContent?.trim() ??
            ''
          );
        }),
      );
      if (step === 3) await expect(page.locator(':focus')).toBeVisible();
      if (step === 3) expect(await hasFocusIndicator(page.locator(':focus'))).toBe(true);
    }
    expect(seen).toEqual(expected);
  });
});

test.describe('Journey 9 — accessibility in both themes', () => {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`${theme} theme`, () => {
      test(`CA-33 — default state in the ${theme} theme has no serious or critical violations`, async ({
        page,
        user,
        settings,
      }) => {
        await seedTheme(user.id, theme);
        await settings.open();
        await expect(settings.heading).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        await expectNoSeriousA11yViolations(page);
      });

      // "Salvar" cannot send a bad sum anymore, so the error state comes from "Ajustar os demais".
      test(`CA-33 — error summary with its close button in the ${theme} theme has no serious or critical violations`, async ({
        page,
        user,
        settings,
      }) => {
        await seedTheme(user.id, theme);
        await settings.open();
        await expect(settings.heading).toBeVisible();
        await settings.enterWeight('TRT-2 (SP)', '40', '135%');
        await settings.enterWeight('TRT-3 (MG)', '95', '202%');
        await settings.rebalanceButton.click();
        await expect(settings.errorSummary).toContainText('Os pesos alterados já somam 135%');
        await expect(settings.closeButton(settings.errorSummary)).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        await expectNoSeriousA11yViolations(page);
      });

      test(`CA-33 — blocked "Salvar" with its hint in the ${theme} theme has no serious or critical violations`, async ({
        page,
        user,
        isMobile,
        settings,
      }) => {
        await seedTheme(user.id, theme);
        await settings.open();
        await expect(settings.heading).toBeVisible();
        await settings.enterWeight('TRT-2 (SP)', '40', '135%');
        await settings.saveButton.focus();
        if (isMobile) await expect(settings.blockedHelp).toBeVisible();
        else await expect(settings.blockedHint).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        await expectNoSeriousA11yViolations(page);
      });

      test(`CA-33 — success notice with its close button in the ${theme} theme has no serious or critical violations`, async ({
        page,
        user,
        settings,
      }) => {
        await seedTheme(user.id, theme);
        await settings.open();
        await expect(settings.heading).toBeVisible();
        await settings.enterWeight('TRT-2 (SP)', '40', '135%');
        await settings.rebalanceButton.click();
        await expect(settings.savedStatus).toContainText(SAVED_MESSAGE);
        await expect(settings.closeButton(settings.savedStatus)).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        await expectNoSeriousA11yViolations(page);
      });

      test(`CA-35 — map with the weights notice in the ${theme} theme has no serious or critical violations`, async ({
        page,
        user,
        // The fixture logs in as the disposable user, whose own weights raise the notice.
        settings,
      }) => {
        await seedTheme(user.id, theme);
        await seedWeights(user.id);
        const map = new TopicMapPage(settings.page);
        await map.open();
        await expect(map.weightsNotice).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        await expectNoSeriousA11yViolations(page);
      });

      test(`CA-33 — restore confirmation in the ${theme} theme has no serious or critical violations`, async ({
        page,
        user,
        settings,
      }) => {
        await seedTheme(user.id, theme);
        await seedWeights(user.id);
        await settings.open('?confirm=restore');
        await expect(settings.confirmQuestion).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        await expectNoSeriousA11yViolations(page);
      });
    });
  }
});

test.describe('Journey 9 — mobile (360 px)', () => {
  test.skip(({ isMobile }) => !isMobile, 'CA-34 runs in the mobile project');

  test('CA-34 — no sideways scroll, three columns, stacked buttons, decimal keyboards and 44 px targets', async ({
    user,
    settings,
  }) => {
    await seedWeights(user.id);
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await expect(settings.restoreLink).toBeVisible();

    expect(await scrollWidth(settings.page)).toBeLessThanOrEqual(360);
    await expect(settings.weightsTable.getByRole('columnheader')).toHaveText([
      'Concurso',
      'Padrão',
      'Peso',
    ]);
    for (const row of DEFAULT_WEIGHT_ROWS) {
      await expect(settings.weightField(row.court)).toHaveAttribute('inputmode', 'decimal');
    }
    const save = await settings.saveButton.boundingBox();
    const rebalance = await settings.rebalanceButton.boundingBox();
    expect(save).not.toBeNull();
    expect(rebalance).not.toBeNull();
    expect(Math.abs((save?.x ?? 0) - (rebalance?.x ?? 1))).toBeLessThanOrEqual(1);
    expect(rebalance?.y ?? 0).toBeGreaterThan((save?.y ?? 0) + (save?.height ?? 0) - 1);

    expect(await smallTouchTargets(settings.page)).toEqual([]);
  });

  test('CA-34 — blocked "Salvar" shows the help text and the notice close button is a 44 px target', async ({
    settings,
  }) => {
    await settings.open();
    await expect(settings.heading).toBeVisible();
    await settings.enterWeight('TRT-2 (SP)', '40', '135%');
    await expect(settings.blockedHelp).toHaveText('A soma dos pesos deve ser 100%.');
    expect(await scrollWidth(settings.page)).toBeLessThanOrEqual(360);

    await settings.rebalanceButton.click();
    await expect(settings.savedStatus).toContainText(SAVED_MESSAGE);

    expect(await scrollWidth(settings.page)).toBeLessThanOrEqual(360);
    expect(await smallTouchTargets(settings.page)).toEqual([]);
  });
});
