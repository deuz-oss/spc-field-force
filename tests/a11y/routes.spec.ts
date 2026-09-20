import { test } from '@playwright/test';
import { expectNoSeriousA11yViolations, loginAsDemo } from './helpers';

/**
 * One test per major route/role, per the accessibility audit's regression
 * recommendation #1. Scoped to WCAG A/AA rules only — `region`
 * (best-practice landmark coverage) is tracked separately, not a hard gate.
 *
 * These are expected to currently FAIL on several routes (color-contrast on
 * `C.faint`/`Badge`, missing `label` on the Users screen's Switch toggles) —
 * that's intentional. This suite exists to catch regressions and track
 * progress against the known findings, not to start green.
 */

test.describe('Field Agent routes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'Field Agent');
  });

  test('Dashboard', async ({ page }) => {
    await expectNoSeriousA11yViolations(page, 'Dashboard (Field Agent)');
  });

  test('Merchant list', async ({ page }) => {
    await page.getByText('Merchant', { exact: true }).click();
    await expectNoSeriousA11yViolations(page, 'Merchant List (Field Agent)');
  });

  test('Merchant detail', async ({ page }) => {
    await page.getByText('Merchant', { exact: true }).click();
    const firstRow = page.getByText(/^Jl\./).first();
    await firstRow.waitFor({ state: 'visible' });
    await firstRow.click({ force: true }); // a transient absolutely-positioned overlay briefly intercepts the first click attempt after navigation
    await expectNoSeriousA11yViolations(page, 'Merchant Detail (Field Agent)');
  });

  test('Kunjungan (visits) list', async ({ page }) => {
    await page.getByText('Kunjungan', { exact: true }).first().click();
    await expectNoSeriousA11yViolations(page, 'Kunjungan (Field Agent)');
  });

  test('Absensi (attendance) list', async ({ page }) => {
    await page.getByText('Absensi', { exact: true }).first().click();
    await expectNoSeriousA11yViolations(page, 'Absensi (Field Agent)');
  });

  test('Profil', async ({ page }) => {
    await page.getByText('Profil', { exact: true }).click();
    await expectNoSeriousA11yViolations(page, 'Profil (Field Agent)');
  });
});

test.describe('Super Admin routes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'Super Admin');
  });

  test('Dashboard', async ({ page }) => {
    await expectNoSeriousA11yViolations(page, 'Dashboard (Super Admin)');
  });

  test('Merchant list', async ({ page }) => {
    await page.getByText('Merchant', { exact: true }).click();
    await expectNoSeriousA11yViolations(page, 'Merchant List (Super Admin)');
  });

  test('Laporan (reports)', async ({ page }) => {
    await page.getByText('Laporan', { exact: true }).click();
    await expectNoSeriousA11yViolations(page, 'Laporan (Super Admin)');
  });

  test('Peta Live (live map)', async ({ page }) => {
    await page.getByText('Peta Live', { exact: true }).click();
    await expectNoSeriousA11yViolations(page, 'Peta Live (Super Admin)');
  });

  test('Pengguna (users)', async ({ page }) => {
    await page.getByText('Pengguna', { exact: true }).click();
    await expectNoSeriousA11yViolations(page, 'Pengguna (Super Admin)');
  });

  test('Profil', async ({ page }) => {
    await page.getByText('Profil', { exact: true }).click();
    await expectNoSeriousA11yViolations(page, 'Profil (Super Admin)');
  });
});

test('Login screen (logged out)', async ({ page }) => {
  await page.goto('/');
  await expectNoSeriousA11yViolations(page, 'Login');
});
