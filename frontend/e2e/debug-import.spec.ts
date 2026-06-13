import { test, expect } from '@playwright/test';

test('debug movie import flow', async ({ page }) => {
  const consoleErrors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  await page.addInitScript(() => {
    localStorage.setItem('ihw_display_name', 'TestUser');
    localStorage.setItem('ihw_identity_token', 'test-token');
    localStorage.setItem('ihw_identity_hex', 'abc123');
  });

  await page.goto('http://localhost:3000/board/1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const banner = await page.locator('text=Connecting').isVisible();
  console.log('Connecting banner visible:', banner);

  const searchInput = page.locator('input[placeholder*="Add movie"]');
  const searchVisible = await searchInput.isVisible();
  console.log('Search input visible:', searchVisible);

  if (searchVisible) {
    await searchInput.click();
    await searchInput.fill('star wars');
    await page.waitForTimeout(1500);

    const results = await page.locator('ul li').count();
    console.log('Search results:', results);

    if (results > 0) {
      await page.locator('ul li').first().click();
      await page.waitForTimeout(3000);
    }
  }

  console.log('=== Console Errors ===');
  consoleErrors.forEach(e => console.log('ERR:', e));
  console.log('Total errors:', consoleErrors.length);
});
