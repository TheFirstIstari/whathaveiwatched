import { test, expect } from '@playwright/test';
import { seedAuth } from './helpers';

test.describe('Auth guards', () => {
  test('dashboard redirects to /signin when no name is set', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/signin$/);
  });

  test('/boards/new redirects to /signin when no name is set', async ({ page }) => {
    await page.goto('/boards/new');
    await expect(page).toHaveURL(/\/signin$/);
  });
});

test.describe('Dashboard (authed)', () => {
  test('renders header, stats and an empty/board state', async ({ page }) => {
    await seedAuth(page, { name: 'Nav Tester' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Your boards' })).toBeVisible();
    await expect(page.getByText('Switch user')).toBeVisible();
    // Either the empty state CTA or a board grid is present.
    const created = page.getByRole('button', { name: 'Create board' });
    const newBoard = page.getByRole('button', { name: 'New board' });
    await expect(created.or(newBoard).first()).toBeVisible();
  });

  test('"New board" navigates to the create form', async ({ page }) => {
    await seedAuth(page, { name: 'Nav Tester' });
    await page.goto('/');
    await page.getByRole('button', { name: 'New board' }).click();
    await expect(page).toHaveURL(/\/boards\/new$/);
    await expect(page.getByRole('heading', { name: 'Create board' })).toBeVisible();
  });
});

test.describe('Create-board form validation', () => {
  test('blocks empty submit with a required error (no write)', async ({ page }) => {
    await seedAuth(page, { name: 'Nav Tester' });
    await page.goto('/boards/new');
    await page.getByRole('button', { name: 'Create board' }).click();
    await expect(page.getByText('Board name is required')).toBeVisible();
    await expect(page).toHaveURL(/\/boards\/new$/);
  });

  test('Cancel returns to the previous page', async ({ page }) => {
    await seedAuth(page, { name: 'Nav Tester' });
    await page.goto('/');
    await page.getByRole('button', { name: 'New board' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Theme', () => {
  test('toggle flips html.dark and persists across reload', async ({ page }) => {
    await page.goto('/signin');
    const html = page.locator('html');
    const isDark = () => html.evaluate(el => el.classList.contains('dark'));

    const before = await isDark();
    await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).click();
    await expect.poll(isDark).toBe(!before);

    await page.reload();
    await expect.poll(isDark).toBe(!before); // survived reload via localStorage
  });
});

test.describe('Not found', () => {
  test('unknown route shows 404', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Go home/ })).toBeVisible();
  });
});
