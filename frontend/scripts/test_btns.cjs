const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/?view=workspace&case=CASE-2026-001');
  await page.waitForTimeout(2000);
  const btns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
  });
  console.log('ALL BUTTONS:', JSON.stringify(btns));
  await browser.close();
})();

