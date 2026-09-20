import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers';

/**
 * Regression coverage for finding #12: filter/sort Chips measure 36px tall
 * at real mobile widths, under the 44px platform/WCAG 2.5.5 guideline.
 * EXPECTED TO FAIL until the shared Chip component's padding increases —
 * see Fix #10.
 */
test.use({ viewport: { width: 390, height: 844 } });

test('Interactive controls meet the 44px minimum touch target at 390px', async ({ page }) => {
  await loginAsDemo(page, 'Field Agent');

  const undersized: { text: string; width: number; height: number }[] = await page.evaluate(() => {
    const out: { text: string; width: number; height: number }[] = [];
    document.querySelectorAll('[role="button"]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
        out.push({ text: (el.textContent || '').trim().slice(0, 30), width: Math.round(r.width), height: Math.round(r.height) });
      }
    });
    return out;
  });

  expect(undersized, `${undersized.length} control(s) under 44px: ${JSON.stringify(undersized)}`).toEqual([]);
});
