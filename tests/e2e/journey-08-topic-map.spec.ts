import { expect, test, type Page } from '@playwright/test';
import { answerTopics } from './data/answers.ts';
import { TEST_USER } from './data/test-user.ts';
import { HomePage } from './pages/HomePage.ts';
import { LoginPage } from './pages/LoginPage.ts';
import { TopicMapPage } from './pages/TopicMapPage.ts';
import { expectNoSeriousA11yViolations } from './support/axe.ts';
import { hasFocusIndicator } from './support/focus.ts';
import { scrollWidth, smallTouchTargets } from './support/layout.ts';
import { BASE_URL, SESSION_FILE } from './support/session.ts';
import { setThemeInDatabase } from './support/theme.ts';
import { createDisposableUser, deleteDisposableUser } from './support/users.ts';

const NO_SESSION = { cookies: [], origins: [] };
const TOPIC_COUNT = 38;
const PDPJ = 'Stack da PDPJ-Br';
const PDPJ_PATH = '/topics/pdpj_stack';
const EMPTY_FILTERS = '?category=general&profile=infra';

async function countShown(map: TopicMapPage): Promise<number> {
  const text = await map.count.textContent();
  const match = /^Mostrando (\d+) de 38 assuntos$/.exec(text ?? '');
  if (!match?.[1]) throw new Error(`Unexpected count text: ${text}`);
  return Number(match[1]);
}

