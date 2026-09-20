import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers';

/**
 * Regression coverage for the shared dialog component (src/components/dialog.tsx).
 *
 * Correction from the original audit: react-native-web's <Modal> already ships
 * a working focus trap (ModalFocusTrap) and sets role="dialog", but only once
 * its 250ms fade-in animation completes (role/trap activate on the `onShow`
 * callback, which fires on the animation's `animationend` event). Both tests
 * below wait for that before asserting — earlier versions of this suite
 * asserted immediately and got false failures purely from testing faster than
 * a human ever could. The one real gap found was a missing accessible name,
 * fixed via `aria-label` on the Modal.
 */

const FADE_ANIMATION_MS = 400; // RNW's Modal animation is 250ms; padded for CI safety

test('Logout dialog has a dialog role and an accessible name', async ({ page }) => {
  await loginAsDemo(page, 'Field Agent');
  await page.getByText('Profil', { exact: true }).click();
  await page.getByText('Keluar (Logout)', { exact: true }).click();
  await expect(page.getByText('Yakin ingin keluar?')).toBeVisible();
  await page.waitForTimeout(FADE_ANIMATION_MS);

  const info = await page.evaluate(() => {
    const el = document.querySelector('[role="dialog"], [role="alertdialog"]');
    return el ? { ariaLabel: el.getAttribute('aria-label'), ariaLabelledby: el.getAttribute('aria-labelledby') } : null;
  });
  expect(info, 'expected an element with role="dialog" to exist once the open animation completes').not.toBeNull();
  expect(info!.ariaLabel || info!.ariaLabelledby, 'the dialog should have an accessible name').toBeTruthy();
});

test('Logout dialog traps keyboard focus', async ({ page }) => {
  await loginAsDemo(page, 'Field Agent');
  await page.getByText('Profil', { exact: true }).click();
  await page.getByText('Keluar (Logout)', { exact: true }).click();
  await expect(page.getByText('Yakin ingin keluar?')).toBeVisible();
  await page.waitForTimeout(FADE_ANIMATION_MS);

  // Tab several times to prove the trap loops rather than just happening to
  // land inside the dialog once.
  const seen: string[] = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    seen.push((await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '')) || '');
  }
  expect(seen.every((t) => t === 'Batal' || t === 'Logout'), `focus should stay within Batal/Logout, saw: ${seen.join(', ')}`).toBe(true);
});
