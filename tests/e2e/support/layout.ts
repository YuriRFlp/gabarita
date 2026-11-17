import type { Page } from '@playwright/test';

export type SmallTarget = { description: string; height: number };

/** Visible touch targets (links, buttons and fields) shorter than `minimum` px. */
export async function smallTouchTargets(page: Page, minimum = 44): Promise<SmallTarget[]> {
  return page.evaluate((limit) => {
    const selector =
      'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]';
    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .map((element) => ({ element, box: element.getBoundingClientRect() }))
      .filter(({ element, box }) => {
        // The skip link is 1 px tall until it gets focus; it is measured separately.
        const hidden = box.width <= 1 || box.height <= 1;
        return !hidden && element.checkVisibility({ visibilityProperty: true });
      })
      .filter(({ box }) => box.height < limit)
      .map(({ element, box }) => ({
        description: `${element.tagName.toLowerCase()} "${(element.textContent ?? '').trim()}"`,
        height: box.height,
      }));
  }, minimum);
}

export async function scrollWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth);
}
