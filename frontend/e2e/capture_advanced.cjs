// Before/after screenshots of the Advanced rail screens, light + dark, 1280px.
// Usage: node e2e/capture_advanced.cjs <before|after> [baseUrl] [case]
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const [, , phase = 'after', base = 'http://localhost:5182', caseId = 'CASE-2026-002'] = process.argv;
const VIEWS = ['home', 'workstation', 'benchmarks', 'privacy'];
const outDir = path.resolve(__dirname, '../../docs/screenshots/advanced');

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    await ctx.addInitScript((t) => {
      localStorage.setItem('tarka_v6_theme', t);
      localStorage.setItem('tarka_labs', '1'); // show the Labs-only screens too
    }, theme);
    const page = await ctx.newPage();
    for (const v of VIEWS) {
      await page.goto(`${base}/?view=${v}&case=${caseId}`);
      await page.waitForTimeout(3500);
      const file = path.join(outDir, `${phase}-${v}-${theme}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log(file);
    }
    await ctx.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
