import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers';

/**
 * Regression coverage: inactive tab screens used to stay keyboard-focusable
 * (position:absolute; z-index:-1; aria-hidden="true" from
 * @react-navigation/elements, without a matching `inert`), so Tab leaked into
 * hidden content from other tabs. Fixed in App.tsx via a MutationObserver
 * that keeps `inert` in sync with aria-hidden.
 */
test('Tab order never reaches a focusable element inside an aria-hidden ancestor', async ({ page }) => {
  await loginAsDemo(page, 'Field Agent');
  await page.getByText('Profil', { exact: true }).click();
  // Deliberately don't reset focus first — leaving it on the just-clicked
  // "Profil" nav item mirrors how a real keyboard user actually arrives here.

  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const hiddenAncestor = await page.evaluate(() => {
      let el = document.activeElement as HTMLElement | null;
      while (el) {
        if (el.getAttribute('aria-hidden') === 'true') return true;
        el = el.parentElement;
      }
      return false;
    });
    expect(hiddenAncestor, `Tab press #${i + 1} landed inside an aria-hidden ancestor`).toBe(false);
  }
});
