import { expect, type Locator, type Page } from '@playwright/test';

export type FilterGroupName = 'Ver' | 'Grupo' | 'Perfil' | 'Ordenar';

export class TopicMapPage {
  readonly heading: Locator;
  readonly count: Locator;
  readonly masteryNotice: Locator;
  readonly emptyTitle: Locator;
  readonly clearFilters: Locator;
  readonly matrixRegion: Locator;
  readonly matrixTable: Locator;
  readonly mainNavigation: Locator;
  readonly menuButton: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Mapa do edital' });
    this.count = page.getByText(/^Mostrando \d+ de \d+ assuntos$/);
    this.masteryNotice = page.getByText('Domínio ainda não medido.');
    this.emptyTitle = page.getByText('Nenhum assunto com esses filtros.');
    this.clearFilters = page.getByRole('link', { name: 'Limpar filtros' });
    this.matrixRegion = page.getByRole('region', { name: 'Matriz de incidência por concurso' });
    this.matrixTable = this.matrixRegion.getByRole('table');
    this.mainNavigation = page.getByRole('navigation', { name: 'Principal' });
    this.menuButton = page.getByRole('button', { name: 'Menu' });
  }

  async open(search = '') {
    return this.page.goto(`/topics${search}`);
  }

  filterGroup(name: FilterGroupName): Locator {
    return this.page.getByRole('group', { name, exact: true });
  }

  filterOption(group: FilterGroupName, option: string): Locator {
    return this.filterGroup(group).getByRole('link', { name: option, exact: true });
  }

  /** The list is a table named "Assuntos do edital"; each topic is a row with a link header. */
  get list(): Locator {
    return this.page.getByRole('table', { name: 'Assuntos do edital' });
  }

  listRow(topicName: string): Locator {
    return this.list
      .getByRole('row')
      .filter({ has: this.page.getByRole('link', { name: topicName, exact: true }) });
  }

  /**
   * Names of the topics in the order the page shows them. Waits for the count first, so the list
   * is known to be rendered.
   */
  async topicNames(): Promise<string[]> {
    await expect(this.count).toBeVisible();
    await expect(this.list).toBeVisible();
    return this.list.getByRole('rowheader').getByRole('link').allTextContents();
  }

  topicLink(topicName: string): Locator {
    return this.page.getByRole('link', { name: topicName, exact: true });
  }

  navigationLink(name: string): Locator {
    return this.mainNavigation.getByRole('link', { name });
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
}
