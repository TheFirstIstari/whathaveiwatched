import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

/**
 * Full create -> verify -> delete lifecycle against the REAL SpacetimeDB
 * instance. This WRITES to the live database, so it is opt-in:
 *
 *   E2E_WRITE=1 npx playwright test board-lifecycle
 *
 * It cleans up after itself by deleting the board it creates. Run on the
 * `desktop` project only to avoid duplicate writes from the mobile project.
 */
const WRITE_ENABLED = process.env.E2E_WRITE === '1';

test.describe('Board lifecycle (real SpacetimeDB)', () => {
  test.skip(!WRITE_ENABLED, 'set E2E_WRITE=1 to run write tests against the live DB');

  test('create a board, see it, then delete it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'write lifecycle runs on desktop only');
    test.setTimeout(90_000);

    const title = `E2E ${Date.now()}`;
    await seedAuth(page, { name: 'E2E Owner' });

    // Land on the dashboard first so the SpacetimeDB connection establishes and
    // `registerOwner` runs — otherwise createBoard fails with NOT_AUTHENTICATED.
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Your boards' })).toBeVisible();
    // Connection must be live (banner gone) and an identity issued by the SDK.
    await expect(page.getByText('Connecting to server…')).toHaveCount(0, { timeout: 30_000 });
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('ihw_identity_hex')), { timeout: 30_000 })
      .not.toBeNull();
    // Give register_owner a moment to commit the account row.
    await page.waitForTimeout(2_000);

    // Create — retry to absorb the register_owner -> create_board commit race
    // (the page itself advises "refresh and try again" on NOT_AUTHENTICATED).
    await expect(async () => {
      await page.goto('/boards/new');
      await page.getByLabel('Board name').fill(title);
      await page.getByRole('button', { name: 'Create board' }).click();
      await expect(page).toHaveURL(/\/$/, { timeout: 7_000 });
    }).toPass({ timeout: 45_000 });
    const card = page.getByRole('button', { name: new RegExp(title) });
    await expect(card).toBeVisible({ timeout: 30_000 });

    // Open it -> board view
    await card.click();
    await expect(page).toHaveURL(/\/board\/\d+$/);

    // Go to settings (owner-only gear) and delete
    await page.getByTitle('Board settings').click();
    await expect(page).toHaveURL(/\/board\/\d+\/settings$/);
    await page.getByRole('button', { name: 'Delete board' }).click();
    await page.getByRole('button', { name: 'Yes, delete' }).click();

    // Back on dashboard and the board is gone
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: new RegExp(title) })).toHaveCount(0, { timeout: 30_000 });
  });
});
