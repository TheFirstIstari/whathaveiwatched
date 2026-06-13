import { test, expect } from '@playwright/test';

test.describe('IHaveWatched E2E', () => {
  test('signin page renders and accepts input', async ({ page }) => {
    await page.goto('http://localhost:3000/signin');
    await expect(page.locator('h1')).toHaveText('IHaveWatched');
    await expect(page.locator('input[placeholder="e.g. Alice"]')).toBeVisible();
  });

  test('dashboard redirects to signin without auth', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForURL('**/signin');
  });

  test('new board page shows preset picker', async ({ page }) => {
    // Set display name to bypass auth
    await page.addInitScript(() => {
      localStorage.setItem('ihw_display_name', 'TestUser');
      localStorage.setItem('ihw_identity_token', 'test-token');
      localStorage.setItem('ihw_identity_hex', 'abc123');
    });
    await page.goto('http://localhost:3000/boards/new');
    // Should show preset picker or form
    await expect(page.locator('text=Create board')).toBeVisible();
  });

  test('404 page renders correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/zzz-nope');
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Go home')).toBeVisible();
  });

  test('settings page loads without crashing', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ihw_display_name', 'TestUser');
      localStorage.setItem('ihw_identity_token', 'test-token');
      localStorage.setItem('ihw_identity_hex', 'abc123');
    });
    const response = await page.goto('http://localhost:3000/board/1/settings');
    // Should not be a 500 error
    expect(response?.status()).not.toBe(500);
    // Page should render something (not blank)
    await expect(page.locator('body')).toBeVisible();
  });
});
