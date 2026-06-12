import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:3000';
const OUT = '/tmp/ihw-shots';
mkdirSync(OUT, { recursive: true });

const routes = [
  { name: 'signin', path: '/signin', auth: false },
  { name: 'new', path: '/boards/new', auth: true },
  { name: 'dashboard', path: '/', auth: true },
  { name: 'join', path: '/board/1/join?invite=abc', auth: false },
  { name: 'settings', path: '/board/1/settings', auth: true },
  { name: 'notfound', path: '/zzz-nope', auth: false },
];

const viewports = [
  { tag: 'desktop', width: 1440, height: 900 },
  { tag: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch();

for (const theme of ['light', 'dark']) {
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    // seed localStorage on first nav
    await page.addInitScript(({ theme }) => {
      try {
        localStorage.setItem('ihw_theme', theme);
        localStorage.setItem('ihw_display_name', 'Alice');
      } catch {}
    }, { theme });

    for (const r of routes) {
      try {
        await page.goto(BASE + r.path, { waitUntil: 'networkidle', timeout: 15000 });
      } catch {
        try { await page.goto(BASE + r.path, { waitUntil: 'domcontentloaded', timeout: 8000 }); } catch {}
      }
      await page.waitForTimeout(1200);
      const file = `${OUT}/${r.name}__${theme}__${vp.tag}.png`;
      await page.screenshot({ path: file, fullPage: true }).catch(() => {});
      console.log(file);
    }
    await ctx.close();
  }
}

await browser.close();
console.log('DONE');
