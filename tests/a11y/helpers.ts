import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export type DemoRole =
  | 'Super Admin'
  | 'Client Monitoring'
  | 'Ops Manager'
  | 'Team Lead'
  | 'Field Agent';

/**
 * Logs in via the demo-account quick-fill buttons on the Login screen — avoids
 * hardcoding passwords in the test suite. Assumes we start logged out.
 */
export async function loginAsDemo(page: Page, roleLabel: DemoRole) {
  await page.goto('/');
  const roleButton = page.getByText(new RegExp(`^${roleLabel} ·`));
  if (!(await roleButton.isVisible().catch(() => false))) {
    await page.getByText('Lingkungan Demo', { exact: false }).click();
    await expect(roleButton).toBeVisible({ timeout: 10000 });
  }
  await roleButton.click();
  await page.getByText('Masuk', { exact: true }).click();
  await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible({ timeout: 15000 });
}

export async function logout(page: Page) {
  await page.getByText('Profil', { exact: true }).click();
  await page.getByText('Keluar (Logout)', { exact: true }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByText('Masuk', { exact: true })).toBeVisible({ timeout: 10000 });
}

/**
 * Runs axe restricted to WCAG A/AA rules (excludes 'best-practice'-only rules
 * like `region`, which are real but not a hard compliance bar) and asserts
 * zero critical/serious violations. Returns the full result for callers that
 * want to inspect moderate/minor findings too.
 */
export async function expectNoSeriousA11yViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  if (blocking.length) {
    const detail = blocking
      .map((v) => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
      .join('\n');
    throw new Error(`${label}: ${blocking.length} critical/serious WCAG violation(s):\n${detail}`);
  }
  return results;
}

/** Relative luminance / contrast ratio, per WCAG's own formula. */
export function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const lum = ([r, g, b]: [number, number, number]) => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  const L1 = lum(fg) + 0.05;
  const L2 = lum(bg) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}
