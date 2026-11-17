const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const bell = page.locator('[data-testid="notification-bell-button"]');
  await bell.click();
  await page.waitForSelector('[data-testid="notification-popover"]', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.resolve('docs/progress/f7/f7_02_notification_popover_1440.png') });
  await browser.close();
  console.log('Captured popover successfully');
})();