test.describe('Journey 8 — navigation and list without answers', () => {
  test('CA-18 — "Mapa do edital" in the navigation opens /topics with the 38 topics', async ({
    page,
  }) => {
    const home = new HomePage(page);
    const map = new TopicMapPage(page);
    await home.open();
    await home.openMenuIfPresent();

    await map.navigationLink('Mapa do edital').click();

    await expect(page).toHaveURL('/topics');
    await expect(page).toHaveTitle(/Mapa do edital/);
    await expect(map.heading).toBeVisible();
    await expect(map.list.getByRole('rowheader')).toHaveCount(TOPIC_COUNT);
    await expect(map.count).toHaveText('Mostrando 38 de 38 assuntos');
    await map.openMenuIfPresent();
    await expect(map.navigationLink('Mapa do edital')).toHaveAttribute('aria-current', 'page');
  });

  test('CA-40 — the navigation shows icons without numbers or bubbles and marks only the current item', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    const home = new HomePage(page);
    await map.open();
    await expect(map.heading).toBeVisible();
    await map.openMenuIfPresent();

    const topics = map.navigationLink('Mapa do edital');
    const start = map.navigationLink('Início');
    for (const link of [start, topics, home.settingsLink]) {
      await expect(link.locator('svg[aria-hidden="true"]')).toHaveCount(1);
      await expect(link.locator('.gb-bubble')).toHaveCount(0);
    }
    await expect(topics).toHaveAttribute('aria-current', 'page');
    await expect(start).not.toHaveAttribute('aria-current');
    await expect(home.settingsLink).not.toHaveAttribute('aria-current');
    await expect(page.locator('.gb-shell__rail-number')).toHaveCount(0);
    await expect(map.mainNavigation).not.toContainText(/\b0[01]\b/);
    await expect(home.themeGroup).toHaveCount(0);
    await expect(home.logoutButton).toBeVisible();
    const currentBackground = await topics.evaluate((el) => getComputedStyle(el).backgroundColor);
    const otherBackground = await start.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(currentBackground).not.toBe(otherBackground);
  });

  test('CA-42 — the map header starts with the h1, without "Módulo 01"', async ({ page }) => {
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.heading).toBeVisible();

    await map.expectHeaderStartsWithHeading();
    await expect(map.pageHeader.getByText('Módulo 01')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('CA-42 — the detail header starts with the h1 (the topic name), without "Assunto"', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await page.goto(PDPJ_PATH);
    await expect(page.getByRole('heading', { level: 1, name: PDPJ })).toBeVisible();

    await map.expectHeaderStartsWithHeading();
    await expect(map.pageHeader.getByText('Assunto', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('CA-18 — each row shows name, profile or "Geral", "Pós-edital", priority and subtopics', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await map.open('?sort=priority');
    await expect(map.heading).toBeVisible();

    const pdpj = map.listRow(PDPJ);
    await expect(pdpj).toContainText('Sistemas');
    await expect(pdpj).toContainText('100%');
    await expect(pdpj).toContainText('Sem respostas');
    await expect(pdpj.getByRole('cell').last()).toHaveText('12');
    await expect(map.list.getByText('Geral', { exact: true }).first()).toBeVisible();
    await expect(map.list.getByText('Pós-edital', { exact: true }).first()).toBeVisible();
    await expect(map.list.getByText(/^89\s?%$/).first()).toBeVisible();
  });

  test('CA-18 — the navigation item stays current on a topic detail', async ({ page }) => {
    const map = new TopicMapPage(page);
    await page.goto(PDPJ_PATH);
    await expect(page.getByRole('heading', { level: 1, name: PDPJ })).toBeVisible();

    await map.openMenuIfPresent();
    await expect(map.navigationLink('Mapa do edital')).toHaveAttribute('aria-current', 'page');
  });

  test('CA-19 — a user without answers sees the notice, "Sem respostas" and urgency = priority order', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.heading).toBeVisible();

    await expect(map.masteryNotice).toBeVisible();
    await expect(map.list.getByText('Sem respostas', { exact: true })).toHaveCount(TOPIC_COUNT);
    await expect(map.list.locator('td[data-label="Domínio"]').getByText('0%')).toHaveCount(0);
    const byUrgency = await map.topicNames();

    await map.open('?sort=priority');
    await expect(map.filterOption('Ordenar', 'Prioridade')).toHaveAttribute('aria-current', 'true');
    expect(await map.topicNames()).toEqual(byUrgency);
  });
});

test.describe('Journey 8 — filters in the URL', () => {
  test('CA-21 — choosing view, group, profile and order changes the URL, keeps the others and survives a reload', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.heading).toBeVisible();

    await map.filterOption('Ver', 'Matriz').click();
    await expect(page).toHaveURL('/topics?view=matrix');
    await expect(map.filterOption('Ver', 'Matriz')).toHaveAttribute('aria-current', 'true');
    await expect(map.matrixRegion).toBeVisible();

    await map.filterOption('Perfil', 'Sistemas').click();
    await expect(page).toHaveURL('/topics?view=matrix&profile=systems');

    await map.filterOption('Ordenar', 'Nome').click();
    await expect(page).toHaveURL('/topics?view=matrix&profile=systems&sort=name');

    await map.filterOption('Grupo', 'Específicos').click();
    await expect(page).toHaveURL('/topics?view=matrix&category=specific&profile=systems&sort=name');
    for (const [group, option] of [
      ['Ver', 'Matriz'],
      ['Grupo', 'Específicos'],
      ['Perfil', 'Sistemas'],
      ['Ordenar', 'Nome'],
    ] as const) {
      await expect(map.filterOption(group, option)).toHaveAttribute('aria-current', 'true');
    }

    const shown = await countShown(map);
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(TOPIC_COUNT);
    await expect(map.matrixTable.getByRole('rowheader')).toHaveCount(shown);

    await page.reload();
    await expect(map.filterOption('Perfil', 'Sistemas')).toHaveAttribute('aria-current', 'true');
    await expect(map.filterOption('Ordenar', 'Nome')).toHaveAttribute('aria-current', 'true');
    expect(await countShown(map)).toBe(shown);
  });

  test('CA-21 — the count lives in an aria-live="polite" region and is updated by the filter', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await map.open();
    const live = page.locator('[aria-live="polite"]').filter({ hasText: 'Mostrando' });
    await expect(live).toHaveText('Mostrando 38 de 38 assuntos');

    await map.filterOption('Perfil', 'Infra').click();

    await expect(page).toHaveURL('/topics?profile=infra');
    await expect(live).not.toHaveText('Mostrando 38 de 38 assuntos');
    await expect(live).toHaveText(/^Mostrando \d+ de 38 assuntos$/);
  });

  test.describe('without JavaScript', () => {
    test('CA-21 — the filters are links and keep working', async ({ browser }) => {
      const context = await browser.newContext({
        baseURL: BASE_URL,
        storageState: SESSION_FILE,
        javaScriptEnabled: false,
      });
      const page = await context.newPage();
      const map = new TopicMapPage(page);
      await map.open();
      await expect(map.heading).toBeVisible();

      await map.filterOption('Ver', 'Matriz').click();
      await expect(page).toHaveURL('/topics?view=matrix');
      await expect(map.matrixRegion).toBeVisible();

      await map.filterOption('Perfil', 'Comum').click();
      await expect(page).toHaveURL('/topics?view=matrix&profile=common');
      await expect(map.filterOption('Perfil', 'Comum')).toHaveAttribute('aria-current', 'true');
      await expect(map.count).not.toHaveText('Mostrando 38 de 38 assuntos');
      await context.close();
    });
  });

  test('CA-22 — filters with no result show the empty state and "Limpar filtros" restores /topics', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await map.open(EMPTY_FILTERS);

    await expect(map.emptyTitle).toBeVisible();
    await expect(map.count).toHaveText('Mostrando 0 de 38 assuntos');
    await expect(map.clearFilters).toHaveAttribute('href', '/topics');

    await map.clearFilters.click();

    await expect(page).toHaveURL('/topics');
    await expect(map.count).toHaveText('Mostrando 38 de 38 assuntos');
    await expect(map.emptyTitle).toBeHidden();
  });
});

