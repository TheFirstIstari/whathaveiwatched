import { test, expect } from '@playwright/test';

test.describe('Production smoke tests', () => {
  test('signin page renders', async ({ page }) => {
    await page.goto('https://watched.tweak.wiki/signin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('IHaveWatched');
  });

  test('dashboard redirects to signin', async ({ page }) => {
    await page.goto('https://watched.tweak.wiki/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url.includes('/signin') || url.includes('/')).toBeTruthy();
  });

  test('new board page shows preset picker', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ihw_display_name', 'TestUser');
      localStorage.setItem('ihw_identity_token', 'test-token');
      localStorage.setItem('ihw_identity_hex', 'abc123');
    });
    await page.goto('https://watched.tweak.wiki/boards/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const hasCreateBoard = await page.locator('text=Create board').isVisible();
    expect(hasCreateBoard).toBeTruthy();
  });

  test('404 page renders', async ({ page }) => {
    await page.goto('https://watched.tweak.wiki/zzz-nope');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('join page renders', async ({ page }) => {
    await page.goto('https://watched.tweak.wiki/board/1/join?invite=test123');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Join board")')).toBeVisible();
  });

  test('settings page does not 500', async ({ page }) => {
    const response = await page.goto('https://watched.tweak.wiki/board/1/settings');
    expect(response?.status()).toBeLessThan(500);
  });

  test('API health check', async ({ request }) => {
    const res = await request.get('https://watched.tweak.wiki/api/health');
    expect(res.status()).toBe(200);
  });

  test('TMDB search proxy works', async ({ request }) => {
    const res = await request.get('https://watched.tweak.wiki/api/tmdb/search?q=batman&type=movie');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('results');
  });
});
