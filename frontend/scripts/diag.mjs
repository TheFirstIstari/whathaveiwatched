import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

page.on('console', m => console.log(`[console.${m.type()}]`, m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));

await page.addInitScript(() => { try { localStorage.setItem('ihw_display_name', 'Diag'); } catch {} });

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
const hex = await page.evaluate(() => localStorage.getItem('ihw_identity_hex'));
const tok = await page.evaluate(() => !!localStorage.getItem('ihw_identity_token'));
console.log('IDENTITY_HEX=', hex, 'HAS_TOKEN=', tok);

await page.goto(BASE + '/boards/new', { waitUntil: 'networkidle' });
await page.getByLabel('Board name').fill('Diag Board ' + Date.now());
await page.getByRole('button', { name: 'Create board' }).click();
await page.waitForTimeout(5000);
console.log('URL_AFTER_CREATE=', page.url());

await browser.close();
console.log('DONE');