test.describe('Journey 8 — matrix and detail', () => {
  test('CA-23 — the matrix has a legend, one column per exam and one row per topic with hidden texts', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await map.open('?view=matrix');

    await expect(map.matrixRegion).toBeVisible();
    await expect(page.getByRole('list', { name: 'Legenda das bolhas' })).toBeVisible();
    await expect(map.matrixTable.getByRole('columnheader')).toHaveCount(15);
    await expect(map.matrixTable.getByRole('columnheader', { name: /TRT-3/ })).toBeVisible();
    await expect(map.matrixTable.getByRole('rowheader')).toHaveCount(TOPIC_COUNT);
    await expect(map.matrixTable).toContainText('Incidência de cada assunto em cada concurso');
    const row = map.matrixTable.getByRole('row').filter({ hasText: PDPJ });
    await expect(row.getByText('cobrado com profundidade')).toHaveCount(14);
  });

  test('CA-25 — /topics/pdpj_stack shows 12 subtopics and 14 contributions adding up to 100%', async ({
    page,
  }) => {
    await page.goto(PDPJ_PATH);

    await expect(page.getByRole('heading', { level: 1, name: PDPJ })).toBeVisible();
    await expect(
      page.getByText('Prioridade 100% · Urgência 100% · Domínio: sem respostas'),
    ).toBeVisible();
    const contributions = page.getByRole('table', {
      name: 'Contribuição de cada concurso para a prioridade',
    });
    await expect(contributions.locator('tbody tr')).toHaveCount(14);
    await expect(contributions.locator('tbody').getByText('Profundidade')).toHaveCount(14);
    await expect(contributions.locator('tfoot tr')).toContainText('Total');
    await expect(contributions.locator('tfoot td')).toHaveText('100%');
    await expect(page.getByRole('heading', { level: 2, name: 'Subtópicos (12)' })).toBeVisible();
    await expect(
      page.getByRole('region', { name: /^Subtópicos/ }).getByRole('listitem'),
    ).toHaveCount(12);
  });

  test('CA-25 — /topics/seg_infra shows TJMG with a half bubble, "Noções" and contribution 7%', async ({
    page,
  }) => {
    await page.goto('/topics/seg_infra');

    const row = page
      .getByRole('table', { name: 'Contribuição de cada concurso para a prioridade' })
      .getByRole('row')
      .filter({ hasText: 'TJMG' });
    await expect(row).toContainText('Noções');
    await expect(row.getByRole('cell').last()).toHaveText('7%');
    await expect(row.locator('.gb-bubble--half')).toHaveCount(1);
  });

  test('CA-26 — a topic without answers shows the empty mastery state and no percentage', async ({
    page,
  }) => {
    await page.goto(PDPJ_PATH);

    const section = page.getByRole('region', { name: 'Domínio' });
    await expect(
      section.getByText('Você ainda não respondeu questões deste assunto nos últimos 60 dias.'),
    ).toBeVisible();
    await expect(section.getByText('Para a urgência, o domínio conta como 0.')).toBeVisible();
    await expect(section.getByText('%')).toHaveCount(0);
  });

  test('CA-29 — the filters answer a complete page and a single h1 without JavaScript streaming', async ({
    page,
  }) => {
    const response = await page.goto('/topics?view=matrix');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  for (const path of ['/topics/nao_existe', '/topics/..%2F']) {
    test(`CA-27 — ${path} shows the Portuguese 404`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(
        page.getByRole('navigation', { name: 'Principal', includeHidden: true }),
      ).toBeAttached();
      await expect(
        page.getByRole('heading', { level: 1, name: 'Página não encontrada' }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Voltar ao início' })).toBeVisible();
    });
  }
});

test.describe('Journey 8 — a user with answers', () => {
  test('CA-20 — measured topics show the percentage and bubbles, the notice goes away and urgency follows mastery', async ({
    browser,
    baseURL,
  }) => {
    const user = await createDisposableUser();
    const cleanup = await answerTopics(user.id, ['pdpj_stack']);
    const context = await browser.newContext({ baseURL, storageState: NO_SESSION });
    try {
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      await loginPage.open();
      await loginPage.login(user.email, user.password);
      await expect(new HomePage(page).heading).toBeVisible();
      const map = new TopicMapPage(page);

      await map.open('?sort=priority');
      await expect(map.heading).toBeVisible();
      const byPriority = await map.topicNames();

      await expect(map.masteryNotice).toBeHidden();
      const pdpj = map.listRow(PDPJ);
      await expect(pdpj).toContainText('70%');
      await expect(pdpj).not.toContainText('Sem respostas');
      await expect(pdpj.locator('.gb-bubble--filled')).toHaveCount(4);
      await expect(map.list.getByText('Sem respostas', { exact: true })).toHaveCount(
        TOPIC_COUNT - 1,
      );

      await map.open();
      await expect(map.heading).toBeVisible();
      const byUrgency = await map.topicNames();
      expect(byUrgency.indexOf(PDPJ)).toBeGreaterThan(byPriority.indexOf(PDPJ));
      expect(byUrgency[0]).not.toBe(PDPJ);

      await page.goto(PDPJ_PATH);
      const section = page.getByRole('region', { name: 'Domínio' });
      await expect(section).toContainText('70%');
      await expect(section).toContainText('10 respostas, 7 acertos firmes (chutes não contam)');
      await expect(section).toContainText('Retenção média: ainda não calculada.');
      await expect(section).toContainText('Sem cartões, o domínio é a taxa de acerto firme.');
      await expect(page.getByText('Prioridade 100% · Urgência 30% · Domínio: 70%')).toBeVisible();
    } finally {
      await context.close();
      await cleanup();
      await deleteDisposableUser(user);
    }
  });
});

test.describe('Journey 8 — pinned column heads', () => {
  test.skip(({ isMobile }) => isMobile, 'CA-38 pins the heads on desktop; mobile has its own test');

  test('CA-38 — the list head stays at the top of the window while the page scrolls', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await map.open('?sort=priority');
    await expect(map.list).toBeVisible();

    await page.mouse.wheel(0, 1200);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(600);

    const head = map.list.getByRole('columnheader', { name: 'Prioridade' });
    await expect(head).toBeInViewport({ ratio: 1 });
    const box = await head.boundingBox();
    expect(Math.abs(box?.y ?? 99)).toBeLessThanOrEqual(1);
  });

  test('CA-38 — the matrix region is height-limited and pins its head and topic column', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await page.setViewportSize({ width: 800, height: 720 });
    await map.open('?view=matrix');
    await expect(map.matrixRegion).toBeVisible();
    await expect(map.matrixTable.getByText('Peso do concurso')).toBeVisible();

    const region = await map.matrixRegion.boundingBox();
    expect(region?.height ?? 9999).toBeLessThanOrEqual(720);
    const scrollsBoth = await map.matrixRegion.evaluate(
      (el) => el.scrollHeight > el.clientHeight && el.scrollWidth > el.clientWidth,
    );
    expect(scrollsBoth).toBe(true);

    const head = map.matrixTable.getByRole('columnheader', { name: /TRT-3/ });
    const topic = map.matrixTable.getByRole('rowheader').nth(5);
    await map.matrixRegion.evaluate((el) => {
      el.scrollTo({ top: 300, left: 100 });
    });
    await expect.poll(() => map.matrixRegion.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect.poll(() => map.matrixRegion.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

    const box = await map.matrixRegion.boundingBox();
    const headBox = await head.boundingBox();
    const topicBox = await topic.boundingBox();
    // The head pins to the top edge of the region (below its 2 px border) and the topic column to
    // its left edge.
    expect(Math.abs((headBox?.y ?? -99) - ((box?.y ?? 0) + 2))).toBeLessThanOrEqual(2);
    expect(Math.abs((topicBox?.x ?? -99) - (box?.x ?? 0))).toBeLessThanOrEqual(2);
    await expect(head).toBeInViewport();
  });
});

test.describe('Journey 8 — keyboard', () => {
  async function expectFocusedWithIndicator(page: Page, target: ReturnType<Page['locator']>) {
    await expect(target).toBeFocused();
    expect(await hasFocusIndicator(target)).toBe(true);
  }

  const FILTER_ORDER = [
    ['Ver', 'Lista'],
    ['Ver', 'Matriz'],
    ['Grupo', 'Todos'],
    ['Grupo', 'Específicos'],
    ['Grupo', 'Gerais'],
    ['Perfil', 'Todos'],
    ['Perfil', 'Sistemas'],
    ['Perfil', 'Infra'],
    ['Perfil', 'Comum'],
    ['Ordenar', 'Urgência'],
    ['Ordenar', 'Prioridade'],
  ] as const;

  test('CA-30 — list: Tab reaches the filters in order, then the first topic, and Enter opens the detail', async ({
    page,
    isMobile,
  }) => {
    const map = new TopicMapPage(page);
    await map.open('?sort=priority');
    await expect(map.heading).toBeVisible();

    await map.filterOption('Ver', 'Lista').focus();
    await expectFocusedWithIndicator(page, map.filterOption('Ver', 'Lista'));
    for (const [group, option] of FILTER_ORDER.slice(1)) {
      await page.keyboard.press('Tab');
      await expectFocusedWithIndicator(page, map.filterOption(group, option));
    }
    await page.keyboard.press('Tab');
    await expectFocusedWithIndicator(page, map.filterOption('Ordenar', 'Nome'));

    // The two column heads that carry a hint are tab stops before the first topic.
    // When rows are stacked the head is hidden and its titles are skipped.
    for (const title of isMobile ? [] : ['Prioridade', 'Domínio']) {
      await page.keyboard.press('Tab');
      await expectFocusedWithIndicator(page, map.list.getByRole('button', { name: title }));
    }

    await page.keyboard.press('Tab');
    const first = map.list.getByRole('rowheader').getByRole('link').first();
    await expectFocusedWithIndicator(page, first);
    const name = (await first.textContent()) ?? '';

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/topics\/[a-z0-9_]+$/);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  });

  test('column heads explain themselves on hover and on keyboard focus', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the column heads are hidden when rows are stacked');
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.heading).toBeVisible();
    const tip = map.list.getByRole('tooltip');
    await expect(tip.first()).toBeHidden();

    await map.list.getByRole('button', { name: 'Prioridade' }).hover();
    await expect(tip.first()).toBeVisible();
    await expect(tip.first()).toContainText(
      'O quanto o assunto vale nos concursos que você escolheu.',
    );

    await page.mouse.move(0, 0);
    await expect(tip.first()).toBeHidden();
    await map.list.getByRole('button', { name: 'Domínio' }).focus();
    await expect(tip.last()).toBeVisible();
    await expect(tip.last()).toContainText('O quanto você já domina o assunto.');
    await page.keyboard.press('Escape');
    await expect(tip.last()).toBeHidden();
  });

  test('CA-30 — matrix: after the filters Tab reaches the region, then the topic links', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await map.open('?view=matrix&sort=name');
    await expect(map.matrixRegion).toBeVisible();

    await map.filterOption('Ordenar', 'Nome').focus();
    await page.keyboard.press('Tab');
    await expectFocusedWithIndicator(page, map.matrixRegion);
    await page.keyboard.press('Tab');
    await expectFocusedWithIndicator(
      page,
      map.matrixTable.getByRole('rowheader').getByRole('link').first(),
    );
  });

  test('CA-30 — detail: the back link takes focus with a visible indicator and Enter returns to the map', async ({
    page,
  }) => {
    await page.goto(PDPJ_PATH);
    const back = page
      .getByRole('link', { name: 'Mapa do edital', exact: true })
      .and(page.locator('.gb-back-link'));
    await expect(back).toBeVisible();

    await back.focus();
    await expectFocusedWithIndicator(page, back);
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL('/topics');
  });
});

