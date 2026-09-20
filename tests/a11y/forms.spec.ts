import { test, expect } from '@playwright/test';

/**
 * Regression coverage for the shared aria-live announcer (src/components/dialog.tsx
 * `announce()`) and Login's error wiring. Originally Login's wrong-credential
 * error rendered visually but was never announced to assistive technology —
 * zero aria-live regions anywhere in the app, no aria-describedby/aria-invalid
 * on the inputs.
 */
test('Login error is announced to assistive technology', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('username').fill('wronguser');
  await page.getByPlaceholder('••••••').fill('wrongpass');
  await page.getByText('Masuk', { exact: true }).click();

  await expect(page.locator('#login-error')).toBeVisible();
  await page.waitForTimeout(150); // the announcer clears then re-sets the message on a short delay

  const liveText = await page.locator('[aria-live]').first().textContent();
  expect(liveText, 'the aria-live region should contain the error text').toContain('salah');

  const username = page.getByPlaceholder('username');
  const describedbyId = await username.getAttribute('aria-describedby');
  const invalid = await username.getAttribute('aria-invalid');
  expect(describedbyId || invalid, 'the field should be programmatically marked invalid or described by the error').toBeTruthy();
  if (describedbyId) {
    expect(await page.locator(`#${describedbyId}`).count(), 'the referenced describedby element should exist').toBeGreaterThan(0);
  }
});
