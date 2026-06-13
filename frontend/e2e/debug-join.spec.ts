import { test, expect } from '@playwright/test';

test('debug join page', async ({ page }) => {
  await page.goto('https://watched.tweak.wiki/board/1/join?invite=test123');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  const url = page.url();
  console.log('Final URL:', url);
  const body = await page.locator('body').textContent();
  console.log('Body text (first 500):', body?.slice(0, 500));
  expect(true).toBeTruthy(); // just log
});