test.describe('Journey 8 — accessibility in both themes', () => {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`${theme} theme`, () => {
      test.beforeEach(async () => {
        await setThemeInDatabase(theme);
      });

      test.afterEach(async () => {
        await setThemeInDatabase('system');
      });

      for (const [name, path] of [
        ['list', '/topics'],
        ['matrix', '/topics?view=matrix'],
        ['empty filters', `/topics${EMPTY_FILTERS}`],
        ['detail', PDPJ_PATH],
      ] as const) {
        test(`CA-31 — ${name} in the ${theme} theme has no serious or critical violations`, async ({
          page,
        }) => {
          await page.goto(path);
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

          await expectNoSeriousA11yViolations(page);
        });
      }

      test(`CA-31 — list with a column hint open in the ${theme} theme has no serious or critical violations`, async ({
        page,
        isMobile,
      }) => {
        test.skip(isMobile, 'the column heads are hidden when rows are stacked');
        const map = new TopicMapPage(page);
        await map.open();
        await expect(map.heading).toBeVisible();
        await map.list.getByRole('button', { name: 'Prioridade' }).focus();
        await expect(map.list.getByRole('tooltip').first()).toBeVisible();

        await expectNoSeriousA11yViolations(page);
      });
    });
  }
});

test.describe('Journey 8 — mobile (360 px)', () => {
  test.skip(({ isMobile }) => !isMobile, 'CA-24 and CA-32 run in the mobile project');

  test('CA-24 — the page does not scroll sideways; only the matrix region does, with a fixed first column', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await map.open('?view=matrix');
    await expect(map.matrixRegion).toBeVisible();

    expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
    await expect(map.matrixRegion).toHaveAttribute('tabindex', '0');
    const scrolls = await map.matrixRegion.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(scrolls).toBe(true);

    const topicHeader = map.matrixTable.getByRole('rowheader').first();
    const regionBox = await map.matrixRegion.boundingBox();
    const before = await topicHeader.boundingBox();
    await map.matrixRegion.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => map.matrixRegion.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    const after = await topicHeader.boundingBox();

    expect(regionBox).not.toBeNull();
    expect(Math.abs((after?.x ?? -1) - (before?.x ?? -2))).toBeLessThanOrEqual(1);
    expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
  });

  test('CA-38 — the list has no pinned head in cards and the page does not scroll sideways', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.list).toBeVisible();

    const positions = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.gb-topic-list thead th')).map(
        (el) => getComputedStyle(el).position,
      ),
    );
    expect(positions.length).toBeGreaterThan(0);
    expect(positions.every((position) => position === 'static')).toBe(true);
    expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
  });

  for (const [name, path] of [
    ['list', '/topics'],
    ['matrix', '/topics?view=matrix'],
    ['detail', PDPJ_PATH],
  ] as const) {
    test(`CA-32 — ${name}: no horizontal scroll, long names wrap and touch targets have 44 px`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
      expect(await smallTouchTargets(page)).toEqual([]);
      const clipped = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('main a, main li, main th, main h1'))
          .filter((el) => el.closest('.gb-matrix') === null && el.scrollWidth > el.clientWidth + 1)
          .map((el) => el.textContent?.trim()),
      );
      expect(clipped).toEqual([]);
    });
  }

  test('CA-32 — the open menu keeps 44 px targets and no horizontal scroll', async ({ page }) => {
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.heading).toBeVisible();

    await map.openMenuIfPresent();

    expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
    expect(await smallTouchTargets(page)).toEqual([]);
  });

  test('CA-32 — the long topic names (49 characters) are fully readable in the list', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await map.open('?sort=name');
    await expect(map.heading).toBeVisible();

    const longest = (await map.topicNames()).reduce((a, b) => (b.length > a.length ? b : a));
    expect(longest.length).toBeGreaterThanOrEqual(45);
    await map.topicLink(longest).scrollIntoViewIfNeeded();
    await expect(map.topicLink(longest)).toBeInViewport({ ratio: 1 });
    const box = await map.topicLink(longest).boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
  });
});

