import { test, expect } from '@playwright/test';

test.describe('Sign-in', () => {
  test('renders brand, form, and trust signals', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.getByRole('heading', { name: 'IHaveWatched' })).toBeVisible();
    await expect(page.getByLabel('Your name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible();
    await expect(page.getByText('No account')).toBeVisible();
  });

  test('shows validation error on empty submit', async ({ page }) => {
    await page.goto('/signin');
    await page.getByRole('button', { name: 'Get started' }).click();
    await expect(page.getByText('Enter your name to continue')).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test('setting a name navigates to the dashboard', async ({ page }) => {
    await page.goto('/signin');
    await page.getByLabel('Your name').fill('Playwright Alice');
    await page.getByRole('button', { name: 'Get started' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Your boards' })).toBeVisible();
  });
});
