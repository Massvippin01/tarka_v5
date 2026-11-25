// Usage: node e2e/capture_new_case.cjs <prefix>  — screenshots the New case dialog in light and dark.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const prefix = process.argv[2] || 'after';
const out = path.resolve(__dirname, '../../docs/ui/new-case');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:5271/?case=CASE-2026-001&view=workspace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => { localStorage.setItem('tarka_v6_theme', t); document.documentElement.setAttribute('data-v6-theme', t); }, theme);
    await page.getByRole('button', { name: /New Case/i }).first().click();
    await page.waitForSelector('[data-testid="register-new-case-modal"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, `${prefix}-${theme}.png`) });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  await browser.close();
})();
