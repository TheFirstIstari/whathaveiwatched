import { test, expect } from '@playwright/test';

test('debug join page text', async ({ page }) => {
  await page.goto('https://watched.tweak.wiki/board/1/join?invite=test123');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  const h1 = await page.locator('h1').textContent();
  const h2 = await page.locator('h2').textContent();
  console.log('h1:', h1);
  console.log('h2:', h2);
  const body = await page.locator('body').textContent();
  console.log('Contains "Join":', body?.includes('Join'));
  console.log('Contains "Join board":', body?.includes('Join board'));
  expect(true).toBeTruthy();
});
