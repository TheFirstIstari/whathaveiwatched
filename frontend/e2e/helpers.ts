import type { Page } from '@playwright/test';

/**
 * Seed localStorage so auth-gated pages (dashboard, /boards/new) don't bounce
 * to /signin. Must be called BEFORE page.goto so it runs before app scripts.
 * The real SpacetimeDB identity token is issued by the SDK on connect; we only
 * need a display name present for the client-side guard.
 */
export async function seedAuth(page: Page, opts: { name?: string; theme?: 'light' | 'dark' } = {}) {
  const { name = 'E2E Tester', theme } = opts;
  await page.addInitScript(
    ({ name, theme }) => {
      try {
        localStorage.setItem('ihw_display_name', name);
        if (theme) localStorage.setItem('ihw_theme', theme);
      } catch {}
    },
    { name, theme },
  );
}

export async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    try { localStorage.setItem('ihw_theme', t); } catch {}
  }, theme);
}
