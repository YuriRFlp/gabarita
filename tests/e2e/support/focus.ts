import type { Locator } from '@playwright/test';

/** Visible focus = an outline or the focus shadow applied by CSS (the design uses --focus-shadow). */
export async function hasFocusIndicator(target: Locator): Promise<boolean> {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    return outline || style.boxShadow !== 'none';
  });
}
