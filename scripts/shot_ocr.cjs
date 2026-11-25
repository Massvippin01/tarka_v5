// Screenshot the OCR view for both receipts. Usage: node scripts/shot_ocr.cjs [theme]  (needs backend 8071 + frontend 5241)
const { chromium } = require('../frontend/node_modules/playwright');
const theme = process.argv[2] || 'light';
(async () => {
  const b = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:5241/?view=evidence&case=CASE-2026-886A726C');
  await p.evaluate((t) => { try { localStorage.setItem('theme', t); } catch (e) {} document.documentElement.dataset.theme = t; }, theme);
  for (const [name, out] of [['upi_receipt_genuine', 'genuine'], ['upi_receipt_tampered', 'tampered']]) {
    await p.locator('tr', { hasText: name }).getByRole('button', { name: /OCR view/ }).click();
    await p.waitForSelector('[data-testid=ocr-recon]');
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `docs/ui/ocr/ocr_${out}_${theme}.png` });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
  }
  await b.close();
})();
