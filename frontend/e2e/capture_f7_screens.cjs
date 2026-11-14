const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const outDir = path.resolve(__dirname, '../../docs/progress/f7');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Navigating to Case 001 Intake screen...');
  await page.goto('http://localhost:5173/?case=CASE-2026-001&view=intake', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // 1. Notification Center Popover
  console.log('Opening Notification Center Popover...');
  const bellButton = page.locator('[data-testid="notification-bell-button"]');
  if (await bellButton.count() > 0) {
    await bellButton.click();
    await page.waitForSelector('[data-testid="notification-popover"]', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
    console.log('Capturing f7_02_notification_popover_1440.png...');
    await page.screenshot({ path: path.join(outDir, 'f7_02_notification_popover_1440.png') });
    // Close it
    await bellButton.click();
    await page.waitForTimeout(500);
  }

  // 2. Case Activity & Audit Trail Drawer
  console.log('Opening Case Activity Drawer...');
  const activityBtn = page.locator('[data-testid="header-activity-button"]');
  if (await activityBtn.count() > 0) {
    await activityBtn.click();
    await page.waitForSelector('[data-testid="audit-trail-drawer"]', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(2500);
    console.log('Capturing f7_01_activity_feed_drawer_1440.png...');
    await page.screenshot({ path: path.join(outDir, 'f7_01_activity_feed_drawer_1440.png') });
  }

  // 3. Station Command Hub Global Activity Feed
  console.log('Navigating to Dashboard Command Hub...');
  await page.goto('http://localhost:5173/?view=workspace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const globalActivityBtn = page.locator('[data-testid="workspace-activity-feed-button"]');
  if (await globalActivityBtn.count() > 0) {
    await globalActivityBtn.click();
    await page.waitForSelector('[data-testid="audit-trail-drawer"]', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(2500);
    console.log('Capturing f7_03_dashboard_activity_feed_1440.png...');
    await page.screenshot({ path: path.join(outDir, 'f7_03_dashboard_activity_feed_1440.png') });
  }

  await browser.close();
  console.log('F7 Screenshots captured successfully.');
})();