test.describe('Journey 8 — side rail', () => {
  test.skip(({ isMobile }) => isMobile, 'CA-36 sizes the viewport itself, in the desktop project');

  test('CA-36 — at 1280 px the navigation is a fixed side rail with icons and a solid background on the current item', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    const home = new HomePage(page);
    await map.open();
    await expect(map.heading).toBeVisible();

    await expect(map.menuButton).toBeHidden();
    await expect(map.mainNavigation).toBeVisible();
    const start = map.navigationLink('Início');
    const topics = map.navigationLink('Mapa do edital');
    await expect(topics).toHaveAttribute('aria-current', 'page');
    await expect(topics.locator('svg[aria-hidden="true"]')).toHaveCount(1);
    await expect(topics.locator('.gb-bubble')).toHaveCount(0);
    await expect(start).not.toHaveAttribute('aria-current');
    await expect(start.locator('svg[aria-hidden="true"]')).toHaveCount(1);
    const currentBackground = await topics.evaluate((el) => getComputedStyle(el).backgroundColor);
    const otherBackground = await start.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(currentBackground).not.toBe(otherBackground);
    expect(currentBackground).not.toBe('rgba(0, 0, 0, 0)');

    const rail = page.locator('.gb-shell__rail');
    await expect(rail).toBeInViewport({ ratio: 1 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const box = await rail.boundingBox();
    expect(box?.x).toBe(0);
    expect(box?.y).toBe(0);
    // The footer of the rail holds only "Configurações" and "Sair".
    await expect(home.settingsLink).toBeInViewport();
    await expect(home.logoutButton).toBeInViewport();
    await expect(
      rail.getByRole('navigation', { name: 'Preferências' }).getByRole('link'),
    ).toHaveText(['Configurações']);
    await expect(rail.getByRole('button')).toHaveText(['Sair']);
  });

  test('CA-41 — keyboard focus on the current item keeps the ring apart from the ink background', async ({
    page,
  }) => {
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.heading).toBeVisible();
    const topics = map.navigationLink('Mapa do edital');

    for (let presses = 0; presses < 10; presses += 1) {
      await page.keyboard.press('Tab');
      if (await topics.evaluate((link) => link === document.activeElement)) break;
    }

    await expect(topics).toBeFocused();
    expect(await hasFocusIndicator(topics)).toBe(true);
    // The 2 px inset in the paper color is what separates the ring from the filled item.
    expect(await topics.evaluate((link) => getComputedStyle(link).boxShadow)).toContain('inset');
  });

  test('CA-40 — with forced colors the current item uses Highlight and HighlightText', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.heading).toBeVisible();

    const system = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.backgroundColor = 'Highlight';
      probe.style.color = 'HighlightText';
      document.body.append(probe);
      const style = getComputedStyle(probe);
      const colors = { background: style.backgroundColor, text: style.color };
      probe.remove();
      return colors;
    });
    const topics = map.navigationLink('Mapa do edital');
    await expect(topics).toHaveCSS('background-color', system.background);
    await expect(topics).toHaveCSS('color', system.text);
  });

  test('CA-36 — the timing marks are aria-hidden and out of the tab order', async ({ page }) => {
    const map = new TopicMapPage(page);
    await map.open();
    await expect(map.heading).toBeVisible();

    const marks = page.locator('.gb-shell__timing-marks');
    await expect(marks).toHaveAttribute('aria-hidden', 'true');
    expect(await marks.evaluate((el) => el.querySelectorAll('a, button, [tabindex]').length)).toBe(
      0,
    );
  });

  for (const scenario of [
    { width: 1024, rail: true },
    { width: 1023, rail: false },
  ]) {
    test(`CA-36 — at ${scenario.width} px the ${scenario.rail ? 'side rail' : '"Menu" button'} is used`, async ({
      page,
    }) => {
      const map = new TopicMapPage(page);
      const home = new HomePage(page);
      await page.setViewportSize({ width: scenario.width, height: 800 });
      await map.open();
      await expect(map.heading).toBeVisible();

      if (scenario.rail) {
        await expect(map.menuButton).toBeHidden();
        await expect(map.mainNavigation).toBeVisible();
      } else {
        await expect(map.menuButton).toBeVisible();
        await expect(map.mainNavigation).toBeHidden();
        await map.openMenuIfPresent();
        await expect(map.mainNavigation).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(map.menuButton).toHaveAttribute('aria-expanded', 'false');
        await map.openMenuIfPresent();
      }
      await expect(home.themeGroup).toHaveCount(0);
      await expect(home.settingsLink).toBeVisible();
      await expect(home.logoutButton).toBeVisible();
      await expect(home.logoutButton).toBeInViewport();
    });
  }
});

test.describe('Journey 8 — login redesign', () => {
  test.use({ storageState: NO_SESSION });

  test('CA-37 — /login keeps its ornaments aria-hidden and the brand text as real HTML', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await expect(loginPage.heading).toBeVisible();

    await expect(page.locator('.gb-login .gb-timing-marks')).toHaveAttribute('aria-hidden', 'true');
    const exposed = await page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll('.gb-login__panel .gb-bubble, .gb-login__row-number'),
        ).filter((el) => el.closest('[aria-hidden="true"]') === null).length,
    );
    expect(exposed).toBe(0);
    await expect(page.getByText('Estude o que cai. Lembre no dia da prova.')).toBeAttached();
    // The only images are the two theme variants of the logo; no other text is drawn as an image.
    const images = page.locator('.gb-login img');
    await expect(images).toHaveCount(2);
    await expect(images.first()).toHaveAttribute('alt', 'Gabarita');
    await expect(images.last()).toHaveAttribute('alt', 'Gabarita');
  });

  test('CA-37 — at 360 x 800 the "Entrar" button is inside the viewport without scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await expect(loginPage.heading).toBeVisible();

    await loginPage.emailField.fill(TEST_USER.email);
    await expect(loginPage.submitButton).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
  });
});
