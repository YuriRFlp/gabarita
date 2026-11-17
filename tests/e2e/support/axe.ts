import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const FAILING_IMPACTS = new Set(['serious', 'critical']);

/** Scans the whole page (color contrast included) and fails on serious or critical violations. */
export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page }).analyze();
  const serious = result.violations
    .filter((violation) => FAILING_IMPACTS.has(violation.impact ?? ''))
    .map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }));
  expect(serious, `Serious or critical violations at ${page.url()}`).toEqual([]);
}
